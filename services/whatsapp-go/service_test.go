package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

func TestHealthEndpoint(t *testing.T) {
	cfg := Config{
		Port:   "8085",
		APIKey: "test_secret_key",
	}
	cache := NewMediaCache()
	server := NewServer(cfg, nil, cache)

	req := httptest.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()

	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}

	if resp["status"] != "ok" || resp["service"] != "whatsapp-go" {
		t.Fatalf("unexpected health response: %v", resp)
	}
}

func TestAuthMiddleware(t *testing.T) {
	cfg := Config{
		Port:   "8085",
		APIKey: "correct_key",
	}
	cache := NewMediaCache()
	server := NewServer(cfg, nil, cache)

	// Case 1: No auth header on protected route
	req := httptest.NewRequest("GET", "/session/status", nil)
	rr := httptest.NewRecorder()
	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 without auth, got %d", rr.Code)
	}

	// Case 2: Wrong key
	req = httptest.NewRequest("GET", "/session/status", nil)
	req.Header.Set("apikey", "wrong_key")
	rr = httptest.NewRecorder()
	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 with wrong key, got %d", rr.Code)
	}

	// Case 3: Correct key via Authorization Bearer
	req = httptest.NewRequest("GET", "/health", nil)
	req.Header.Set("Authorization", "Bearer correct_key")
	rr = httptest.NewRecorder()
	server.Routes().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200 with Bearer key, got %d", rr.Code)
	}
}

func TestMediaCache(t *testing.T) {
	cache := NewMediaCache()

	cache.Set("msg123", "aGVsbG8=", "image/jpeg")

	item, found := cache.Get("msg123")
	if !found {
		t.Fatalf("expected item to be in cache")
	}
	if item.Base64 != "aGVsbG8=" || item.MimeType != "image/jpeg" {
		t.Fatalf("unexpected cached item: %+v", item)
	}

	_, found = cache.Get("nonexistent")
	if found {
		t.Fatalf("expected nonexistent item to not be found")
	}
}

func TestFromMeMessageSynced(t *testing.T) {
	var receivedPayload WebhookMessageUpsert
	mockWebhookServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&receivedPayload)
		w.WriteHeader(http.StatusOK)
	}))
	defer mockWebhookServer.Close()

	cfg := Config{
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "test_token",
	}
	cache := NewMediaCache()
	sm := &SessionManager{
		config:     cfg,
		mediaCache: cache,
		instances:  make(map[string]*InstanceSession),
		log:        waLog.Stdout("Test", "INFO", true),
	}

	inst := &InstanceSession{
		InstanceName: "central",
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "test_token",
	}

	// Message with IsFromMe = true (message sent from linked device)
	evt := &events.Message{
		Info: types.MessageInfo{
			MessageSource: types.MessageSource{
				IsFromMe: true,
				Chat:     types.NewJID("5511999999999", types.DefaultUserServer),
				Sender:   types.NewJID("558796648117", types.DefaultUserServer),
			},
			ID: "SYNC_MSG_123",
		},
		Message: &waE2E.Message{
			Conversation: proto.String("Mensagem enviada do celular"),
		},
	}

	sm.handleIncomingMessage(inst, evt)
	time.Sleep(100 * time.Millisecond)

	if !receivedPayload.Data.Key.FromMe {
		t.Fatalf("expected FromMe=true for synced message from linked phone, got false")
	}
	if receivedPayload.Data.Key.ID != "SYNC_MSG_123" {
		t.Fatalf("expected ID SYNC_MSG_123, got %s", receivedPayload.Data.Key.ID)
	}
}

func TestGroupMessageIgnored(t *testing.T) {
	webhookReceived := false
	mockWebhookServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webhookReceived = true
		w.WriteHeader(http.StatusOK)
	}))
	defer mockWebhookServer.Close()

	cfg := Config{
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "test_token",
	}
	cache := NewMediaCache()
	sm := &SessionManager{
		config:     cfg,
		mediaCache: cache,
		instances:  make(map[string]*InstanceSession),
		log:        waLog.Stdout("Test", "INFO", true),
	}

	inst := &InstanceSession{
		InstanceName: "central",
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "test_token",
	}

	// Group message with IsGroup = true
	evt := &events.Message{
		Info: types.MessageInfo{
			MessageSource: types.MessageSource{
				IsFromMe: false,
				IsGroup:  true,
				Chat:     types.NewJID("12036302@g.us", types.GroupServer),
			},
			ID: "GRP_MSG_123",
		},
		Message: &waE2E.Message{
			Conversation: proto.String("gastei R$ 85 no mercado"),
		},
	}

	sm.handleIncomingMessage(inst, evt)
	time.Sleep(100 * time.Millisecond)

	if webhookReceived {
		t.Fatalf("Group message must NOT trigger incoming webhook!")
	}
}

func TestInboundMessageWebhookFormat(t *testing.T) {
	var receivedPayload WebhookMessageUpsert
	var receivedToken string

	mockWebhookServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedToken = r.Header.Get("X-Webhook-Token")
		_ = json.NewDecoder(r.Body).Decode(&receivedPayload)
		w.WriteHeader(http.StatusOK)
	}))
	defer mockWebhookServer.Close()

	cfg := Config{
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "secure_token_123",
	}
	cache := NewMediaCache()
	sm := &SessionManager{
		config:     cfg,
		mediaCache: cache,
		instances:  make(map[string]*InstanceSession),
		log:        waLog.Stdout("Test", "INFO", true),
	}

	inst := &InstanceSession{
		InstanceName: "central",
		WebhookURL:   mockWebhookServer.URL,
		WebhookToken: "secure_token_123",
	}

	evt := &events.Message{
		Info: types.MessageInfo{
			MessageSource: types.MessageSource{
				IsFromMe: false,
				IsGroup:  false,
				Chat:     types.NewJID("5511988887777", types.DefaultUserServer),
				Sender:   types.NewJID("5511988887777", types.DefaultUserServer),
			},
			ID:       "WAMSG_456",
			PushName: "Marcilio Barros",
		},
		Message: &waE2E.Message{
			Conversation: proto.String("gastei R$ 85 no mercado"),
		},
	}

	sm.handleIncomingMessage(inst, evt)
	time.Sleep(150 * time.Millisecond)

	if receivedToken != "secure_token_123" {
		t.Fatalf("expected X-Webhook-Token 'secure_token_123', got '%s'", receivedToken)
	}

	if receivedPayload.Event != "messages.upsert" {
		t.Fatalf("expected event 'messages.upsert', got '%s'", receivedPayload.Event)
	}

	if receivedPayload.Instance != "central" {
		t.Fatalf("expected instance 'central', got '%s'", receivedPayload.Instance)
	}

	if receivedPayload.Data.Key.ID != "WAMSG_456" {
		t.Fatalf("expected ID 'WAMSG_456', got '%s'", receivedPayload.Data.Key.ID)
	}

	if receivedPayload.Data.Key.FromMe != false {
		t.Fatalf("expected FromMe false, got true")
	}

	if receivedPayload.Data.PushName != "Marcilio Barros" {
		t.Fatalf("expected PushName 'Marcilio Barros', got '%s'", receivedPayload.Data.PushName)
	}

	if receivedPayload.Data.Message.Conversation != "gastei R$ 85 no mercado" {
		t.Fatalf("expected text 'gastei R$ 85 no mercado', got '%s'", receivedPayload.Data.Message.Conversation)
	}
}

func TestCleanPhoneNumber(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"+55 (11) 98888-7777", "5511988887777"},
		{"5511988887777@s.whatsapp.net", "5511988887777"},
		{"123456", "123456"},
		{"", ""},
	}

	for _, c := range cases {
		actual := cleanPhoneNumber(c.input)
		if actual != c.expected {
			t.Errorf("cleanPhoneNumber(%q) = %q, expected %q", c.input, actual, c.expected)
		}
	}
}
