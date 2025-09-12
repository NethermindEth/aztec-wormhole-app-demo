package processor

import (
	"context"
	"fmt"
	"time"
	
	"go.uber.org/zap"
	
	"aztec-relayer/internal/clients"
	"aztec-relayer/internal/logger"
)

// ArbitrumProcessor processes VAAs from Arbitrum to Aztec
type ArbitrumProcessor struct {
	*BaseVAAProcessor
	aztecClient        clients.AztecClientInterface
	verificationClient clients.VerificationClientInterface
	targetContract     string
	useVerificationService bool
}

// NewArbitrumProcessor creates a new processor for Arbitrum -> Aztec VAAs
func NewArbitrumProcessor(
	sourceChainID, destChainID uint16,
	emitterFilter string,
	aztecClient clients.AztecClientInterface,
	verificationClient clients.VerificationClientInterface,
	targetContract string,
	log *logger.Logger,
) *ArbitrumProcessor {
	return &ArbitrumProcessor{
		BaseVAAProcessor:       NewBaseVAAProcessor(sourceChainID, destChainID, emitterFilter, log.WithComponent("ArbitrumProcessor")),
		aztecClient:            aztecClient,
		verificationClient:     verificationClient,
		targetContract:         targetContract,
		useVerificationService: verificationClient != nil,
	}
}

// Process processes a VAA from Arbitrum and relays it to Aztec
func (p *ArbitrumProcessor) Process(ctx context.Context, vaaBytes []byte) error {
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
	
	// Send to Aztec
	p.logger.Info("Relaying VAA from Arbitrum to Aztec",
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("sourceTxID", vaaData.TxID))
	
	var txHash string
	
	// Try verification service first if available
	if p.useVerificationService {
		txHash, err = p.verificationClient.VerifyVAA(txCtx, vaaData.RawBytes)
		if err != nil {
			p.logger.Warn("Verification service failed, trying direct PXE",
				zap.Error(err))
			// Fallback to direct PXE call
			txHash, err = p.aztecClient.SendVerifyTransaction(txCtx, p.targetContract, vaaData.RawBytes)
		} else {
			p.logger.Debug("Used verification service successfully")
		}
	} else {
		// Use direct PXE call
		txHash, err = p.aztecClient.SendVerifyTransaction(txCtx, p.targetContract, vaaData.RawBytes)
	}
	
	if err != nil {
		// Check if context was cancelled
		if txCtx.Err() != nil {
			p.logger.Warn("Transaction cancelled or timed out", zap.Error(txCtx.Err()))
			return fmt.Errorf("transaction interrupted: %v", txCtx.Err())
		}
		
		p.logger.Error("Failed to send verify transaction to Aztec",
			zap.Uint64("sequence", vaaData.Sequence),
			zap.String("sourceTxID", vaaData.TxID),
			zap.Error(err))
		return fmt.Errorf("failed to relay to Aztec: %v", err)
	}
	
	p.logger.Info("VAA successfully relayed to Aztec",
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("txHash", txHash),
		zap.String("sourceTxID", vaaData.TxID))
	
	return nil
}

// GetDirection returns the direction of this processor
func (p *ArbitrumProcessor) GetDirection() string {
	return "Arbitrum->Aztec"
}