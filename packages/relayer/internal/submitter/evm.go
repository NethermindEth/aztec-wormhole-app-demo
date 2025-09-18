package submitter

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/clients"
)

// EVMSubmitter handles submission of VAAs to EVM-compatible chains
type EVMSubmitter struct {
	targetContract string
	evmClient      *clients.EVMClient
	logger         *zap.Logger
}

// NewEVMSubmitter creates a new EVM submitter instance
func NewEVMSubmitter(logger *zap.Logger, targetContract string, evmClient *clients.EVMClient) *EVMSubmitter {
	return &EVMSubmitter{
		targetContract: targetContract,
		evmClient:      evmClient,
		logger:         logger.With(zap.String("component", "EVMSubmitter")),
	}
}

// SubmitVAA submits the given VAA bytes to the EVM target contract and returns the transaction hash or an error
func (s *EVMSubmitter) SubmitVAA(ctx context.Context, vaaBytes []byte) (string, error) {
	// Create a context with timeout for submission operations
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	s.logger.Info("Submitting VAA to EVM",
		zap.Int("vaaLength", len(vaaBytes)),
		zap.String("targetContract", s.targetContract),
		zap.String("fromAddress", s.evmClient.GetAddress().Hex()))

	// Direct submission to EVM chain
	s.logger.Debug("Submitting VAA directly to EVM chain")
	txHash, err := s.evmClient.SendVerifyTransaction(ctx, s.targetContract, vaaBytes)
	if err != nil {
		return "", fmt.Errorf("failed to submit VAA to EVM: %w", err)
	}

	s.logger.Info("VAA successfully submitted to EVM",
		zap.String("txHash", txHash),
		zap.String("targetContract", s.targetContract))

	return txHash, nil
}
