package cmd

import (
	"context"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"aztec-relayer/internal/config"
	"aztec-relayer/internal/logger"
	"aztec-relayer/internal/relayer"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	// Arbitrum-specific flags (as source)
	arbitrumEmitterAddressF = "arbitrum-emitter-address"
	
	// Verification service flag
	verificationServiceURLF = "verification-service-url"
)

// arbitrumCmd represents the arbitrum relayer command
var arbitrumCmd = &cobra.Command{
	Use:   "arbitrum",
	Short: "Run Arbitrum → Aztec relayer",
	Long: `Start the relayer that monitors Arbitrum network for messages
and relays them to Aztec network.

This relayer will:
- Connect to Arbitrum via RPC
- Monitor for VAAs from the configured Arbitrum emitter
- Relay valid messages to the Aztec target contract via PXE
- Optionally use a verification service for faster processing`,
	Run: arbitrumMain,
}

func init() {
	rootCmd.AddCommand(arbitrumCmd)

	// Arbitrum chain configuration (as source)
	arbitrumCmd.Flags().Uint16(
		arbitrumChainIDF,
		2,
		"Arbitrum chain ID")

	arbitrumCmd.Flags().String(
		arbitrumRPCURLF,
		"http://localhost:8545",
		"Arbitrum RPC URL")

	arbitrumCmd.Flags().String(
		arbitrumContractF,
		"0x009cbB8f91d392856Cb880d67c806Aa731E3d686",
		"Arbitrum contract address")

	arbitrumCmd.Flags().String(
		arbitrumEmitterAddressF,
		"0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad",
		"Arbitrum emitter address to monitor")

	arbitrumCmd.Flags().String(
		privateKeyF,
		"",
		"Private key for Arbitrum transactions")

	// Arbtrum chain configuration (as destination)
	arbitrumCmd.Flags().Uint16(
		aztecChainIDF,
		56,
		"Aztec chain ID")

	arbitrumCmd.Flags().String(
		aztecPXEURLF,
		"http://localhost:8090",
		"Aztec PXE URL")

	arbitrumCmd.Flags().String(
		aztecWalletAddressF,
		"0x1f3933ca4d66e948ace5f8339e5da687993b76ee57bcf65e82596e0fc10a8859",
		"Aztec wallet address")

	arbitrumCmd.Flags().String(
		aztecContractF,
		"0x0848d2af89dfd7c0e171238f9216399e61e908cd31b0222a920f1bf621a16ed6",
		"Aztec target contract address")

	// Verification service configuration
	arbitrumCmd.Flags().String(
		verificationServiceURLF,
		"http://localhost:8080",
		"Verification service URL (optional, for Arbitrum → Aztec)")

	// Bind flags to viper
	if err := viper.BindPFlags(arbitrumCmd.Flags()); err != nil {
		log.Fatalf("bind flags: %v", err)
	}
}

func arbitrumMain(cmd *cobra.Command, args []string) {
	PrintBanner()
	ConfigureLogging(cmd, args)
	
	slog.Info("Starting Arbitrum → Aztec relayer")

	// Load configuration from Viper
	cfg := &config.Config{
		Type:          config.RelayerTypeArbitrum,
		SpyRPCHost:    viper.GetString("spy-rpc-host"),
		SourceChainID: viper.GetUint16(arbitrumChainIDF),
		DestChainID:   viper.GetUint16(aztecChainIDF),
		
		// Arbitrum configuration (as source)
		ArbitrumRPCURL:   viper.GetString(arbitrumRPCURLF),
		ArbitrumContract: viper.GetString(arbitrumContractF),
		PrivateKey:       viper.GetString(privateKeyF),
		
		// Aztec configuration (as destination)
		AztecPXEURL:            viper.GetString(aztecPXEURLF),
		AztecWalletAddress:     viper.GetString(aztecWalletAddressF),
		AztecContract:          viper.GetString(aztecContractF),
		VerificationServiceURL: viper.GetString(verificationServiceURLF),
		
		// Wormhole configuration
		WormholeContract: viper.GetString("wormhole-contract"),
		EmitterAddress:   viper.GetString(arbitrumEmitterAddressF),
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		slog.Error("Invalid configuration", "error", err)
		os.Exit(1)
	}

	slog.Info("Configuration loaded",
		"sourceChain", cfg.SourceChainID,
		"destChain", cfg.DestChainID,
		"spyRPCHost", cfg.SpyRPCHost,
		"arbitrumRPC", cfg.ArbitrumRPCURL,
		"aztecPXE", cfg.AztecPXEURL,
		"verificationService", cfg.VerificationServiceURL)

	// Create logger with options from flags
	debug := viper.GetBool("debug")
	json := viper.GetBool("json")
	zapLogger, err := logger.NewWithOptions(debug, json)
	if err != nil {
		slog.Error("Failed to create logger", "error", err)
		os.Exit(1)
	}

	// Create relayer
	arbitrumRelayer, err := relayer.NewArbitrumRelayer(cfg, zapLogger)
	if err != nil {
		slog.Error("Failed to initialize relayer", "error", err)
		os.Exit(1)
	}
	defer arbitrumRelayer.Close()

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		slog.Info("Received shutdown signal")
		cancel()
	}()

	// Start the relayer
	if err := arbitrumRelayer.Start(ctx); err != nil {
		slog.Error("Relayer stopped with error", "error", err)
		os.Exit(1)
	}

	slog.Info("Arbitrum relayer shutdown complete")
}
