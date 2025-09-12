package relayer

import (
	"context"
	"fmt"
	"time"
	
	"go.uber.org/zap"
	
	"aztec-relayer/internal/clients"
	"aztec-relayer/internal/config"
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/processor"
)

// ArbitrumRelayer handles relaying from Arbitrum to Aztec
type ArbitrumRelayer struct {
	*BaseRelayer
	aztecClient        clients.AztecClientInterface
	verificationClient clients.VerificationClientInterface
}

// NewArbitrumRelayer creates a new Arbitrum -> Aztec relayer
func NewArbitrumRelayer(cfg *config.Config, log *logger.Logger) (*ArbitrumRelayer, error) {
	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %v", err)
	}
	
	// Create spy client
	spyClient, err := clients.NewSpyClient(cfg.SpyRPCHost, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create spy client: %v", err)
	}
	
	// Create Aztec PXE client
	aztecClient, err := clients.NewAztecPXEClient(cfg.AztecPXEURL, cfg.AztecWalletAddress, log)
	if err != nil {
		spyClient.Close()
		return nil, fmt.Errorf("failed to create Aztec PXE client: %v", err)
	}
	
	// Create verification service client (optional)
	var verificationClient clients.VerificationClientInterface
	if cfg.VerificationServiceURL != "" {
		verificationClient = clients.NewVerificationServiceClient(cfg.VerificationServiceURL, log)
		
		// Test connection to verification service
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := verificationClient.CheckHealth(ctx); err != nil {
			log.Warn("Verification service not available", zap.Error(err))
			verificationClient = nil // Disable verification service
		} else {
			log.Info("Connected to verification service", zap.String("url", cfg.VerificationServiceURL))
		}
	}
	
	// Create processor for Arbitrum -> Aztec
	vaaProcessor := processor.NewArbitrumProcessor(
		cfg.SourceChainID,
		cfg.DestChainID,
		cfg.EmitterAddress,
		aztecClient,
		verificationClient,
		cfg.AztecContract,
		log,
	)
	
	// Create base relayer
	base := NewBaseRelayer(spyClient, vaaProcessor, "Arbitrum->Aztec", log)
	
	relayer := &ArbitrumRelayer{
		BaseRelayer:        base,
		aztecClient:        aztecClient,
		verificationClient: verificationClient,
	}
	
	log.Info("Arbitrum relayer initialized",
		zap.Uint16("sourceChain", cfg.SourceChainID),
		zap.Uint16("destChain", cfg.DestChainID),
		zap.String("aztecWallet", aztecClient.GetWalletAddress()),
		zap.String("targetContract", cfg.AztecContract),
		zap.Bool("verificationServiceEnabled", verificationClient != nil))
	
	return relayer, nil
}

// Start begins the relaying process
func (r *ArbitrumRelayer) Start(ctx context.Context) error {
	r.logger.Info("Starting Arbitrum -> Aztec relayer")
	return r.BaseRelayer.Start(ctx)
}

// Close cleans up resources
func (r *ArbitrumRelayer) Close() {
	r.BaseRelayer.Close()
	if r.aztecClient != nil {
		r.aztecClient.Close()
	}
}