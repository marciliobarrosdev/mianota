package main

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	_ "github.com/lib/pq"
	qrcode "github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

type SessionState string

const (
	StateOpen         SessionState = "open"
	StateConnecting   SessionState = "connecting"
	StateDisconnected SessionState = "close"
	StateUnpaired     SessionState = "unpaired"
)

type InstanceSession struct {
	InstanceName string
	Client       *whatsmeow.Client
	DeviceStore  *store.Device
	State        SessionState
	Phone        string
	QRBase64     string
	PairingCode  string
	RawQRCode    string
	QRChannel    <-chan whatsmeow.QRChannelItem
	WebhookURL   string
	WebhookToken string
	mu           sync.RWMutex
	cancelQR     context.CancelFunc
}

type SessionManager struct {
	container  *sqlstore.Container
	config     Config
	mediaCache *MediaCache
	instances  map[string]*InstanceSession
	mu         sync.RWMutex
	log        waLog.Logger
}

func NewSessionManager(cfg Config, mediaCache *MediaCache) (*SessionManager, error) {
	logger := waLog.Stdout("SessionManager", cfg.LogLevel, true)
	ctx := context.Background()

	var container *sqlstore.Container
	var err error

	if cfg.DatabaseURL != "" {
		container, err = sqlstore.New(ctx, "postgres", cfg.DatabaseURL, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize postgres sqlstore: %w", err)
		}
		if err = container.Upgrade(ctx); err != nil {
			container.Close()
			return nil, fmt.Errorf("failed to upgrade sqlstore schema: %w", err)
		}
	} else {
		logger.Warnf("No DATABASE_URL configured. Session persistence disabled or will use mock.")
	}

	sm := &SessionManager{
		container:  container,
		config:     cfg,
		mediaCache: mediaCache,
		instances:  make(map[string]*InstanceSession),
		log:        logger,
	}

	// Auto-restore existing sessions if database is available
	if container != nil {
		if err := sm.restoreExistingSessions(ctx); err != nil {
			logger.Warnf("Error restoring existing sessions: %v", err)
		}
	}

	return sm, nil
}

func (sm *SessionManager) Close() {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	for _, inst := range sm.instances {
		inst.mu.Lock()
		if inst.Client != nil && inst.Client.IsConnected() {
			inst.Client.Disconnect()
		}
		inst.mu.Unlock()
	}
	if sm.container != nil {
		sm.container.Close()
	}
}

func (sm *SessionManager) restoreExistingSessions(ctx context.Context) error {
	devices, err := sm.container.GetAllDevices(ctx)
	if err != nil {
		return err
	}
	for _, dev := range devices {
		if dev.ID == nil {
			continue
		}
		instName := "central"
		phone := dev.ID.User

		client := whatsmeow.NewClient(dev, waLog.Stdout("WhatsMeow-"+phone, sm.config.LogLevel, true))
		inst := &InstanceSession{
			InstanceName: instName,
			Client:       client,
			DeviceStore:  dev,
			State:        StateConnecting,
			Phone:        phone,
			WebhookURL:   sm.config.WebhookURL,
			WebhookToken: sm.config.WebhookToken,
		}

		sm.instances[instName] = inst
		client.AddEventHandler(sm.makeEventHandler(inst))

		// Connect in background to resume session
		go func(i *InstanceSession) {
			if err := i.Client.Connect(); err != nil {
				sm.log.Errorf("Failed to auto-reconnect session %s: %v", i.Phone, err)
				i.mu.Lock()
				i.State = StateDisconnected
				i.mu.Unlock()
			} else {
				sm.log.Infof("Auto-reconnected WhatsApp session for %s", i.Phone)
			}
		}(inst)
	}
	return nil
}

func (sm *SessionManager) GetOrCreateInstance(name string) (*InstanceSession, error) {
	if name == "" {
		name = "central"
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()

	if inst, exists := sm.instances[name]; exists {
		return inst, nil
	}

	// If we already have an existing instance with a paired/connecting client,
	// alias this instance name to the existing session to prevent duplicate WebSocket clients.
	for _, existing := range sm.instances {
		if existing != nil && existing.Client != nil {
			sm.instances[name] = existing
			return existing, nil
		}
	}

	var dev *store.Device

	if sm.container != nil {
		ctx := context.Background()
		// Try to find first unassigned or existing device
		devices, err := sm.container.GetAllDevices(ctx)
		if err == nil && len(devices) > 0 {
			dev = devices[0]
		}
		if dev == nil {
			dev = sm.container.NewDevice()
		}
	} else {
		return nil, errors.New("database container not initialized: DATABASE_URL is required")
	}

	client := whatsmeow.NewClient(dev, waLog.Stdout("WhatsMeow-"+name, sm.config.LogLevel, true))
	inst := &InstanceSession{
		InstanceName: name,
		Client:       client,
		DeviceStore:  dev,
		State:        StateDisconnected,
		WebhookURL:   sm.config.WebhookURL,
		WebhookToken: sm.config.WebhookToken,
	}

	if dev != nil && dev.ID != nil {
		inst.Phone = dev.ID.User
	}

	client.AddEventHandler(sm.makeEventHandler(inst))
	sm.instances[name] = inst
	return inst, nil
}

func (sm *SessionManager) ConnectInstance(inst *InstanceSession, pairingPhone string) (*InstanceSession, error) {
	inst.mu.Lock()

	if inst.Client == nil {
		inst.mu.Unlock()
		return nil, errors.New("client not initialized")
	}

	if inst.Client.IsConnected() && inst.Client.Store.ID != nil {
		inst.State = StateOpen
		inst.Phone = inst.Client.Store.ID.User
		inst.mu.Unlock()
		return inst, nil
	}

	inst.State = StateConnecting

	// If device already registered, just connect
	if inst.Client.Store.ID != nil {
		if !inst.Client.IsConnected() {
			if err := inst.Client.Connect(); err != nil {
				inst.State = StateDisconnected
				inst.mu.Unlock()
				return inst, fmt.Errorf("failed to connect existing session: %w", err)
			}
		}
		inst.State = StateOpen
		inst.Phone = inst.Client.Store.ID.User
		inst.mu.Unlock()
		return inst, nil
	}

	// If already has an active QR loop, release lock and wait for QR
	if inst.QRChannel != nil && inst.Client.IsConnected() {
		inst.mu.Unlock()
		for i := 0; i < 30; i++ {
			inst.mu.RLock()
			hasQR := inst.QRBase64 != "" || inst.State == StateOpen
			inst.mu.RUnlock()
			if hasQR {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		return inst, nil
	}

	// Prepare QR Channel before calling Connect()
	ctx, cancel := context.WithCancel(context.Background())
	inst.cancelQR = cancel

	qrChan, err := inst.Client.GetQRChannel(ctx)
	if err != nil {
		inst.State = StateDisconnected
		cancel()
		inst.mu.Unlock()
		return inst, fmt.Errorf("failed to get qr channel: %w", err)
	}

	inst.QRChannel = qrChan

	if err := inst.Client.Connect(); err != nil {
		inst.State = StateDisconnected
		cancel()
		inst.mu.Unlock()
		return inst, fmt.Errorf("failed to connect websocket: %w", err)
	}

	// Background worker reading QR codes
	go sm.listenQR(inst, ctx)
	inst.mu.Unlock()

	// Wait up to 5 seconds for the first QR code to be ready without holding the lock
	for i := 0; i < 50; i++ {
		time.Sleep(100 * time.Millisecond)
		inst.mu.RLock()
		hasQR := inst.QRBase64 != "" || inst.State == StateOpen
		inst.mu.RUnlock()
		if hasQR {
			break
		}
	}

	// If phone number provided for pairing code
	if pairingPhone != "" {
		code, err := inst.Client.PairPhone(context.Background(), pairingPhone, true, whatsmeow.PairClientChrome, "Chrome (Windows)")
		if err == nil {
			inst.mu.Lock()
			inst.PairingCode = code
			inst.mu.Unlock()
		} else {
			sm.log.Warnf("Failed to generate pairing code for %s: %v", pairingPhone, err)
		}
	}

	return inst, nil
}

func (sm *SessionManager) listenQR(inst *InstanceSession, ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case item, ok := <-inst.QRChannel:
			if !ok {
				return
			}
			inst.mu.Lock()
			if item.Event == "code" {
				inst.RawQRCode = item.Code
				pngBytes, err := qrcode.Encode(item.Code, qrcode.Medium, 256)
				if err == nil {
					inst.QRBase64 = "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBytes)
				}
				inst.State = StateConnecting
			} else if item.Event == "success" {
				inst.State = StateOpen
				inst.QRBase64 = ""
				inst.RawQRCode = ""
				inst.PairingCode = ""
				if inst.Client.Store.ID != nil {
					inst.Phone = inst.Client.Store.ID.User
				}
				inst.mu.Unlock()
				return
			} else if item.Event == "timeout" {
				inst.State = StateDisconnected
				inst.mu.Unlock()
				return
			}
			inst.mu.Unlock()
		}
	}
}

func (sm *SessionManager) LogoutInstance(name string) error {
	inst, err := sm.GetOrCreateInstance(name)
	if err != nil {
		return err
	}

	inst.mu.Lock()
	defer inst.mu.Unlock()

	if inst.cancelQR != nil {
		inst.cancelQR()
	}

	if inst.Client != nil {
		if inst.Client.IsConnected() {
			_ = inst.Client.Logout(context.Background())
			inst.Client.Disconnect()
		}
	}

	if sm.container != nil && inst.DeviceStore != nil {
		_ = sm.container.DeleteDevice(context.Background(), inst.DeviceStore)
		inst.DeviceStore = sm.container.NewDevice()
		inst.Client = whatsmeow.NewClient(inst.DeviceStore, waLog.Stdout("WhatsMeow-"+name, sm.config.LogLevel, true))
		inst.Client.AddEventHandler(sm.makeEventHandler(inst))
	}

	inst.State = StateDisconnected
	inst.Phone = ""
	inst.QRBase64 = ""
	inst.RawQRCode = ""
	inst.PairingCode = ""

	return nil
}

func (sm *SessionManager) SendText(instName string, target string, text string, quotedMsgID string) (string, error) {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return "", err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return "", errors.New("whatsapp is not connected")
	}

	targetJID, err := inst.resolveTargetJID(target)
	if err != nil {
		return "", err
	}

	msg := &waE2E.Message{}
	if quotedMsgID != "" {
		msg.ExtendedTextMessage = &waE2E.ExtendedTextMessage{
			Text: proto.String(text),
			ContextInfo: &waE2E.ContextInfo{
				StanzaID: proto.String(quotedMsgID),
			},
		}
	} else {
		msg.Conversation = proto.String(text)
	}

	resp, err := client.SendMessage(context.Background(), targetJID, msg)
	if err != nil {
		return "", fmt.Errorf("failed to send message: %w", err)
	}

	return resp.ID, nil
}

func (sm *SessionManager) SendVoice(instName string, target string, base64Audio string, mimeType string, quotedMsgID string) (string, error) {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return "", err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return "", errors.New("whatsapp is not connected")
	}

	targetJID, err := inst.resolveTargetJID(target)
	if err != nil {
		return "", err
	}

	audioBytes, err := base64.StdEncoding.DecodeString(base64Audio)
	if err != nil {
		return "", fmt.Errorf("invalid base64 audio: %w", err)
	}

	uploadResp, err := client.Upload(context.Background(), audioBytes, whatsmeow.MediaAudio)
	if err != nil {
		return "", fmt.Errorf("failed to upload voice note: %w", err)
	}

	if mimeType == "" {
		mimeType = "audio/ogg; codecs=opus"
	}

	var contextInfo *waE2E.ContextInfo
	if quotedMsgID != "" {
		contextInfo = &waE2E.ContextInfo{StanzaID: proto.String(quotedMsgID)}
	}

	audioMsg := &waE2E.AudioMessage{
		URL:           &uploadResp.URL,
		DirectPath:    &uploadResp.DirectPath,
		MediaKey:      uploadResp.MediaKey,
		Mimetype:      proto.String(mimeType),
		FileEncSHA256: uploadResp.FileEncSHA256,
		FileSHA256:    uploadResp.FileSHA256,
		FileLength:    &uploadResp.FileLength,
		PTT:           proto.Bool(true),
		ContextInfo:   contextInfo,
	}

	resp, err := client.SendMessage(context.Background(), targetJID, &waE2E.Message{
		AudioMessage: audioMsg,
	})
	if err != nil {
		return "", fmt.Errorf("failed to send voice note: %w", err)
	}
	return resp.ID, nil
}

func (sm *SessionManager) SendMedia(instName string, target string, base64Data string, mediaType string, mimeType string, fileName string, caption string, quotedMsgID string) (string, error) {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return "", err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return "", errors.New("whatsapp is not connected")
	}

	targetJID, err := inst.resolveTargetJID(target)
	if err != nil {
		return "", err
	}

	dataBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("invalid base64 media: %w", err)
	}

	var uploadType whatsmeow.MediaType
	switch mediaType {
	case "image":
		uploadType = whatsmeow.MediaImage
		if mimeType == "" {
			mimeType = "image/jpeg"
		}
	case "video":
		uploadType = whatsmeow.MediaVideo
		if mimeType == "" {
			mimeType = "video/mp4"
		}
	case "audio":
		uploadType = whatsmeow.MediaAudio
		if mimeType == "" {
			mimeType = "audio/mpeg"
		}
	default:
		mediaType = "document"
		uploadType = whatsmeow.MediaDocument
		if mimeType == "" {
			mimeType = "application/pdf"
		}
	}

	uploadResp, err := client.Upload(context.Background(), dataBytes, uploadType)
	if err != nil {
		return "", fmt.Errorf("failed to upload media: %w", err)
	}

	var contextInfo *waE2E.ContextInfo
	if quotedMsgID != "" {
		contextInfo = &waE2E.ContextInfo{StanzaID: proto.String(quotedMsgID)}
	}

	msg := &waE2E.Message{}
	switch mediaType {
	case "image":
		msg.ImageMessage = &waE2E.ImageMessage{
			URL:           &uploadResp.URL,
			DirectPath:    &uploadResp.DirectPath,
			MediaKey:      uploadResp.MediaKey,
			Mimetype:      proto.String(mimeType),
			FileEncSHA256: uploadResp.FileEncSHA256,
			FileSHA256:    uploadResp.FileSHA256,
			FileLength:    &uploadResp.FileLength,
			Caption:       proto.String(caption),
			ContextInfo:   contextInfo,
		}
	case "video":
		msg.VideoMessage = &waE2E.VideoMessage{
			URL:           &uploadResp.URL,
			DirectPath:    &uploadResp.DirectPath,
			MediaKey:      uploadResp.MediaKey,
			Mimetype:      proto.String(mimeType),
			FileEncSHA256: uploadResp.FileEncSHA256,
			FileSHA256:    uploadResp.FileSHA256,
			FileLength:    &uploadResp.FileLength,
			Caption:       proto.String(caption),
			ContextInfo:   contextInfo,
		}
	case "audio":
		msg.AudioMessage = &waE2E.AudioMessage{
			URL:           &uploadResp.URL,
			DirectPath:    &uploadResp.DirectPath,
			MediaKey:      uploadResp.MediaKey,
			Mimetype:      proto.String(mimeType),
			FileEncSHA256: uploadResp.FileEncSHA256,
			FileSHA256:    uploadResp.FileSHA256,
			FileLength:    &uploadResp.FileLength,
			ContextInfo:   contextInfo,
		}
	default:
		msg.DocumentMessage = &waE2E.DocumentMessage{
			URL:           &uploadResp.URL,
			DirectPath:    &uploadResp.DirectPath,
			MediaKey:      uploadResp.MediaKey,
			Mimetype:      proto.String(mimeType),
			Title:         proto.String(fileName),
			FileName:      proto.String(fileName),
			FileEncSHA256: uploadResp.FileEncSHA256,
			FileSHA256:    uploadResp.FileSHA256,
			FileLength:    &uploadResp.FileLength,
			Caption:       proto.String(caption),
			ContextInfo:   contextInfo,
		}
	}

	resp, err := client.SendMessage(context.Background(), targetJID, msg)
	if err != nil {
		return "", fmt.Errorf("failed to send media message: %w", err)
	}
	return resp.ID, nil
}

func (sm *SessionManager) SendDocument(instName string, targetPhone string, base64Data string, fileName string, caption string) (string, error) {
	return sm.SendMedia(instName, targetPhone, base64Data, "document", "application/pdf", fileName, caption, "")
}

func (sm *SessionManager) SendLocation(instName string, target string, lat float64, lng float64, name string, address string, quotedMsgID string) (string, error) {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return "", err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return "", errors.New("whatsapp is not connected")
	}

	targetJID, err := inst.resolveTargetJID(target)
	if err != nil {
		return "", err
	}

	var contextInfo *waE2E.ContextInfo
	if quotedMsgID != "" {
		contextInfo = &waE2E.ContextInfo{StanzaID: proto.String(quotedMsgID)}
	}

	locMsg := &waE2E.LocationMessage{
		DegreesLatitude:  proto.Float64(lat),
		DegreesLongitude: proto.Float64(lng),
		Name:             proto.String(name),
		Address:          proto.String(address),
		ContextInfo:      contextInfo,
	}

	resp, err := client.SendMessage(context.Background(), targetJID, &waE2E.Message{
		LocationMessage: locMsg,
	})
	if err != nil {
		return "", fmt.Errorf("failed to send location: %w", err)
	}
	return resp.ID, nil
}

func (sm *SessionManager) GetProfilePicture(instName string, target string) (string, error) {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return "", err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return "", errors.New("whatsapp is not connected")
	}

	targetJID, err := inst.resolveTargetJID(target)
	if err != nil {
		return "", err
	}

	info, err := client.GetProfilePictureInfo(context.Background(), targetJID, &whatsmeow.GetProfilePictureParams{Preview: true})
	if err != nil {
		return "", err
	}
	if info == nil {
		return "", nil
	}
	return info.URL, nil
}

func (sm *SessionManager) SendPresence(instName string, targetPhone string, presence string) error {
	inst, err := sm.GetOrCreateInstance(instName)
	if err != nil {
		return err
	}

	inst.mu.RLock()
	client := inst.Client
	state := inst.State
	inst.mu.RUnlock()

	if client == nil || !client.IsConnected() || state != StateOpen {
		return nil // best-effort
	}

	targetJID, err := inst.resolveTargetJID(targetPhone)
	if err != nil {
		return nil
	}

	var chatPresence types.ChatPresence
	switch presence {
	case "composing":
		chatPresence = types.ChatPresenceComposing
	case "paused":
		chatPresence = types.ChatPresencePaused
	default:
		return nil
	}

	return client.SendChatPresence(context.Background(), targetJID, chatPresence, types.ChatPresenceMediaText)
}

func (inst *InstanceSession) resolveTargetJID(target string) (types.JID, error) {
	target = strings.TrimSpace(target)
	if target == "" {
		return types.EmptyJID, errors.New("empty target phone or JID")
	}
	if strings.Contains(target, "@") {
		return types.ParseJID(target)
	}
	clean := cleanPhoneNumber(target)
	if clean == "" {
		return types.EmptyJID, errors.New("invalid target phone number")
	}

	// Se temos o store do whatsmeow, conferir se este identificador é um LID conhecido com AltJID
	if inst != nil && inst.Client != nil && inst.Client.Store != nil {
		ctx := context.Background()
		lidCandidate := types.NewJID(clean, types.HiddenUserServer)
		if altPN, err := inst.Client.Store.GetAltJID(ctx, lidCandidate); err == nil && !altPN.IsEmpty() {
			return altPN, nil
		}
	}

	// LIDs do WhatsApp possuem 14 ou mais dígitos e não são números E.164 brasileiros
	if len(clean) >= 14 && !strings.HasPrefix(clean, "55") {
		return types.NewJID(clean, types.HiddenUserServer), nil
	}

	return types.NewJID(clean, types.DefaultUserServer), nil
}

func resolveTargetJID(target string) (types.JID, error) {
	var inst *InstanceSession
	return inst.resolveTargetJID(target)
}

func cleanPhoneNumber(phone string) string {
	var b []rune
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			b = append(b, r)
		}
	}
	return string(b)
}
