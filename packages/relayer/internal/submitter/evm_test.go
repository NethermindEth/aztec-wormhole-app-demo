package submitter

import (
	"context"
	"testing"

	"go.uber.org/zap"
	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/clients"
)

func TestEVMSubmitterInterface(t *testing.T) {
	// This test verifies that EVMSubmitter implements the VAASubmitter interface
	var _ VAASubmitter = (*EVMSubmitter)(nil)
}

func TestNewEVMSubmitter(t *testing.T) {
	logger := zap.NewNop()

	// Create a mock EVM client (will be nil for this test)
	var evmClient *clients.EVMClient

	targetContract := "0x1234567890123456789012345678901234567890"

	submitter := NewEVMSubmitter(logger, targetContract, evmClient)

	if submitter == nil {
		t.Fatal("NewEVMSubmitter returned nil")
	}

	if submitter.targetContract != targetContract {
		t.Errorf("Expected target contract %s, got %s", targetContract, submitter.targetContract)
	}

	if submitter.evmClient != evmClient {
		t.Error("EVM client not set correctly")
	}

	if submitter.logger == nil {
		t.Error("Logger not set")
	}
}

func TestEVMSubmitterSubmitVAA_NoClients(t *testing.T) {
	logger := zap.NewNop()
	targetContract := "0x1234567890123456789012345678901234567890"

	// Create submitter with nil client
	submitter := NewEVMSubmitter(logger, targetContract, nil)

	ctx := context.Background()
	vaaBytes := []byte("test VAA data")

	// This should panic or fail since evmClient is nil
	// In production code, we should handle this gracefully
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic when calling SubmitVAA with nil evmClient")
		}
	}()

	_, _ = submitter.SubmitVAA(ctx, vaaBytes)
}