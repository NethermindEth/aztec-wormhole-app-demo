package relayer

import (
	"context"
	"fmt"
	
	"go.uber.org/zap"
	
	"aztec-relayer/internal/clients"
	"aztec-relayer/internal/config"
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/processor"
)

// AztecRelayer handles relaying from Aztec to Arbitrum
type AztecRelayer struct {
	*BaseRelayer
	evmClient clients.EVMClientInterface
}

// NewAztecRelayer creates a new Aztec -> Arbitrum relayer
func NewAztecRelayer(cfg *config.Config, log *logger.Logger) (*AztecRelayer, error) {
	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %v", err)
	}
	
	// Create spy client
	spyClient, err := clients.NewSpyClient(cfg.SpyRPCHost, log)
	if err != nil {
		return nil, fmt.Errorf("failed to create spy client: %v", err)
	}
	
	// Create EVM client for Arbitrum
	evmClient, err := clients.NewEVMClient(cfg.ArbitrumRPCURL, cfg.PrivateKey, log)
	if err != nil {
		spyClient.Close()
		return nil, fmt.Errorf("failed to create EVM client: %v", err)
	}
	
	// Create processor for Aztec -> Arbitrum
	vaaProcessor := processor.NewAztecProcessor(
		cfg.SourceChainID,
		cfg.DestChainID,
		cfg.EmitterAddress,
		evmClient,
		cfg.ArbitrumContract,
		log,
	)
	
	// Create base relayer
	base := NewBaseRelayer(spyClient, vaaProcessor, "Aztec->Arbitrum", log)
	
	relayer := &AztecRelayer{
		BaseRelayer: base,
		evmClient:   evmClient,
	}
	
	log.Info("Aztec relayer initialized",
		zap.Uint16("sourceChain", cfg.SourceChainID),
		zap.Uint16("destChain", cfg.DestChainID),
		zap.String("arbitrumAddress", evmClient.GetAddress().Hex()),
		zap.String("targetContract", cfg.ArbitrumContract))
	
	return relayer, nil
}

// Start begins the relaying process
func (r *AztecRelayer) Start(ctx context.Context) error {
	r.logger.Info("Starting Aztec -> Arbitrum relayer")
	return r.BaseRelayer.Start(ctx)
}

// Close cleans up resources
func (r *AztecRelayer) Close() {
	r.BaseRelayer.Close()
	if r.evmClient != nil {
		r.evmClient.Close()
	}
}