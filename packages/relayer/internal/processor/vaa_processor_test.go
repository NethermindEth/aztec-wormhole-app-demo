package processor

import (
	"encoding/hex"
	"testing"
	"time"
	
	vaaLib "github.com/wormhole-foundation/wormhole/sdk/vaa"
	
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/types"
)

// createTestVAA creates a test VAA with specified chain ID
func createTestVAA(chainID uint16, sequence uint64) (*vaaLib.VAA, []byte) {
	vaa := &vaaLib.VAA{
		Version:          1,
		GuardianSetIndex: 0,
		Signatures:       nil,
		Timestamp:        time.Now(),
		Nonce:            0,
		EmitterChain:     vaaLib.ChainID(chainID),
		EmitterAddress:   vaaLib.Address{0x01, 0x02, 0x03},
		Sequence:         sequence,
		ConsistencyLevel: 1,
		Payload:          []byte{0x01, 0x02, 0x03, 0x04}, // Simple test payload
	}
	
	// Marshal the VAA to bytes (simplified for testing)
	bytes, _ := vaa.Marshal()
	return vaa, bytes
}

func TestBaseVAAProcessor_ParseVAA(t *testing.T) {
	log, _ := logger.New()
	processor := NewBaseVAAProcessor(56, 2, "", log)
	
	// Create a test VAA
	testVAA, vaaBytes := createTestVAA(56, 123)
	
	// Parse the VAA
	vaaData, err := processor.ParseVAA(vaaBytes)
	if err != nil {
		t.Fatalf("Failed to parse VAA: %v", err)
	}
	
	// Verify parsed data
	if vaaData.ChainID != 56 {
		t.Errorf("Expected chain ID 56, got %d", vaaData.ChainID)
	}
	
	if vaaData.Sequence != 123 {
		t.Errorf("Expected sequence 123, got %d", vaaData.Sequence)
	}
	
	if len(vaaData.RawBytes) != len(vaaBytes) {
		t.Errorf("Expected raw bytes length %d, got %d", len(vaaBytes), len(vaaData.RawBytes))
	}
	
	// Verify VAA object
	if vaaData.VAA.EmitterChain != testVAA.EmitterChain {
		t.Errorf("Expected emitter chain %d, got %d", testVAA.EmitterChain, vaaData.VAA.EmitterChain)
	}
}

func TestBaseVAAProcessor_ShouldProcess(t *testing.T) {
	log, _ := logger.New()
	
	tests := []struct {
		name             string
		sourceChainID    uint16
		emitterFilter    string
		vaaChainID       uint16
		vaaEmitter       string
		shouldProcess    bool
	}{
		{
			name:          "Correct source chain, no emitter filter",
			sourceChainID: 56,
			emitterFilter: "",
			vaaChainID:    56,
			vaaEmitter:    "any_emitter",
			shouldProcess: true,
		},
		{
			name:          "Wrong source chain",
			sourceChainID: 56,
			emitterFilter: "",
			vaaChainID:    2,
			vaaEmitter:    "any_emitter",
			shouldProcess: false,
		},
		{
			name:          "Correct source chain, matching emitter",
			sourceChainID: 56,
			emitterFilter: "0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad",
			vaaChainID:    56,
			vaaEmitter:    "0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad",
			shouldProcess: true,
		},
		{
			name:          "Correct source chain, wrong emitter",
			sourceChainID: 56,
			emitterFilter: "0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad",
			vaaChainID:    56,
			vaaEmitter:    "different_emitter",
			shouldProcess: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			processor := NewBaseVAAProcessor(tt.sourceChainID, 2, tt.emitterFilter, log)
			
			vaaData := &types.VAAData{
				ChainID:    tt.vaaChainID,
				EmitterHex: tt.vaaEmitter,
			}
			
			result := processor.ShouldProcess(vaaData)
			if result != tt.shouldProcess {
				t.Errorf("Expected shouldProcess=%v, got %v", tt.shouldProcess, result)
			}
		})
	}
}

func TestBaseVAAProcessor_ParseAndLogPayload(t *testing.T) {
	log, _ := logger.New()
	processor := NewBaseVAAProcessor(56, 2, "", log)
	
	// Create a test payload with txID and additional data
	txID := make([]byte, 32)
	copy(txID, []byte("test_transaction_id"))
	
	// Add some additional payload data
	additionalData := make([]byte, 31)
	copy(additionalData, []byte("additional_payload_data"))
	
	payload := append(txID, additionalData...)
	
	// This should not panic
	processor.parseAndLogPayload(payload)
	
	// Test with short payload
	shortPayload := []byte{0x01, 0x02, 0x03}
	processor.parseAndLogPayload(shortPayload) // Should handle gracefully
}

func TestVAADataExtraction(t *testing.T) {
	// Test txID extraction from payload
	txIDHex := "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
	txIDBytes, _ := hex.DecodeString(txIDHex)
	
	// Create payload with txID
	payload := make([]byte, 100)
	copy(payload, txIDBytes)
	
	vaa := &vaaLib.VAA{
		Version:          1,
		GuardianSetIndex: 0,
		Timestamp:        time.Now(),
		EmitterChain:     56,
		EmitterAddress:   vaaLib.Address{0x01, 0x02},
		Sequence:         456,
		ConsistencyLevel: 1,
		Payload:          payload,
	}
	
	vaaBytes, _ := vaa.Marshal()
	
	log, _ := logger.New()
	processor := NewBaseVAAProcessor(56, 2, "", log)
	
	vaaData, err := processor.ParseVAA(vaaBytes)
	if err != nil {
		t.Fatalf("Failed to parse VAA: %v", err)
	}
	
	// Verify txID extraction
	expectedTxID := "0x" + txIDHex
	if vaaData.TxID != expectedTxID {
		t.Errorf("Expected txID %s, got %s", expectedTxID, vaaData.TxID)
	}
}