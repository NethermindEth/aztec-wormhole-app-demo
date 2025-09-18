package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"

	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal"
	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/clients"
	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/submitter"
)

const (
	// Default configuration values for EVM
	DefaultEVMRPCURL         = "https://sepolia-rollup.arbitrum.io/rpc"
	DefaultEVMTargetContract = "0x248EC2E5595480fF371031698ae3a4099b8dC229"
	DefaultSourceChainID     = uint16(10003) // Aztec chain ID
	DefaultDestChainID       = uint16(10003) // Arbitrum Sepolia chain ID
)

// evmCmd represents the command to relay VAAs to EVM chains
var evmCmd = &cobra.Command{
	Use:   "evm",
	Short: "Relay Wormhole VAAs from Aztec to EVM chains",
	Long: `Listens for Wormhole VAAs from Aztec and relays them to EVM chains.

This command monitors the Wormhole network for messages from Aztec
and submits them to the specified EVM chain (e.g., Arbitrum).`,
	PreRun: func(cmd *cobra.Command, args []string) {
		printBanner()
		configureLogging(cmd, args)
	},
	RunE: runEVMRelay,
}

func init() {
	rootCmd.AddCommand(evmCmd)

	// EVM-specific flags
	evmCmd.Flags().String(
		"evm-rpc-url",
		DefaultEVMRPCURL,
		"RPC URL for EVM chain (e.g., Arbitrum)")

	evmCmd.Flags().String(
		"private-key",
		"",
		"Private key for EVM transactions (required)")

	evmCmd.Flags().String(
		"evm-target-contract",
		DefaultEVMTargetContract,
		"Target contract on EVM chain to send VAAs to")

	evmCmd.PersistentFlags().Uint16(
		"chain-id",
		DefaultDestChainID,
		"Destination EVM chain ID")

	// Mark private key as required
	evmCmd.MarkFlagRequired("private-key")

	// Bind flags to viper
	viper.BindPFlag("evm_rpc_url", evmCmd.Flags().Lookup("evm-rpc-url"))
	viper.BindPFlag("private_key", evmCmd.Flags().Lookup("private-key"))
	viper.BindPFlag("evm_target_contract", evmCmd.Flags().Lookup("evm-target-contract"))
	viper.BindPFlag("chain_id", evmCmd.PersistentFlags().Lookup("chain-id"))
}

type EVMConfig struct {
	SpyRPCHost       string // Wormhole spy service endpoint
	ChainID          uint16 // Destination EVM chain ID
	EVMRPCURL        string // RPC URL for EVM chain
	PrivateKey       string // Private key for EVM transactions
	EVMTargetContract string // Target contract on EVM
}

func runEVMRelay(cmd *cobra.Command, args []string) error {
	logger := configureLogging(cmd, args)
	logger.Info("Starting EVM relayer (Aztec -> EVM)")

	config := EVMConfig{
		SpyRPCHost:        viper.GetString("spy_rpc_host"),
		ChainID:           uint16(viper.GetInt("chain_id")),
		EVMRPCURL:         viper.GetString("evm_rpc_url"),
		PrivateKey:        viper.GetString("private_key"),
		EVMTargetContract: viper.GetString("evm_target_contract"),
	}

	// Validate private key is provided
	if config.PrivateKey == "" {
		return fmt.Errorf("private key is required for EVM transactions")
	}

	logger.Info("Configuration",
		zap.String("spyRPC", config.SpyRPCHost),
		zap.Uint16("chainId", config.ChainID),
		zap.String("evmRPC", config.EVMRPCURL),
		zap.String("evmTarget", config.EVMTargetContract))

	// Create spy client
	spyClient, err := clients.NewSpyClient(logger, config.SpyRPCHost)
	if err != nil {
		return fmt.Errorf("failed to create spy client: %v", err)
	}

	// Create EVM client
	evmClient, err := clients.NewEVMClient(logger, config.EVMRPCURL, config.PrivateKey)
	if err != nil {
		return fmt.Errorf("failed to create EVM client: %v", err)
	}

	logger.Info("Connected to EVM",
		zap.String("address", evmClient.GetAddress().Hex()))

	// Create EVM submitter
	evmSubmitter := submitter.NewEVMSubmitter(logger, config.EVMTargetContract, evmClient)

	// Create VAA processor
	vaaProcessor := internal.NewDefaultVAAProcessor(logger,
		internal.VAAProcessorConfig{ChainID: config.ChainID},
		evmSubmitter)

	// Create and start relayer
	relayer, err := internal.NewRelayer(logger, spyClient, vaaProcessor)
	if err != nil {
		return fmt.Errorf("failed to initialize relayer: %v", err)
	}
	defer relayer.Close()

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		logger.Info("Received shutdown signal")
		cancel()
	}()

	// Start the relayer
	if err := relayer.Start(ctx); err != nil {
		return fmt.Errorf("relayer stopped with error: %v", err)
	}

	return nil
}