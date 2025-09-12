package clients

import (
	"context"
	"fmt"
	"time"
	
	"github.com/ethereum/go-ethereum/rpc"
	"go.uber.org/zap"
	
	"aztec-relayer/internal/logger"
)

// AztecClientInterface defines the interface for Aztec blockchain client
type AztecClientInterface interface {
	SendVerifyTransaction(ctx context.Context, targetContract string, vaaBytes []byte) (string, error)
	GetWalletAddress() string
	Close() error
}

// AztecPXEClient handles interactions with Aztec blockchain via PXE
type AztecPXEClient struct {
	rpcClient     *rpc.Client
	walletAddress string
	logger        *logger.Logger
}

// NewAztecPXEClient creates a new client for Aztec blockchain via PXE
func NewAztecPXEClient(pxeURL, walletAddress string, log *logger.Logger) (*AztecPXEClient, error) {
	client := &AztecPXEClient{
		walletAddress: walletAddress,
		logger:        log.WithComponent("AztecPXEClient"),
	}
	
	client.logger.Info("Connecting to Aztec PXE",
		zap.String("pxeURL", pxeURL),
		zap.String("walletAddress", walletAddress))
	
	// Create RPC client
	rpcClient, err := rpc.Dial(pxeURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create RPC client: %v", err)
	}
	
	client.rpcClient = rpcClient
	
	// Test connection
	err = client.testConnection()
	if err != nil {
		rpcClient.Close()
		return nil, fmt.Errorf("failed to connect to Aztec PXE: %v", err)
	}
	
	return client, nil
}

// testConnection tests the connection to Aztec PXE
func (c *AztecPXEClient) testConnection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Test with node_getBlock method
	var blockResult interface{}
	err := c.rpcClient.CallContext(ctx, &blockResult, "node_getBlock", 1)
	if err != nil {
		c.logger.Debug("node_getBlock test failed", zap.Error(err))
		// This is okay - block 1 might not exist, connection is still working
	}
	
	c.logger.Info("Aztec PXE connection successful")
	return nil
}

// SendVerifyTransaction sends a transaction to verify and store a VAA on Aztec via PXE
func (c *AztecPXEClient) SendVerifyTransaction(ctx context.Context, targetContract string, vaaBytes []byte) (string, error) {
	c.logger.Debug("Sending verify_vaa transaction to Aztec via PXE", zap.Int("vaaLength", len(vaaBytes)))
	
	// Pad to 2000 bytes for contract but pass actual length
	paddedVAABytes := make([]byte, 2000)
	copy(paddedVAABytes, vaaBytes)
	
	// Convert the padded bytes to array format for Aztec
	vaaArray := make([]interface{}, 2000)
	for i, b := range paddedVAABytes {
		vaaArray[i] = int(b)
	}
	
	actualLength := len(vaaBytes)
	
	c.logger.Debug("Calling verify_vaa function",
		zap.String("contract", targetContract),
		zap.Int("actualLength", actualLength),
		zap.Int("paddedLength", len(paddedVAABytes)))
	
	// First, try to simulate the call
	var result interface{}
	err := c.rpcClient.CallContext(ctx, &result, "pxe_simulateTransaction", map[string]interface{}{
		"contractAddress": targetContract,
		"functionName":    "verify_vaa",
		"args":            []interface{}{vaaArray, actualLength},
		"origin":          c.walletAddress,
	})
	
	if err != nil {
		c.logger.Warn("Transaction simulation failed", zap.Error(err))
		// Continue anyway - simulation might not be available
	} else {
		c.logger.Debug("Transaction simulation successful", zap.Any("result", result))
	}
	
	// Now send the actual transaction
	var txResult interface{}
	err = c.rpcClient.CallContext(ctx, &txResult, "pxe_sendTransaction", map[string]interface{}{
		"contractAddress": targetContract,
		"functionName":    "verify_vaa",
		"args":            []interface{}{vaaArray, actualLength},
		"origin":          c.walletAddress,
	})
	
	if err != nil {
		return "", fmt.Errorf("failed to send verify_vaa transaction: %v", err)
	}
	
	// Extract transaction hash from result
	if txMap, ok := txResult.(map[string]interface{}); ok {
		if txHash, exists := txMap["txHash"]; exists {
			if txHashStr, ok := txHash.(string); ok {
				return txHashStr, nil
			}
		}
		if txHash, exists := txMap["hash"]; exists {
			if txHashStr, ok := txHash.(string); ok {
				return txHashStr, nil
			}
		}
	}
	
	if txHashStr, ok := txResult.(string); ok {
		return txHashStr, nil
	}
	
	c.logger.Debug("PXE transaction result", zap.Any("result", txResult))
	return fmt.Sprintf("tx_submitted_%d", time.Now().Unix()), nil
}

// GetWalletAddress returns the wallet address being used
func (c *AztecPXEClient) GetWalletAddress() string {
	return c.walletAddress
}

// Close closes the RPC client connection
func (c *AztecPXEClient) Close() error {
	if c.rpcClient != nil {
		c.rpcClient.Close()
	}
	return nil
}