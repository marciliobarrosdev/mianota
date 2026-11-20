package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type Server struct {
	config  Config
	manager *SessionManager
	cache   *MediaCache
	started time.Time
}

func NewServer(cfg Config, sm *SessionManager, cache *MediaCache) *Server {
	return &Server{
		config:  cfg,
		manager: sm,
		cache:   cache,
		started: time.Now(),
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Public Health Endpoint
	mux.HandleFunc("/health", s.handleHealth)

	// API Handlers (wrapped with Auth Middleware)
	mux.HandleFunc("/session/status", s.authMiddleware(s.handleSessionStatus))
	mux.HandleFunc("/session/connect", s.authMiddleware(s.handleSessionConnect))
	mux.HandleFunc("/session/logout", s.authMiddleware(s.handleSessionLogout))

	// Evolution API Compatibility Endpoints
	mux.HandleFunc("/instance/connectionState/", s.authMiddleware(s.handleEvolutionConnectionState))
	mux.HandleFunc("/instance/connect/", s.authMiddleware(s.handleEvolutionConnect))
	mux.HandleFunc("/instance/create", s.authMiddleware(s.handleEvolutionCreate))
	mux.HandleFunc("/instance/logout/", s.authMiddleware(s.handleEvolutionLogout))
	mux.HandleFunc("/instance/delete/", s.authMiddleware(s.handleEvolutionDelete))
	mux.HandleFunc("/instance/fetchInstances", s.authMiddleware(s.handleEvolutionFetchInstances))

	mux.HandleFunc("/message/sendText", s.authMiddleware(s.handleSendText))
	mux.HandleFunc("/message/sendText/", s.authMiddleware(s.handleSendText))
	mux.HandleFunc("/message/sendMedia", s.authMiddleware(s.handleSendMedia))
	mux.HandleFunc("/message/sendMedia/", s.authMiddleware(s.handleSendMedia))
	mux.HandleFunc("/message/sendVoice", s.authMiddleware(s.handleSendVoice))
	mux.HandleFunc("/message/sendVoice/", s.authMiddleware(s.handleSendVoice))
	mux.HandleFunc("/message/sendLocation", s.authMiddleware(s.handleSendLocation))
	mux.HandleFunc("/message/sendLocation/", s.authMiddleware(s.handleSendLocation))

	mux.HandleFunc("/chat/sendPresence/", s.authMiddleware(s.handleSendPresence))
	mux.HandleFunc("/chat/profilePicture/", s.authMiddleware(s.handleGetProfilePicture))
	mux.HandleFunc("/chat/getBase64FromMediaMessage/", s.authMiddleware(s.handleGetBase64Media))
	mux.HandleFunc("/webhook/set/", s.authMiddleware(s.handleSetWebhook))

	return mux
}

func (s *Server) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("apikey")
		if apiKey == "" {
			apiKey = r.Header.Get("X-API-Key")
		}
		if apiKey == "" {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				apiKey = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if s.config.APIKey != "" && apiKey != s.config.APIKey {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "unauthorized: invalid api key",
			})
			return
		}

		next(w, r)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"service": "whatsapp-go",
		"version": "1.0.0",
		"uptime":  time.Since(s.started).String(),
	})
}

func (s *Server) handleSessionStatus(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("instance")
	if name == "" {
		name = "central"
	}
	inst, err := s.manager.GetOrCreateInstance(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst.mu.RLock()
	state := inst.State
	phone := inst.Phone
	inst.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"instance": name,
		"state":    string(state),
		"phone":    phone,
	})
}

func (s *Server) handleSessionConnect(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("instance")
	if name == "" {
		name = "central"
	}
	pairingPhone := r.URL.Query().Get("phone")

	inst, err := s.manager.GetOrCreateInstance(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst, err = s.manager.ConnectInstance(inst, pairingPhone)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst.mu.RLock()
	defer inst.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"connected":   inst.State == StateOpen,
		"state":       string(inst.State),
		"phone":       inst.Phone,
		"qrBase64":    inst.QRBase64,
		"code":        inst.RawQRCode,
		"pairingCode": inst.PairingCode,
	})
}

func (s *Server) handleSessionLogout(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("instance")
	if name == "" {
		name = "central"
	}
	if err := s.manager.LogoutInstance(name); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

// Evolution API Compatibility Handlers
func (s *Server) handleEvolutionConnectionState(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/instance/connectionState/")
	if instanceName == "" {
		instanceName = "central"
	}

	inst, err := s.manager.GetOrCreateInstance(instanceName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst.mu.RLock()
	state := string(inst.State)
	inst.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"instance": map[string]string{
			"state": state,
		},
		"state": state,
	})
}

func (s *Server) handleEvolutionConnect(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/instance/connect/")
	if instanceName == "" {
		instanceName = "central"
	}

	inst, err := s.manager.GetOrCreateInstance(instanceName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	pairingPhone := r.URL.Query().Get("phone")
	inst, err = s.manager.ConnectInstance(inst, pairingPhone)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst.mu.RLock()
	defer inst.mu.RUnlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"base64":      inst.QRBase64,
		"code":        inst.RawQRCode,
		"pairingCode": inst.PairingCode,
		"instance": map[string]string{
			"state": string(inst.State),
		},
	})
}

func (s *Server) handleEvolutionCreate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		InstanceName string `json:"instanceName"`
		Webhook      struct {
			URL string `json:"url"`
		} `json:"webhook"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	name := body.InstanceName
	if name == "" {
		name = "central"
	}

	inst, err := s.manager.GetOrCreateInstance(name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if body.Webhook.URL != "" {
		inst.mu.Lock()
		inst.WebhookURL = body.Webhook.URL
		inst.mu.Unlock()
	}

	// Connect instance
	inst, _ = s.manager.ConnectInstance(inst, "")

	inst.mu.RLock()
	defer inst.mu.RUnlock()

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"instance": map[string]interface{}{
			"instanceName": name,
			"state":        string(inst.State),
		},
		"base64":      inst.QRBase64,
		"code":        inst.RawQRCode,
		"pairingCode": inst.PairingCode,
	})
}

func (s *Server) handleEvolutionLogout(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/instance/logout/")
	_ = s.manager.LogoutInstance(instanceName)
	writeJSON(w, http.StatusOK, map[string]string{"status": "SUCCESS"})
}

func (s *Server) handleEvolutionDelete(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/instance/delete/")
	_ = s.manager.LogoutInstance(instanceName)
	writeJSON(w, http.StatusOK, map[string]string{"status": "SUCCESS"})
}

func (s *Server) handleEvolutionFetchInstances(w http.ResponseWriter, r *http.Request) {
	instanceName := r.URL.Query().Get("instanceName")
	if instanceName == "" {
		instanceName = "central"
	}

	inst, err := s.manager.GetOrCreateInstance(instanceName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	inst.mu.RLock()
	defer inst.mu.RUnlock()

	writeJSON(w, http.StatusOK, []map[string]interface{}{
		{
			"instance": map[string]interface{}{
				"instanceName": instanceName,
				"owner":        inst.Phone,
				"number":       inst.Phone,
				"state":        string(inst.State),
			},
		},
	})
}

func (s *Server) handleSendText(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/message/sendText/")
	if instanceName == "" {
		instanceName = "central"
	}

	var body struct {
		Number       string `json:"number"`
		Text         string `json:"text"`
		QuotedMsgId  string `json:"quotedMsgId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	msgID, err := s.manager.SendText(instanceName, body.Number, body.Text, body.QuotedMsgId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key": map[string]string{
			"id": msgID,
		},
		"messageId": msgID,
		"status":    "PENDING",
	})
}

func (s *Server) handleSendMedia(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/message/sendMedia/")
	if instanceName == "" {
		instanceName = "central"
	}

	var body struct {
		Number      string `json:"number"`
		MediaType   string `json:"mediatype"`
		MimeType    string `json:"mimetype"`
		Media       string `json:"media"`
		FileName    string `json:"fileName"`
		Caption     string `json:"caption"`
		QuotedMsgId string `json:"quotedMsgId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	msgID, err := s.manager.SendMedia(instanceName, body.Number, body.Media, body.MediaType, body.MimeType, body.FileName, body.Caption, body.QuotedMsgId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key": map[string]string{
			"id": msgID,
		},
		"messageId": msgID,
		"status":    "PENDING",
	})
}

func (s *Server) handleSendVoice(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/message/sendVoice/")
	if instanceName == "" {
		instanceName = "central"
	}

	var body struct {
		Number      string `json:"number"`
		Audio       string `json:"audio"`
		MimeType    string `json:"mimetype"`
		QuotedMsgId string `json:"quotedMsgId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	msgID, err := s.manager.SendVoice(instanceName, body.Number, body.Audio, body.MimeType, body.QuotedMsgId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key": map[string]string{
			"id": msgID,
		},
		"messageId": msgID,
		"status":    "PENDING",
	})
}

func (s *Server) handleSendLocation(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/message/sendLocation/")
	if instanceName == "" {
		instanceName = "central"
	}

	var body struct {
		Number      string  `json:"number"`
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
		Name        string  `json:"name"`
		Address     string  `json:"address"`
		QuotedMsgId string  `json:"quotedMsgId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	msgID, err := s.manager.SendLocation(instanceName, body.Number, body.Latitude, body.Longitude, body.Name, body.Address, body.QuotedMsgId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key": map[string]string{
			"id": msgID,
		},
		"messageId": msgID,
		"status":    "PENDING",
	})
}

func (s *Server) handleGetProfilePicture(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/chat/profilePicture/")
	target := r.URL.Query().Get("number")
	if target == "" {
		target = r.URL.Query().Get("jid")
	}
	if target == "" {
		// Try from path segment after instance
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/chat/profilePicture/"), "/")
		if len(parts) > 1 {
			target = parts[1]
		} else if len(parts) == 1 && instanceName != "" {
			target = instanceName
			instanceName = "central"
		}
	}

	if target == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing number or jid"})
		return
	}

	url, err := s.manager.GetProfilePicture(instanceName, target)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"url": "", "error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}

func (s *Server) handleSendPresence(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/chat/sendPresence/")
	if instanceName == "" {
		instanceName = "central"
	}

	var body struct {
		Number   string `json:"number"`
		Presence string `json:"presence"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	_ = s.manager.SendPresence(instanceName, body.Number, body.Presence)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleGetBase64Media(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID      string `json:"id"`
		Key     struct {
			ID string `json:"id"`
		} `json:"key"`
		Message struct {
			ID  string `json:"id"`
			Key struct {
				ID string `json:"id"`
			} `json:"key"`
		} `json:"message"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	msgID := body.Message.Key.ID
	if msgID == "" {
		msgID = body.Message.ID
	}
	if msgID == "" {
		msgID = body.Key.ID
	}
	if msgID == "" {
		msgID = body.ID
	}

	if msgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing message id"})
		return
	}

	// Aguarda até 3 segundos se o download em segundo plano ainda estiver em curso
	for i := 0; i < 30; i++ {
		if item, found := s.cache.Get(msgID); found {
			writeJSON(w, http.StatusOK, map[string]string{
				"base64":   item.Base64,
				"mimetype": item.MimeType,
			})
			return
		}
		time.Sleep(100 * time.Millisecond)
	}

	writeJSON(w, http.StatusNotFound, map[string]string{"error": "media not found or expired"})
}

func (s *Server) handleSetWebhook(w http.ResponseWriter, r *http.Request) {
	instanceName := extractInstanceFromPath(r.URL.Path, "/webhook/set/")
	var body struct {
		Webhook struct {
			URL string `json:"url"`
		} `json:"webhook"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	inst, err := s.manager.GetOrCreateInstance(instanceName)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if body.Webhook.URL != "" {
		inst.mu.Lock()
		inst.WebhookURL = body.Webhook.URL
		inst.mu.Unlock()
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func extractInstanceFromPath(fullPath, prefix string) string {
	rest := strings.TrimPrefix(fullPath, prefix)
	parts := strings.Split(rest, "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
