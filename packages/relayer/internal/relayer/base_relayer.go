package relayer

import (
	"context"
	"fmt"
	"sync"
	"time"
	
	"go.uber.org/zap"
	
	"aztec-relayer/internal/clients"
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/processor"
)

// BaseRelayer provides common relayer functionality
type BaseRelayer struct {
	spyClient    clients.SpyClientInterface
	processor    processor.VAAProcessor
	logger       *logger.Logger
	direction    string
}

// NewBaseRelayer creates a new base relayer
func NewBaseRelayer(
	spyClient clients.SpyClientInterface,
	processor processor.VAAProcessor,
	direction string,
	log *logger.Logger,
) *BaseRelayer {
	return &BaseRelayer{
		spyClient: spyClient,
		processor: processor,
		direction: direction,
		logger:    log.WithComponent("Relayer"),
	}
}

// Start begins listening for VAAs and processing them
func (r *BaseRelayer) Start(ctx context.Context) error {
	r.logger.Info("Starting relayer",
		zap.String("direction", r.direction))
	
	// Create a wait group to track goroutines
	var wg sync.WaitGroup
	
	// Subscribe to VAAs
	stream, err := r.spyClient.SubscribeSignedVAA(ctx)
	if err != nil {
		return fmt.Errorf("subscribe to VAA stream: %v", err)
	}
	
	r.logger.Info("Listening for VAAs")
	
	// Create a separate context for graceful shutdown
	processingCtx, cancelProcessing := context.WithCancel(context.Background())
	defer cancelProcessing()
	
	for {
		select {
		case <-ctx.Done():
			r.logger.Info("Shutting down relayer")
			// Cancel all processing
			cancelProcessing()
			// Wait for all processing goroutines to complete
			r.logger.Info("Waiting for all VAA processing to complete")
			wg.Wait()
			r.logger.Info("Shutdown complete")
			return nil
			
		default:
			// Receive the next VAA
			resp, err := stream.Recv()
			if err != nil {
				r.logger.Warn("Stream error, retrying in 5s", zap.Error(err))
				time.Sleep(5 * time.Second)
				
				// Try to reconnect
				stream, err = r.spyClient.SubscribeSignedVAA(ctx)
				if err != nil {
					// Cancel all processing before returning
					cancelProcessing()
					// Wait for all processing goroutines to complete
					wg.Wait()
					return fmt.Errorf("subscribe to VAA stream after retry: %v", err)
				}
				continue
			}
			
			// Process the VAA in a goroutine
			wg.Add(1)
			go func(vaaBytes []byte) {
				defer wg.Done()
				r.processVAA(processingCtx, vaaBytes)
			}(resp.VaaBytes)
		}
	}
}

// processVAA processes a single VAA
func (r *BaseRelayer) processVAA(ctx context.Context, vaaBytes []byte) {
	// Check for context cancellation first
	select {
	case <-ctx.Done():
		r.logger.Debug("Processing cancelled for VAA")
		return
	default:
		// Continue processing
	}
	
	// Process the VAA using the configured processor
	if err := r.processor.Process(ctx, vaaBytes); err != nil {
		r.logger.Error("Error processing VAA", zap.Error(err))
	}
}

// Close cleans up resources
func (r *BaseRelayer) Close() {
	if r.spyClient != nil {
		r.spyClient.Close()
	}
}