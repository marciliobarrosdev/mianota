package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	waLog "go.mau.fi/whatsmeow/util/log"
)

func main() {
	cfg := LoadConfig()
	logger := waLog.Stdout("Main", cfg.LogLevel, true)

	logger.Infof("Starting WhatsApp-Go Service with whatsmeow on port %s", cfg.Port)

	mediaCache := NewMediaCache()
	manager, err := NewSessionManager(cfg, mediaCache)
	if err != nil {
		logger.Errorf("Fatal error initializing session manager: %v", err)
		os.Exit(1)
	}
	defer manager.Close()

	srv := NewServer(cfg, manager, mediaCache)
	httpServer := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      srv.Routes(),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
	}

	// Graceful shutdown channel
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Infof("WhatsApp-Go service listening on http://0.0.0.0:%s", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Errorf("HTTP server error: %v", err)
			os.Exit(1)
		}
	}()

	<-stopChan
	logger.Infof("Shutting down WhatsApp-Go service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Errorf("Server forced to shutdown: %v", err)
	}

	logger.Infof("WhatsApp-Go service exited gracefully.")
}
