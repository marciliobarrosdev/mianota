package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"go.mau.fi/whatsmeow/types/events"
)

type WebhookMessageUpsert struct {
	Event    string      `json:"event"`
	Instance string      `json:"instance"`
	Data     WebhookData `json:"data"`
}

type WebhookData struct {
	Key      WebhookKey     `json:"key"`
	PushName string         `json:"pushName"`
	LID      string         `json:"lid,omitempty"`
	PN       string         `json:"pn,omitempty"`
	Message  WebhookMessage `json:"message"`
	QuotedID string         `json:"quotedId,omitempty"`
}

type WebhookKey struct {
	RemoteJid string `json:"remoteJid"`
	FromMe    bool   `json:"fromMe"`
	ID        string `json:"id"`
}

type WebhookMessage struct {
	Conversation        string                  `json:"conversation,omitempty"`
	ExtendedTextMessage *ExtendedTextMsg        `json:"extendedTextMessage,omitempty"`
	ImageMessage        *MediaMsgWithCaption    `json:"imageMessage,omitempty"`
	VideoMessage        *MediaMsgWithCaption    `json:"videoMessage,omitempty"`
	AudioMessage        *AudioMsg               `json:"audioMessage,omitempty"`
	DocumentMessage     *DocumentMsgWithCaption `json:"documentMessage,omitempty"`
	LocationMessage     *LocationMsg            `json:"locationMessage,omitempty"`
}

type LocationMsg struct {
	DegreesLatitude  float64 `json:"degreesLatitude"`
	DegreesLongitude float64 `json:"degreesLongitude"`
	Name             string  `json:"name,omitempty"`
	Address          string  `json:"address,omitempty"`
}

type ExtendedTextMsg struct {
	Text string `json:"text"`
}

type MediaMsgWithCaption struct {
	Caption  string `json:"caption,omitempty"`
	Mimetype string `json:"mimetype,omitempty"`
}

type AudioMsg struct {
	Mimetype string `json:"mimetype,omitempty"`
}

type DocumentMsgWithCaption struct {
	Caption  string `json:"caption,omitempty"`
	FileName string `json:"fileName,omitempty"`
	Mimetype string `json:"mimetype,omitempty"`
}

type WebhookStatusUpdate struct {
	Event    string                `json:"event"`
	Instance string                `json:"instance"`
	Data     []WebhookStatusUpdateItem `json:"data"`
}

type WebhookStatusUpdateItem struct {
	KeyId  string `json:"keyId"`
	Status string `json:"status"`
}

func (sm *SessionManager) makeEventHandler(inst *InstanceSession) func(evt interface{}) {
	return func(rawEvt interface{}) {
		switch evt := rawEvt.(type) {
		case *events.Connected:
			inst.mu.Lock()
			inst.State = StateOpen
			if inst.Client.Store.ID != nil {
				inst.Phone = inst.Client.Store.ID.User
			}
			inst.mu.Unlock()
			sm.log.Infof("WhatsApp connected on instance %s (Phone: %s)", inst.InstanceName, inst.Phone)

		case *events.Disconnected:
			inst.mu.Lock()
			if inst.State == StateOpen {
				inst.State = StateConnecting // will auto-reconnect
			}
			inst.mu.Unlock()
			sm.log.Infof("WhatsApp disconnected temporarily on instance %s", inst.InstanceName)

		case *events.LoggedOut:
			inst.mu.Lock()
			inst.State = StateUnpaired
			inst.Phone = ""
			inst.QRBase64 = ""
			inst.RawQRCode = ""
			inst.PairingCode = ""
			inst.mu.Unlock()
			sm.log.Warnf("WhatsApp logged out / unlinked on instance %s (Reason: %v)", inst.InstanceName, evt.Reason)

		case *events.Message:
			sm.handleIncomingMessage(inst, evt)

		case *events.Receipt:
			sm.handleReceipt(inst, evt)
		}
	}
}

func (sm *SessionManager) handleIncomingMessage(inst *InstanceSession, evt *events.Message) {
	// Ignore group chats: MIAnota is a private assistant
	if evt.Info.IsGroup || strings.HasSuffix(evt.Info.Chat.String(), "@g.us") {
		return
	}

	messageID := evt.Info.ID
	remoteJid := evt.Info.Chat.String()
	senderPhone := evt.Info.Chat.User
	pushName := evt.Info.PushName
	if pushName == "" {
		pushName = senderPhone
	}

	// Resolve LID and PN
	var lidJID, pnJID string
	ctx := context.Background()
	if evt.Info.Chat.Server == "lid" {
		lidJID = evt.Info.Chat.String()
		if inst.Client != nil && inst.Client.Store != nil {
			if alt, err := inst.Client.Store.GetAltJID(ctx, evt.Info.Chat); err == nil && !alt.IsEmpty() {
				pnJID = alt.String()
				senderPhone = alt.User
			}
		}
	} else {
		pnJID = evt.Info.Chat.String()
		if inst.Client != nil && inst.Client.Store != nil {
			if alt, err := inst.Client.Store.GetAltJID(ctx, evt.Info.Chat); err == nil && !alt.IsEmpty() {
				lidJID = alt.String()
			}
		}
	}

	whMsg := WebhookMessage{}

	// Extract text, image, audio, video, document, location
	msg := evt.Message
	if msg == nil {
		return
	}

	if conv := msg.GetConversation(); conv != "" {
		whMsg.Conversation = conv
	} else if ext := msg.GetExtendedTextMessage(); ext != nil && ext.GetText() != "" {
		whMsg.ExtendedTextMessage = &ExtendedTextMsg{
			Text: ext.GetText(),
		}
	}

	// Audio message
	if audio := msg.GetAudioMessage(); audio != nil {
		mime := audio.GetMimetype()
		if mime == "" {
			mime = "audio/ogg; codecs=opus"
		}
		whMsg.AudioMessage = &AudioMsg{
			Mimetype: mime,
		}

		go func() {
			data, err := inst.Client.Download(context.Background(), audio)
			if err == nil && len(data) > 0 {
				b64 := base64.StdEncoding.EncodeToString(data)
				sm.mediaCache.Set(messageID, b64, mime)
			}
		}()
	}

	// Image message
	if img := msg.GetImageMessage(); img != nil {
		mime := img.GetMimetype()
		if mime == "" {
			mime = "image/jpeg"
		}
		whMsg.ImageMessage = &MediaMsgWithCaption{
			Caption:  img.GetCaption(),
			Mimetype: mime,
		}

		go func() {
			data, err := inst.Client.Download(context.Background(), img)
			if err == nil && len(data) > 0 {
				b64 := base64.StdEncoding.EncodeToString(data)
				sm.mediaCache.Set(messageID, b64, mime)
			}
		}()
	}

	// Video message
	if vid := msg.GetVideoMessage(); vid != nil {
		mime := vid.GetMimetype()
		if mime == "" {
			mime = "video/mp4"
		}
		whMsg.VideoMessage = &MediaMsgWithCaption{
			Caption:  vid.GetCaption(),
			Mimetype: mime,
		}

		go func() {
			data, err := inst.Client.Download(context.Background(), vid)
			if err == nil && len(data) > 0 {
				b64 := base64.StdEncoding.EncodeToString(data)
				sm.mediaCache.Set(messageID, b64, mime)
			}
		}()
	}

	// Document message
	if doc := msg.GetDocumentMessage(); doc != nil {
		mime := doc.GetMimetype()
		if mime == "" {
			mime = "application/pdf"
		}
		whMsg.DocumentMessage = &DocumentMsgWithCaption{
			Caption:  doc.GetCaption(),
			FileName: doc.GetFileName(),
			Mimetype: mime,
		}

		go func() {
			data, err := inst.Client.Download(context.Background(), doc)
			if err == nil && len(data) > 0 {
				b64 := base64.StdEncoding.EncodeToString(data)
				sm.mediaCache.Set(messageID, b64, mime)
			}
		}()
	}

	// Location message
	if loc := msg.GetLocationMessage(); loc != nil {
		whMsg.LocationMessage = &LocationMsg{
			DegreesLatitude:  loc.GetDegreesLatitude(),
			DegreesLongitude: loc.GetDegreesLongitude(),
			Name:             loc.GetName(),
			Address:          loc.GetAddress(),
		}
	}

	// Extract Quoted Message StanzaID
	var quotedID string
	if ext := msg.GetExtendedTextMessage(); ext != nil && ext.GetContextInfo() != nil {
		quotedID = ext.GetContextInfo().GetStanzaID()
	} else if img := msg.GetImageMessage(); img != nil && img.GetContextInfo() != nil {
		quotedID = img.GetContextInfo().GetStanzaID()
	} else if aud := msg.GetAudioMessage(); aud != nil && aud.GetContextInfo() != nil {
		quotedID = aud.GetContextInfo().GetStanzaID()
	} else if doc := msg.GetDocumentMessage(); doc != nil && doc.GetContextInfo() != nil {
		quotedID = doc.GetContextInfo().GetStanzaID()
	}

	payload := WebhookMessageUpsert{
		Event:    "messages.upsert",
		Instance: inst.InstanceName,
		Data: WebhookData{
			Key: WebhookKey{
				RemoteJid: remoteJid,
				FromMe:    evt.Info.IsFromMe,
				ID:        messageID,
			},
			PushName: pushName,
			LID:      lidJID,
			PN:       pnJID,
			Message:  whMsg,
			QuotedID: quotedID,
		},
	}

	go sm.dispatchWebhook(inst, payload)
}

func (sm *SessionManager) handleReceipt(inst *InstanceSession, evt *events.Receipt) {
	if len(evt.MessageIDs) == 0 {
		return
	}

	var status string
	switch evt.Type {
	case "":
		status = "DELIVERY_ACK" // Delivered
	case "read", "read-self":
		status = "READ" // Read
	case "played":
		status = "READ"
	default:
		return
	}

	items := make([]WebhookStatusUpdateItem, 0, len(evt.MessageIDs))
	for _, id := range evt.MessageIDs {
		items = append(items, WebhookStatusUpdateItem{
			KeyId:  string(id),
			Status: status,
		})
	}

	payload := WebhookStatusUpdate{
		Event:    "messages.update",
		Instance: inst.InstanceName,
		Data:     items,
	}

	go sm.dispatchWebhook(inst, payload)
}

func (sm *SessionManager) dispatchWebhook(inst *InstanceSession, payload interface{}) {
	targetURL := inst.WebhookURL
	if targetURL == "" {
		targetURL = sm.config.WebhookURL
	}
	if targetURL == "" {
		return
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		sm.log.Errorf("Failed to marshal webhook payload: %v", err)
		return
	}

	req, err := http.NewRequestWithContext(context.Background(), "POST", targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		sm.log.Errorf("Failed to create webhook request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	token := inst.WebhookToken
	if token == "" {
		token = sm.config.WebhookToken
	}
	if token != "" {
		req.Header.Set("X-Webhook-Token", token)
	}
	if sm.config.APIKey != "" {
		req.Header.Set("apikey", sm.config.APIKey)
		req.Header.Set("X-API-Key", sm.config.APIKey)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		sm.log.Warnf("Webhook delivery to %s failed: %v", targetURL, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		sm.log.Warnf("Webhook endpoint %s returned HTTP %d", targetURL, resp.StatusCode)
	}
}
