package config

import (
	"fmt"
)

// RelayerType represents the type of relayer (Aztec or Arbitrum)
type RelayerType string

const (
	RelayerTypeAztec    RelayerType = "aztec"
	RelayerTypeArbitrum RelayerType = "arbitrum"
)

// Config holds all configuration parameters for a relayer
type Config struct {
	// Common configuration
	SpyRPCHost string // Wormhole spy service endpoint
	
	// Chain-specific configuration
	SourceChainID uint16 // Source chain to monitor
	DestChainID   uint16 // Destination chain to relay to
	
	// Aztec configuration
	AztecPXEURL        string // PXE URL for Aztec
	AztecWalletAddress string // Aztec wallet address to use
	AztecContract      string // Contract address on Aztec
	
	// Arbitrum/EVM configuration
	ArbitrumRPCURL   string // RPC URL for Arbitrum
	PrivateKey       string // Private key for Arbitrum transactions
	ArbitrumContract string // Contract address on Arbitrum
	
	// Wormhole configuration
	WormholeContract string // Wormhole core contract address
	EmitterAddress   string // Emitter address to monitor
	
	// Verification service configuration
	VerificationServiceURL string // Verification service URL for Arbitrum->Aztec
	
	// Relayer type
	Type RelayerType
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.SpyRPCHost == "" {
		return fmt.Errorf("spy-rpc-host is required")
	}
	
	if c.SourceChainID == 0 {
		return fmt.Errorf("source chain ID cannot be 0")
	}
	
	if c.DestChainID == 0 {
		return fmt.Errorf("destination chain ID cannot be 0")
	}
	
	if c.SourceChainID == c.DestChainID {
		return fmt.Errorf("source and destination chain IDs must be different")
	}
	
	switch c.Type {
	case RelayerTypeAztec:
		// Validate Aztec as source
		if c.AztecPXEURL == "" {
			return fmt.Errorf("aztec-pxe-url is required for Aztec relayer")
		}
		if c.AztecWalletAddress == "" {
			return fmt.Errorf("aztec-wallet-address is required for Aztec relayer")
		}
		// Validate Arbitrum as destination
		if c.ArbitrumRPCURL == "" {
			return fmt.Errorf("arbitrum-rpc-url is required for Aztec relayer")
		}
		if c.PrivateKey == "" {
			return fmt.Errorf("private-key is required for Aztec relayer")
		}
		if c.ArbitrumContract == "" {
			return fmt.Errorf("arbitrum-contract is required for Aztec relayer")
		}
		
	case RelayerTypeArbitrum:
		// Validate Arbitrum as source
		if c.ArbitrumRPCURL == "" {
			return fmt.Errorf("arbitrum-rpc-url is required for Arbitrum relayer")
		}
		// Validate Aztec as destination
		if c.AztecContract == "" {
			return fmt.Errorf("aztec-contract is required for Arbitrum relayer")
		}
		if c.AztecPXEURL == "" {
			return fmt.Errorf("aztec-pxe-url is required for Arbitrum relayer")
		}
		if c.AztecWalletAddress == "" {
			return fmt.Errorf("aztec-wallet-address is required for Arbitrum relayer")
		}
		// Verification service is optional but recommended
		
	default:
		return fmt.Errorf("unknown relayer type: %s", c.Type)
	}
	
	return nil
}