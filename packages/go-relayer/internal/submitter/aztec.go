package submitter

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/NethermindEth/aztec-wormhole-app-demo/go-relayer/internal/clients"
)

type AztecSubmitter struct {
	targetContract     string
	pxeClient          *clients.AztecPXEClient
	verificationClient *clients.VerificationServiceClient
	logger             *zap.Logger
}

func NewAztecSubmitter(logger *zap.Logger, targetContract string, pxeClient *clients.AztecPXEClient, verificationClient *clients.VerificationServiceClient) *AztecSubmitter {
	return &AztecSubmitter{
		targetContract:     targetContract,
		pxeClient:          pxeClient,
		verificationClient: verificationClient,
		logger:             logger.With(zap.String("component", "AztecSubmitter")),
	}
}

func (s *AztecSubmitter) SubmitVAA(ctx context.Context, vaaBytes []byte) (string, error) {
	// Create a context with timeout for submission operations
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second) // Increased timeout for HTTP calls
	defer cancel()

	s.logger.Info("Submitting VAA to Aztec",
		zap.Int("vaaLength", len(vaaBytes)),
		zap.String("targetContract", s.targetContract))

	var txHash string
	var err error

	// MODIFY: Try verification service first, fallback to direct PXE
	if s.verificationClient != nil {
		s.logger.Debug("Trying verification service to submit VAA")
		txHash, err = s.verificationClient.VerifyVAA(ctx, vaaBytes)
	}
	if err != nil {
		s.logger.Warn("Verification service failed, trying direct PXE", zap.Error(err))
		// Fallback to direct PXE call
		err = nil
		txHash, err = s.pxeClient.SendVerifyTransaction(ctx, s.targetContract, vaaBytes)
	} else {
		s.logger.Debug("Used verification service successfully")
	}

	return txHash, err
}
