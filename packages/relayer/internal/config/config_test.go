package config

import (
	"os"
	"testing"
)

func TestNewAztecRelayerConfig(t *testing.T) {
	// Test with default values
	config := NewAztecRelayerConfig()
	
	if config.Type != RelayerTypeAztec {
		t.Errorf("Expected type %s, got %s", RelayerTypeAztec, config.Type)
	}
	
	if config.SourceChainID != 56 {
		t.Errorf("Expected source chain ID 56, got %d", config.SourceChainID)
	}
	
	if config.DestChainID != 2 {
		t.Errorf("Expected dest chain ID 2, got %d", config.DestChainID)
	}
}

func TestNewArbitrumRelayerConfig(t *testing.T) {
	// Test with default values
	config := NewArbitrumRelayerConfig()
	
	if config.Type != RelayerTypeArbitrum {
		t.Errorf("Expected type %s, got %s", RelayerTypeArbitrum, config.Type)
	}
	
	if config.SourceChainID != 2 {
		t.Errorf("Expected source chain ID 2, got %d", config.SourceChainID)
	}
	
	if config.DestChainID != 56 {
		t.Errorf("Expected dest chain ID 56, got %d", config.DestChainID)
	}
}

func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name      string
		config    *Config
		wantError bool
		errorMsg  string
	}{
		{
			name: "Valid Aztec config",
			config: &Config{
				Type:               RelayerTypeAztec,
				SpyRPCHost:         "localhost:7072",
				SourceChainID:      56,
				DestChainID:        2,
				AztecPXEURL:        "http://localhost:8090",
				AztecWalletAddress: "0x123",
				ArbitrumRPCURL:     "http://localhost:8545",
				PrivateKey:         "0xabc",
				ArbitrumContract:   "0xdef",
			},
			wantError: false,
		},
		{
			name: "Valid Arbitrum config",
			config: &Config{
				Type:           RelayerTypeArbitrum,
				SpyRPCHost:     "localhost:7072",
				SourceChainID:  2,
				DestChainID:    56,
				ArbitrumRPCURL: "http://localhost:8545",
				AztecContract:  "0x123",
			},
			wantError: false,
		},
		{
			name: "Missing SpyRPCHost",
			config: &Config{
				Type:          RelayerTypeAztec,
				SourceChainID: 56,
				DestChainID:   2,
			},
			wantError: true,
			errorMsg:  "SPY_RPC_HOST is required",
		},
		{
			name: "Same source and dest chain",
			config: &Config{
				Type:          RelayerTypeAztec,
				SpyRPCHost:    "localhost:7072",
				SourceChainID: 56,
				DestChainID:   56,
			},
			wantError: true,
			errorMsg:  "source and destination chain IDs must be different",
		},
		{
			name: "Aztec config missing PXE URL",
			config: &Config{
				Type:               RelayerTypeAztec,
				SpyRPCHost:         "localhost:7072",
				SourceChainID:      56,
				DestChainID:        2,
				AztecWalletAddress: "0x123",
				ArbitrumRPCURL:     "http://localhost:8545",
				PrivateKey:         "0xabc",
				ArbitrumContract:   "0xdef",
			},
			wantError: true,
			errorMsg:  "AZTEC_PXE_URL is required for Aztec relayer",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantError {
				if err == nil {
					t.Errorf("Expected error but got none")
				} else if tt.errorMsg != "" && err.Error() != tt.errorMsg {
					t.Errorf("Expected error '%s', got '%s'", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			}
		})
	}
}

func TestGetEnvOrDefault(t *testing.T) {
	// Test with environment variable set
	os.Setenv("TEST_VAR", "test_value")
	defer os.Unsetenv("TEST_VAR")
	
	val := getEnvOrDefault("TEST_VAR", "default")
	if val != "test_value" {
		t.Errorf("Expected 'test_value', got '%s'", val)
	}
	
	// Test with environment variable not set
	val = getEnvOrDefault("NONEXISTENT_VAR", "default")
	if val != "default" {
		t.Errorf("Expected 'default', got '%s'", val)
	}
}

func TestGetEnvIntOrDefault(t *testing.T) {
	// Test with valid integer
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")
	
	val := getEnvIntOrDefault("TEST_INT", 10)
	if val != 42 {
		t.Errorf("Expected 42, got %d", val)
	}
	
	// Test with invalid integer
	os.Setenv("TEST_INVALID_INT", "not_a_number")
	defer os.Unsetenv("TEST_INVALID_INT")
	
	val = getEnvIntOrDefault("TEST_INVALID_INT", 10)
	if val != 10 {
		t.Errorf("Expected default 10, got %d", val)
	}
	
	// Test with environment variable not set
	val = getEnvIntOrDefault("NONEXISTENT_INT", 20)
	if val != 20 {
		t.Errorf("Expected default 20, got %d", val)
	}
}