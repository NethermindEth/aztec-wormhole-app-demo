package cmd

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/clients"
	"github.com/NethermindEth/aztec-wormhole-app-demo/packages/relayer/internal/submitter"
)

// ExampleEVMSubmitterUsage demonstrates how to use the EVMSubmitter
func ExampleEVMSubmitterUsage() {
	// Initialize logger
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	// Configuration
	evmRPCURL := "https://sepolia-rollup.arbitrum.io/rpc"
	privateKey := "YOUR_PRIVATE_KEY_HERE"
	targetContract := "0x248EC2E5595480fF371031698ae3a4099b8dC229"

	// Create EVM client
	evmClient, err := clients.NewEVMClient(logger, evmRPCURL, privateKey)
	if err != nil {
		panic(fmt.Errorf("failed to create EVM client: %v", err))
	}

	// Create EVM submitter
	evmSubmitter := submitter.NewEVMSubmitter(
		logger,
		targetContract,
		evmClient,
	)

	// Example VAA bytes (in real scenario, these would come from Wormhole)
	vaaBytes := []byte{0x01, 0x02, 0x03, 0x04}

	// Submit VAA
	ctx := context.Background()
	txHash, err := evmSubmitter.SubmitVAA(ctx, vaaBytes)
	if err != nil {
		logger.Error("Failed to submit VAA", zap.Error(err))
		return
	}

	logger.Info("VAA submitted successfully", zap.String("txHash", txHash))
}