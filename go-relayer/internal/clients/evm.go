package clients

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"go.uber.org/zap"
)

// EVMClient handles interactions with EVM-compatible blockchains (Arbitrum)
type EVMClient struct {
	client     *ethclient.Client
	privateKey *ecdsa.PrivateKey
	address    common.Address
	logger     *zap.Logger
}

// NewEVMClient creates a new client for EVM-compatible blockchains
func NewEVMClient(logger *zap.Logger, rpcURL, privateKeyHex string) (*EVMClient, error) {
	client := &EVMClient{
		logger: logger.With(zap.String("component", "EVMClient")),
	}

	client.logger.Info("Connecting to EVM chain", zap.String("rpcURL", rpcURL))
	ethClient, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to EVM node: %v", err)
	}

	// Parse private key
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %v", err)
	}

	// Derive public address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("error casting public key to ECDSA")
	}
	address := crypto.PubkeyToAddress(*publicKeyECDSA)

	client.client = ethClient
	client.privateKey = privateKey
	client.address = address

	return client, nil
}

// GetAddress returns the public address for this client
func (c *EVMClient) GetAddress() common.Address {
	return c.address
}

// SendVerifyTransaction sends a transaction to the verify function to process and store a VAA
func (c *EVMClient) SendVerifyTransaction(ctx context.Context, targetContract string, vaaBytes []byte) (string, error) {
	c.logger.Debug("Sending verify transaction to EVM", zap.Int("vaaLength", len(vaaBytes)))

	// Contract ABI for the verify function
	const abiJSON = `[{
        "inputs": [
            {"internalType": "bytes", "name": "encodedVm", "type": "bytes"}
        ],
        "name": "verify",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }]`

	parsedABI, err := abi.JSON(strings.NewReader(abiJSON))
	if err != nil {
		return "", fmt.Errorf("ABI parse error: %v", err)
	}

	// Pack the function call data
	data, err := parsedABI.Pack("verify", vaaBytes)
	if err != nil {
		return "", fmt.Errorf("ABI pack error: %v", err)
	}

	// Get the latest nonce for our account
	nonce, err := c.client.PendingNonceAt(ctx, c.address)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %v", err)
	}

	// Get the current gas price
	gasPrice, err := c.client.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %v", err)
	}

	// Create the transaction
	targetAddr := common.HexToAddress(targetContract)
	tx := types.NewTransaction(
		nonce,
		targetAddr,
		big.NewInt(0), // No ETH being sent
		3000000,       // Gas limit - adjust as needed
		gasPrice,
		data,
	)

	// Get the chain ID
	chainID, err := c.client.NetworkID(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get chain ID: %v", err)
	}

	// Sign the transaction
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), c.privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %v", err)
	}

	// Send the transaction
	err = c.client.SendTransaction(ctx, signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %v", err)
	}

	return signedTx.Hash().Hex(), nil
}
