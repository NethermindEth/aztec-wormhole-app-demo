package clients

import (
	"context"
	"testing"
	"time"
	
	"aztec-relayer/internal/logger"
)

func TestNewSpyClient(t *testing.T) {
	log, err := logger.New()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	
	// This test requires a running spy service
	// In a real test environment, we would use a mock server
	t.Run("Connection to invalid endpoint", func(t *testing.T) {
		client, err := NewSpyClient("invalid:endpoint", log)
		if err != nil {
			// Expected to fail with invalid endpoint
			t.Logf("Expected connection failure: %v", err)
		}
		if client != nil {
			defer client.Close()
		}
	})
}

func TestSpyClientClose(t *testing.T) {
	log, err := logger.New()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	
	client := &SpyClient{
		logger: log,
		conn:   nil, // No actual connection
	}
	
	// Should not panic even with nil connection
	client.Close()
}

func TestSubscribeSignedVAAWithTimeout(t *testing.T) {
	log, err := logger.New()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	
	client := &SpyClient{
		logger: log,
		// In a real test, we would mock the gRPC client
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	
	// This will fail as we don't have a real client
	_, err = client.SubscribeSignedVAA(ctx)
	if err == nil {
		t.Error("Expected error with nil client")
	}
}