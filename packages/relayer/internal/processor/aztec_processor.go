package processor

import (
	"context"
	"fmt"
	"time"
	
	"go.uber.org/zap"
	
	"aztec-relayer/internal/clients"
	"aztec-relayer/internal/logger"
)

// AztecProcessor processes VAAs from Aztec to Arbitrum
type AztecProcessor struct {
	*BaseVAAProcessor
	evmClient        clients.EVMClientInterface
	targetContract   string
}

// NewAztecProcessor creates a new processor for Aztec -> Arbitrum VAAs
func NewAztecProcessor(
	sourceChainID, destChainID uint16,
	emitterFilter string,
	evmClient clients.EVMClientInterface,
	targetContract string,
	log *logger.Logger,
) *AztecProcessor {
	return &AztecProcessor{
		BaseVAAProcessor: NewBaseVAAProcessor(sourceChainID, destChainID, emitterFilter, log.WithComponent("AztecProcessor")),
		evmClient:        evmClient,
		targetContract:   targetContract,
	}
}

// Process processes a VAA from Aztec and relays it to Arbitrum
func (p *AztecProcessor) Process(ctx context.Context, vaaBytes []byte) error {
	// Parse the VAA
	vaaData, err := p.ParseVAA(vaaBytes)
	if err != nil {
		return fmt.Errorf("failed to parse VAA: %v", err)
	}
	
	// Check if we should process this VAA
	if !p.ShouldProcess(vaaData) {
		return nil // Skip silently
	}
	
	// Log VAA details
	p.LogVAADetails(vaaData)
	
	// Create context with timeout for transaction
	txCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	
	// Send to Arbitrum
	p.logger.Info("Relaying VAA from Aztec to Arbitrum",
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("sourceTxID", vaaData.TxID))
	
	txHash, err := p.evmClient.SendVerifyTransaction(txCtx, p.targetContract, vaaData.RawBytes)
	if err != nil {
		// Check if context was cancelled
		if txCtx.Err() != nil {
			p.logger.Warn("Transaction cancelled or timed out", zap.Error(txCtx.Err()))
			return fmt.Errorf("transaction interrupted: %v", txCtx.Err())
		}
		
		p.logger.Error("Failed to send verify transaction to Arbitrum",
			zap.Uint64("sequence", vaaData.Sequence),
			zap.String("sourceTxID", vaaData.TxID),
			zap.Error(err))
		return fmt.Errorf("failed to relay to Arbitrum: %v", err)
	}
	
	p.logger.Info("VAA successfully relayed to Arbitrum",
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("txHash", txHash),
		zap.String("sourceTxID", vaaData.TxID))
	
	return nil
}

// GetDirection returns the direction of this processor
func (p *AztecProcessor) GetDirection() string {
	return "Aztec->Arbitrum"
}