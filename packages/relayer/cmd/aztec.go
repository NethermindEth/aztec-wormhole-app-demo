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
	// Aztec-specific flags
	aztecChainIDF        = "aztec-chain-id"
	aztecPXEURLF         = "aztec-pxe-url"
	aztecWalletAddressF  = "aztec-wallet-address"
	aztecContractF       = "aztec-contract"
	aztecEmitterAddressF = "aztec-emitter-address"
	
	// Arbitrum-specific flags (as destination)
	arbitrumChainIDF   = "arbitrum-chain-id"
	arbitrumRPCURLF    = "arbitrum-rpc-url"
	arbitrumContractF  = "arbitrum-contract"
	privateKeyF        = "private-key"
)

// aztecCmd represents the aztec relayer command
var aztecCmd = &cobra.Command{
	Use:   "aztec",
	Short: "Run Aztec → Arbitrum relayer",
	Long: `Start the relayer that monitors Aztec network for messages
and relays them to Arbitrum network.

This relayer will:
- Connect to Aztec via PXE
- Monitor for VAAs from the configured Aztec emitter
- Relay valid messages to the Arbitrum target contract`,
	Run: aztecMain,
}

func init() {
	rootCmd.AddCommand(aztecCmd)

	// Aztec chain configuration
	aztecCmd.Flags().Uint16(
		aztecChainIDF,
		56,
		"Aztec chain ID")

	aztecCmd.Flags().String(
		aztecPXEURLF,
		"http://localhost:8090",
		"Aztec PXE URL")

	aztecCmd.Flags().String(
		aztecWalletAddressF,
		"0x1f3933ca4d66e948ace5f8339e5da687993b76ee57bcf65e82596e0fc10a8859",
		"Aztec wallet address")

	aztecCmd.Flags().String(
		aztecContractF,
		"0x0848d2af89dfd7c0e171238f9216399e61e908cd31b0222a920f1bf621a16ed6",
		"Aztec contract address")

	aztecCmd.Flags().String(
		aztecEmitterAddressF,
		"0d6fe810321185c97a0e94200f998bcae787aaddf953a03b14ec5da3b6838bad",
		"Aztec emitter address to monitor")

	// Arbitrum chain configuration (as destination)
	aztecCmd.Flags().Uint16(
		arbitrumChainIDF,
		2,
		"Arbitrum chain ID")

	aztecCmd.Flags().String(
		arbitrumRPCURLF,
		"http://localhost:8545",
		"Arbitrum RPC URL")

	aztecCmd.Flags().String(
		arbitrumContractF,
		"0x009cbB8f91d392856Cb880d67c806Aa731E3d686",
		"Arbitrum target contract address")

	aztecCmd.Flags().String(
		privateKeyF,
		"",
		"Private key for Arbitrum transactions (required)")

	// Mark private key as required
	aztecCmd.MarkFlagRequired(privateKeyF)

	// Bind flags to viper
	if err := viper.BindPFlags(aztecCmd.Flags()); err != nil {
		log.Fatalf("bind flags: %v", err)
	}
}

func aztecMain(cmd *cobra.Command, args []string) {
	PrintBanner()
	ConfigureLogging(cmd, args)
	
	slog.Info("Starting Aztec → Arbitrum relayer")

	// Load configuration from Viper
	cfg := &config.Config{
		Type:          config.RelayerTypeAztec,
		SpyRPCHost:    viper.GetString("spy-rpc-host"),
		SourceChainID: viper.GetUint16(aztecChainIDF),
		DestChainID:   viper.GetUint16(arbitrumChainIDF),
		
		// Aztec configuration (as source)
		AztecPXEURL:        viper.GetString(aztecPXEURLF),
		AztecWalletAddress: viper.GetString(aztecWalletAddressF),
		AztecContract:      viper.GetString(aztecContractF),
		
		// Arbitrum configuration (as destination)
		ArbitrumRPCURL:   viper.GetString(arbitrumRPCURLF),
		ArbitrumContract: viper.GetString(arbitrumContractF),
		PrivateKey:       viper.GetString(privateKeyF),
		
		// Wormhole configuration
		WormholeContract: viper.GetString("wormhole-contract"),
		EmitterAddress:   viper.GetString(aztecEmitterAddressF),
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
		"aztecPXE", cfg.AztecPXEURL,
		"arbitrumRPC", cfg.ArbitrumRPCURL)

	// Create logger with options from flags
	debug := viper.GetBool("debug")
	json := viper.GetBool("json")
	zapLogger, err := logger.NewWithOptions(debug, json)
	if err != nil {
		slog.Error("Failed to create logger", "error", err)
		os.Exit(1)
	}

	// Create relayer
	aztecRelayer, err := relayer.NewAztecRelayer(cfg, zapLogger)
	if err != nil {
		slog.Error("Failed to initialize relayer", "error", err)
		os.Exit(1)
	}
	defer aztecRelayer.Close()

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
	if err := aztecRelayer.Start(ctx); err != nil {
		slog.Error("Relayer stopped with error", "error", err)
		os.Exit(1)
	}

	slog.Info("Aztec relayer shutdown complete")
}

