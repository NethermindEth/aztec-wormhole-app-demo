package internal

import (
	"context"
	"fmt"
	"time"

	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/submitter"
	"go.uber.org/zap"
)

type VAAProcessor interface {
	// ProcessVAA processes the given VAA bytes and returns the transaction hash or an error
	ProcessVAA(ctx context.Context, vaaData VAAData) (string, error)
}

type VAAProcessorConfig struct {
	ChainID uint16
}

type DefaultVAAProcessor struct {
	config    VAAProcessorConfig
	logger    *zap.Logger
	submitter submitter.VAASubmitter
}

func NewDefaultVAAProcessor(logger *zap.Logger, config VAAProcessorConfig, submitter submitter.VAASubmitter) *DefaultVAAProcessor {
	return &DefaultVAAProcessor{
		config:    config,
		logger:    logger.With(zap.String("component", "DefaultVAAProcessor")),
		submitter: submitter,
	}
}

func (p *DefaultVAAProcessor) ProcessVAA(ctx context.Context, vaaData VAAData) (string, error) {
	// Create a context with timeout for processing operations
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second) // Increased timeout for HTTP calls
	defer cancel()

	// Log essential VAA information at debug level
	p.logger.Debug("VAA Details",
		zap.Uint16("emitterChain", vaaData.ChainID),
		zap.String("emitterAddress", vaaData.EmitterHex),
		zap.Uint64("sequence", vaaData.Sequence),
		zap.Time("timestamp", vaaData.VAA.Timestamp),
		zap.Int("payloadLength", len(vaaData.VAA.Payload)),
		zap.String("sourceTxID", vaaData.TxID))

	// Extract and log key payload information at debug level
	p.logger.Debug("VAA Payload", zap.String("payloadHex", fmt.Sprintf("%x", vaaData.VAA.Payload)))

	// Parse payload structure at debug level
	if len(vaaData.VAA.Payload) >= 32 {
		parseAndLogPayload(p.logger, vaaData.VAA.Payload)
	}

	var txHash string
	var err error
	var direction string

	// Check if this is a VAA from Aztec (source chain) -> send to Arbitrum
	if vaaData.ChainID == p.config.ChainID {
		p.submitter.SubmitVAA(ctx, vaaData.RawBytes)
	} else {
		// Skip VAAs not from our configured chains
		p.logger.Debug("Skipping VAA (not from configured chains)",
			zap.Uint64("sequence", vaaData.Sequence),
			zap.Uint16("chain", vaaData.ChainID))
		return "", nil
	}

	if err != nil {
		// Check if the context was cancelled or timed out
		if ctx.Err() != nil {
			p.logger.Warn("Transaction sending cancelled or timed out", zap.Error(ctx.Err()))
			return "", fmt.Errorf("transaction interrupted: %v", ctx.Err())
		}

		p.logger.Error("Failed to send verify transaction",
			zap.String("direction", direction),
			zap.Uint64("sequence", vaaData.Sequence),
			zap.String("sourceTxID", vaaData.TxID),
			zap.Error(err))
		return "", fmt.Errorf("transaction failed: %v", err)
	}

	p.logger.Info("VAA verification completed",
		zap.String("direction", direction),
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("txHash", txHash),
		zap.String("sourceTxID", vaaData.TxID))

	return "", nil
}
