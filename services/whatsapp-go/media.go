package main

import (
	"sync"
	"time"
)

type CachedMedia struct {
	Base64    string
	MimeType  string
	CachedAt  time.Time
}

type MediaCache struct {
	mu    sync.RWMutex
	items map[string]CachedMedia
}

func NewMediaCache() *MediaCache {
	c := &MediaCache{
		items: make(map[string]CachedMedia),
	}
	// Background cleanup of items older than 30 minutes
	go c.cleanupLoop()
	return c
}

func (c *MediaCache) Set(key string, base64Data string, mimeType string) {
	if key == "" || base64Data == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = CachedMedia{
		Base64:   base64Data,
		MimeType: mimeType,
		CachedAt: time.Now(),
	}
}

func (c *MediaCache) Get(key string) (CachedMedia, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	item, ok := c.items[key]
	return item, ok
}

func (c *MediaCache) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.items {
			if now.Sub(v.CachedAt) > 30*time.Minute {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}
