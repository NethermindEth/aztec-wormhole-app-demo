package processor

import (
	"context"
	"fmt"
	
	vaaLib "github.com/wormhole-foundation/wormhole/sdk/vaa"
	"go.uber.org/zap"
	
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/types"
)

// VAAProcessor defines the interface for processing VAAs
type VAAProcessor interface {
	Process(ctx context.Context, vaaBytes []byte) error
	GetDirection() string
}

// BaseVAAProcessor provides common VAA processing functionality
type BaseVAAProcessor struct {
	sourceChainID uint16
	destChainID   uint16
	emitterFilter string
	logger        *logger.Logger
}

// NewBaseVAAProcessor creates a new base VAA processor
func NewBaseVAAProcessor(sourceChainID, destChainID uint16, emitterFilter string, log *logger.Logger) *BaseVAAProcessor {
	return &BaseVAAProcessor{
		sourceChainID: sourceChainID,
		destChainID:   destChainID,
		emitterFilter: emitterFilter,
		logger:        log,
	}
}

// ParseVAA parses raw VAA bytes into structured data
func (p *BaseVAAProcessor) ParseVAA(vaaBytes []byte) (*types.VAAData, error) {
	// Parse the VAA
	wormholeVAA, err := vaaLib.Unmarshal(vaaBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse VAA: %v", err)
	}
	
	// Extract the txID from the payload (first 32 bytes)
	txID := ""
	if len(wormholeVAA.Payload) >= 32 {
		txIDBytes := wormholeVAA.Payload[:32]
		txID = fmt.Sprintf("0x%x", txIDBytes)
		p.logger.Debug("Extracted txID from payload", zap.String("txID", txID))
	} else {
		p.logger.Debug("Payload too short to contain txID", zap.Int("payload_length", len(wormholeVAA.Payload)))
	}
	
	// Create VAA data with essential information
	vaaData := &types.VAAData{
		VAA:        wormholeVAA,
		RawBytes:   vaaBytes,
		ChainID:    uint16(wormholeVAA.EmitterChain),
		EmitterHex: fmt.Sprintf("%064x", wormholeVAA.EmitterAddress),
		Sequence:   wormholeVAA.Sequence,
		TxID:       txID,
	}
	
	return vaaData, nil
}

// ShouldProcess determines if a VAA should be processed
func (p *BaseVAAProcessor) ShouldProcess(vaaData *types.VAAData) bool {
	// Check if this VAA is from our source chain
	if vaaData.ChainID != p.sourceChainID {
		p.logger.Debug("Skipping VAA - not from source chain",
			zap.Uint16("vaaChain", vaaData.ChainID),
			zap.Uint16("expectedChain", p.sourceChainID))
		return false
	}
	
	// Check emitter filter if configured
	if p.emitterFilter != "" && vaaData.EmitterHex != p.emitterFilter {
		p.logger.Debug("Skipping VAA - emitter mismatch",
			zap.String("vaaEmitter", vaaData.EmitterHex),
			zap.String("expectedEmitter", p.emitterFilter))
		return false
	}
	
	return true
}

// LogVAADetails logs detailed information about a VAA
func (p *BaseVAAProcessor) LogVAADetails(vaaData *types.VAAData) {
	p.logger.Info("Processing VAA",
		zap.Uint16("sourceChain", vaaData.ChainID),
		zap.Uint16("destChain", p.destChainID),
		zap.Uint64("sequence", vaaData.Sequence),
		zap.String("emitter", vaaData.EmitterHex),
		zap.String("sourceTxID", vaaData.TxID),
		zap.Time("timestamp", vaaData.VAA.Timestamp),
		zap.Int("payloadLength", len(vaaData.VAA.Payload)))
	
	// Log payload details at debug level
	p.logger.Debug("VAA Payload", zap.String("payloadHex", fmt.Sprintf("%x", vaaData.VAA.Payload)))
	
	// Parse payload structure at debug level
	if len(vaaData.VAA.Payload) >= 32 {
		p.parseAndLogPayload(vaaData.VAA.Payload)
	}
}

// parseAndLogPayload parses and logs payload structure at debug level
func (p *BaseVAAProcessor) parseAndLogPayload(payload []byte) {
	const txIDOffset = 32
	const arraySize = 31
	
	// Log the transaction ID from the first 32 bytes
	if len(payload) >= 32 {
		txIDBytes := payload[:32]
		p.logger.Debug("Source Transaction ID", zap.String("txID", fmt.Sprintf("0x%x", txIDBytes)))
	}
	
	// Parse payload arrays (skip the txID)
	for i := txIDOffset; i < len(payload); i += arraySize {
		end := i + arraySize
		if end > len(payload) {
			end = len(payload)
		}
		
		arrayIndex := (i - txIDOffset) / arraySize
		p.logger.Debug(fmt.Sprintf("Payload array %d", arrayIndex),
			zap.String("hex", fmt.Sprintf("0x%x", payload[i:end])))
		
		// Parse specific fields at debug level
		switch arrayIndex {
		case 0:
			if i+20 <= end {
				p.logger.Debug("Address", zap.String("address", fmt.Sprintf("0x%x", payload[i:i+20])))
			}
		case 1:
			if i+2 <= end {
				chainIDLower := uint16(payload[i])
				chainIDUpper := uint16(payload[i+1])
				chainID := (chainIDUpper << 8) | chainIDLower
				p.logger.Debug("Chain ID", zap.Uint16("chainID", chainID))
			}
		case 2:
			if i < end {
				amount := uint64(payload[i])
				p.logger.Debug("Amount", zap.Uint64("amount", amount))
			}
		}
	}
}