package clients

import (
	"context"
	"fmt"
	"time"
	
	spyv1 "github.com/certusone/wormhole/node/pkg/proto/spy/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	
	"aztec-relayer/internal/logger"
)

// SpyClientInterface defines the interface for the Wormhole spy service client
type SpyClientInterface interface {
	SubscribeSignedVAA(ctx context.Context) (spyv1.SpyRPCService_SubscribeSignedVAAClient, error)
	Close()
}

// SpyClient handles connections to the Wormhole spy service
type SpyClient struct {
	conn   *grpc.ClientConn
	client spyv1.SpyRPCServiceClient
	logger *logger.Logger
}

// NewSpyClient creates a new client for the Wormhole spy service
func NewSpyClient(endpoint string, log *logger.Logger) (*SpyClient, error) {
	client := &SpyClient{
		logger: log.WithComponent("SpyClient"),
	}
	
	client.logger.Info("Connecting to spy service", zap.String("endpoint", endpoint))
	conn, err := grpc.Dial(endpoint, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to spy: %v", err)
	}
	
	client.conn = conn
	client.client = spyv1.NewSpyRPCServiceClient(conn)
	return client, nil
}

// Close closes the connection to the spy service
func (c *SpyClient) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}

// SubscribeSignedVAA subscribes to all signed VAAs with retry logic
func (c *SpyClient) SubscribeSignedVAA(ctx context.Context) (spyv1.SpyRPCService_SubscribeSignedVAAClient, error) {
	const maxRetries = 5
	const retryDelay = 2 * time.Second
	
	c.logger.Debug("Subscribing to signed VAAs")
	
	var stream spyv1.SpyRPCService_SubscribeSignedVAAClient
	var err error
	
	for attempt := 1; attempt <= maxRetries; attempt++ {
		stream, err = c.client.SubscribeSignedVAA(ctx, &spyv1.SubscribeSignedVAARequest{})
		if err == nil {
			return stream, nil
		}
		
		if attempt < maxRetries {
			c.logger.Warn("Subscribe attempt failed",
				zap.Int("attempt", attempt),
				zap.Error(err),
				zap.Duration("retryIn", retryDelay))
			
			select {
			case <-time.After(retryDelay):
				// Continue to next retry
			case <-ctx.Done():
				return nil, fmt.Errorf("subscribe to signed VAAs: %v", ctx.Err())
			}
		}
	}
	
	return nil, fmt.Errorf("subscribe to signed VAAs after %d attempts: %v", maxRetries, err)
}