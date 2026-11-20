package main

import (
	"os"
	"strings"
)

type Config struct {
	Port         string
	DatabaseURL  string
	APIKey       string
	WebhookURL   string
	WebhookToken string
	LogLevel     string
}

func LoadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Fallback for local testing if needed
		dbURL = os.Getenv("SUPABASE_DATABASE_URL")
	}

	apiKey := os.Getenv("WHATSAPP_GO_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("API_KEY")
	}
	if apiKey == "" {
		apiKey = "mianota_whatsapp_go_secret_key"
	}

	webhookURL := os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		webhookURL = os.Getenv("WHATSAPP_WEBHOOK_URL")
	}
	if webhookURL == "" {
		webhookURL = "http://localhost:8080/api/public/support-whatsapp-webhook"
	}

	webhookToken := os.Getenv("WEBHOOK_TOKEN")
	if webhookToken == "" {
		webhookToken = os.Getenv("WHATSAPP_WEBHOOK_TOKEN")
	}

	logLevel := strings.ToUpper(os.Getenv("LOG_LEVEL"))
	if logLevel == "" {
		logLevel = "INFO"
	}

	return Config{
		Port:         port,
		DatabaseURL:  dbURL,
		APIKey:       apiKey,
		WebhookURL:   webhookURL,
		WebhookToken: webhookToken,
		LogLevel:     logLevel,
	}
}
