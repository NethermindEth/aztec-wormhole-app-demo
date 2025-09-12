package types

import (
	vaaLib "github.com/wormhole-foundation/wormhole/sdk/vaa"
)

// VAAData encapsulates a VAA and its metadata
type VAAData struct {
	VAA        *vaaLib.VAA // The parsed VAA
	RawBytes   []byte      // Raw VAA bytes
	ChainID    uint16      // Source chain ID
	EmitterHex string      // Hex-encoded emitter address
	Sequence   uint64      // VAA sequence number
	TxID       string      // Source transaction ID
}

// VerificationRequest represents a VAA verification request
type VerificationRequest struct {
	VAABytes string `json:"vaaBytes"`
}

// VerificationResponse represents a VAA verification response
type VerificationResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"txHash,omitempty"`
	Error   string `json:"error,omitempty"`
}