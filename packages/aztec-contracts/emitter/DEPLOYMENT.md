# Aztec ZKPassport Credential Emitter Deployment Guide

This guide walks through deploying the ZKPassport Credential Emitter contract on the Aztec testnet.

## Prerequisites

- Aztec CLI tools installed
- Access to Aztec testnet
- Basic understanding of Aztec wallet operations

## Contract Overview

The `ZKPassportCredentialEmitter` contract verifies ZK passport proofs and publishes cross-chain messages via Wormhole. Unlike other contracts that require initialization parameters, this contract is stateless and can be deployed without constructor arguments.

## Environment Setup

### 1. Set Environment Variables

```bash
# Testnet configuration
export NODE_URL=https://aztec-alpha-testnet-fullnode.zkv.xyz
export SPONSORED_FPC_ADDRESS=0x19b5539ca1b104d4c3705de94e4555c9630def411f025e023a13189d0c56f8f22

# Owner private key
export OWNER_SK=<private_key>
```

## Wallet Setup

### 2. Create Owner Wallet

```bash
aztec-wallet create-account \
    -sk $OWNER_SK \
    --register-only \
    --node-url $NODE_URL \
    --alias owner-wallet
```

**Note**: The owner wallet will be used to deploy the contract.

## FPC Registration

### 3. Register Owner Wallet with FPC

```bash
aztec-wallet register-contract \
    --node-url $NODE_URL \
    --from owner-wallet \
    --alias sponsoredfpc \
    $SPONSORED_FPC_ADDRESS SponsoredFPC \
    --salt 0
```

## Account Deployment

### 4. Deploy Owner Account

> **Note**: You may encounter `Timeout awaiting isMined` errors due to network congestion, but this is normal. Continue with the next step once the transaction is verified on Aztecscan.

```bash
aztec-wallet deploy-account \
    --node-url $NODE_URL \
    --from owner-wallet \
    --payment method=fpc-sponsored,fpc=contracts:sponsoredfpc
```

## Contract Compilation and Deployment

### 5. Compile the Emitter Contract

Ensure the contract is compiled before deployment:

```bash
# Navigate to the emitter contract directory if not already there
cd packages/aztec-contracts/emitter

# Compile the contract
aztec-nargo compile
```

### 6. Deploy ZKPassport Credential Emitter Contract

```bash
aztec-wallet deploy \
    --node-url $NODE_URL \
    --from accounts:owner-wallet \
    --payment method=fpc-sponsored,fpc=contracts:sponsoredfpc \
    --alias emitter \
    target/emitter-ZKPassportCredentialEmitter.json \
    --no-init \
    --no-wait
```

**Important**: 
- The `--no-init` flag is required because this contract has no constructor or initializer function
- Wait for the transaction to be mined. You can check the transaction status at [AztecScan](http://aztecscan.xyz/)

### 7. Capture Emitter Contract Address

```bash
# Set the emitter contract address (extract from step 6 deployment logs)
export EMITTER_CONTRACT_ADDRESS=<emitter_contract_address_from_step_6>
```

#### Optional: Update addresses.json

If you maintain an addresses configuration file:

```bash
# Update the addresses.json file with the new emitter address
jq --arg emitter "$EMITTER_CONTRACT_ADDRESS" '.emitter = $emitter' addresses.json > addresses.json.tmp && mv addresses.json.tmp addresses.json
```

## Contract Usage

### Understanding the Contract Interface

The emitter contract provides a single public function:

```noir
pub fn verify_and_publish(
    contractProofData: ContractProofData,
    msg: [[u8;31];7], // Format: [zkDonation Arb Address, Arb chain ID, msg1, msg2, msg3, msg4, msg5]
    wormhole_address: AztecAddress,
    token_address: AztecAddress,
    amount: u128,
    nonce: Field
)
```

### Function Parameters

- `contractProofData`: ZK passport proof data containing verification keys, proofs, and public inputs
- `msg`: Message payload for cross-chain communication (7 fields of 31 bytes each)
- `wormhole_address`: Address of the deployed Wormhole contract (passed at runtime)
- `token_address`: Address of the token contract for donations (passed at runtime)
- `amount`: Amount of tokens to transfer in the donation
- `nonce`: Unique nonce for the transaction

### Key Features

1. **ZK Proof Verification**: Verifies 6 different ZK passport proofs (proofs a-f) with varying public input counts
2. **Token Transfer**: Performs private token transfer to a hardcoded bridge address
3. **Cross-chain Messaging**: Publishes message via Wormhole for cross-chain communication

### Important Notes

- The contract contains a hardcoded bridge address where deposited tokens will be locked in escrow - update this as needed
- External contract addresses (Wormhole and Token) are passed as function parameters, not stored in contract state
- All operations happen in a single transaction call

## Verification

After deployment, verify that:
- The contract is deployed successfully
- The transaction is confirmed on AztecScan
- The contract address is accessible for function calls

## Dependencies

The emitter contract depends on:
- **Wormhole Contract**: For cross-chain message publishing
- **Token Contract**: To pay fees to the Wormhole Contract
- **Bridge Contract**: Hardcoded recipient address for token transfers

Ensure these contracts are deployed and their addresses are available when calling the `verify_and_publish` function.

## Troubleshooting

### Common Deployment Errors

- **"Constructor method constructor not found in contract artifact"**: This contract has no constructor - use the `--no-init` flag in the deploy command
- **"Contract not found" errors**: Ensure you've compiled the contract with `aztec-nargo compile` first
- **"Invalid artifact path" errors**: Verify the path `target/emitter-ZKPassportCredentialEmitter.json` exists after compilation
- **"Account not found" errors**: Make sure the owner wallet has been created and deployed successfully
- **"Insufficient funds" errors**: Ensure the owner account has been registered with the sponsored FPC

### Network and Transaction Issues

- **Timeout errors**: These are common on testnet due to network congestion and usually resolve themselves
- **Transaction failures**: Check AztecScan for detailed error messages and transaction status
- **Network issues**: Ensure you're connected to the correct testnet node URL
- **FPC registration failures**: Try re-registering with the sponsored FPC if deployment fails

### Contract-Specific Issues

- **Compilation errors**: Ensure all dependencies are properly resolved in `Nargo.toml`
- **Wrong contract artifact**: Make sure you're deploying the correct JSON artifact file
- **CLI vs SDK differences**: The CLI deployment method differs from the JavaScript SDK used in `deploy.mjs` - follow this guide for CLI deployment

## Security Considerations

- The hardcoded bridge address should be verified and updated for production use
- Ensure proper validation of ZK proof data before calling the contract
- Verify Wormhole and token contract addresses before function calls
