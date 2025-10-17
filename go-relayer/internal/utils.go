package internal

import (
	"fmt"

	"go.uber.org/zap"
)

// parseAndLogPayload parses and logs payload structure at debug level
func parseAndLogPayload(logger *zap.Logger, payload []byte) {
	const txIDOffset = 32
	const arraySize = 31

	// Log the transaction ID from the first 32 bytes
	if len(payload) >= 32 {
		txIDBytes := payload[:32]
		logger.Debug("Source Transaction ID", zap.String("txID", fmt.Sprintf("0x%x", txIDBytes)))
	}

	// Parse payload arrays (skip the txID)
	for i := txIDOffset; i < len(payload); i += arraySize {
		end := i + arraySize
		if end > len(payload) {
			end = len(payload)
		}

		arrayIndex := (i - txIDOffset) / arraySize
		logger.Debug(fmt.Sprintf("Payload array %d", arrayIndex),
			zap.String("hex", fmt.Sprintf("0x%x", payload[i:end])))

		// Parse specific fields at debug level
		switch arrayIndex {
		case 0:
			if i+20 <= end {
				logger.Debug("Address", zap.String("address", fmt.Sprintf("0x%x", payload[i:i+20])))
			}
		case 1:
			if i+2 <= end {
				chainIDLower := uint16(payload[i])
				chainIDUpper := uint16(payload[i+1])
				chainID := (chainIDUpper << 8) | chainIDLower
				logger.Debug("Chain ID", zap.Uint16("chainID", chainID))
			}
		case 2:
			if i < end {
				amount := uint64(payload[i])
				logger.Debug("Amount", zap.Uint64("amount", amount))
			}
		}
	}
}
