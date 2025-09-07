# Aztec-Wormhole Cross-Chain Contracts

This package contains Solidity contracts for a **cross-chain proof-of-concept** that enables Aztec to send messages to Arbitrum Sepolia via Wormhole, triggering token donations.

## 🏗️ How It Works

```
Aztec (Chain ID 52) 
    ↓ [VAA via Wormhole]
Arbitrum Sepolia (Chain ID 10003)
    ↓ [Vault processes VAA]
Donation Contract
    ↓ [Mints ProverToken]
Recipient Address
```

1. **Aztec** contract sends cross-chain message via **Wormhole**
2. **Vault contract** on **Arbitrum Sepolia** receives and verifies the VAA (Verified Action Approval)
3. **Donation contract** mints **ProverToken** to a designated recipient

## 📋 Contract Architecture

The contracts use a **layered inheritance pattern** for clean separation of concerns:

```
VaultStorage (storage definitions)
    ↓
VaultState (state management + ownership) 
    ↓  
VaultGetters (view functions + utilities)
    ↓
Vault (main VAA processing logic)

BridgeToken (ERC20 with minting)
    ↓
Donation (donation-specific logic)
```

### Core Contracts

- **`Vault.sol`** - Main contract that processes Wormhole VAAs and triggers donations
- **`Donation.sol`** - Handles token minting when donations are processed
- **`VaultState.sol`** - Base contract managing state and ownership
- **`VaultGetters.sol`** - Provides read-only access to contract state

## 🔒 Security Features

- **Fork Detection** - Prevents operation if copied to wrong network
- **Emitter Authorization** - Only accepts VAAs from registered Aztec contracts  
- **Duplicate Prevention** - Tracks processed transaction IDs to prevent replays
- **Chain Validation** - Uses both Wormhole and EVM chain IDs for verification

## ⚙️ Chain ID Management

The system uses **two different chain ID formats**:

- **Wormhole Chain ID** (`uint16`): Cross-chain protocol identifier
  - Arbitrum Sepolia: `10003`
  - Aztec: `52`

- **EVM Chain ID** (`uint256`): Native blockchain identifier
  - Arbitrum Sepolia: `421614`
  - Local Anvil: `31337`

## 🚀 Deployment

### Prerequisites
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

### Local Deployment (Anvil)
```bash
# Start local node
anvil

# Deploy contracts
forge script script/DeployVault.s.sol:DeployVault \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast
```

### Arbitrum Sepolia Deployment
```bash
forge script script/DeployVault.s.sol:DeployVault \
    --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify
```

**⚠️ Note**: Get testnet ETH from [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

## 🔧 Configuration

### Deployment Settings
- **Wormhole Chain ID**: 10003 (Arbitrum Sepolia)
- **EVM Chain ID**: 421614 (Arbitrum Sepolia) / 31337 (Local)
- **Finality**: 2 block confirmations
- **Token**: ProverToken (PTZK) with 1000 initial supply

### Emitter Registration
The deployment script automatically registers the Aztec emitter for cross-chain communication.

## 🛠️ Development

### Build
```bash
forge build
```

### Test
```bash
forge test
```

### Format
```bash
forge fmt
```

## 🎯 PoC Design Choices

This implementation prioritizes **simplicity** for demonstration:

- **Fixed donation recipient**: Tokens always go to the same address
- **Single token type**: All donations mint the same ERC20 token

## 🔄 Extending This PoC

### Adding Dynamic Recipients
The codebase includes commented examples for sending tokens to addresses specified in the VAA payload:

```solidity
/* 
 * NOTE: Dynamic recipient address extraction (commented out for simplicity)
 * 
 * To make this application more versatile, the VAA payload can include a recipient
 * address that specifies where donation tokens should be sent.
 */
```

To implement:
1. Uncomment address extraction code in `_processPayload()`
2. Modify `IDonation` interface to accept recipient parameter
3. Update `Donation.donate()` to mint to specified address

## ⚠️ Common Issues

**"Invalid fork: expected chainID mismatch"**
- Verify you're on the correct network (Arbitrum Sepolia: 421614)

**"Invalid emitter: source not recognized"**
- Register the Aztec emitter with `registerEmitter()`

**"Already processed"**
- Each Aztec transaction needs a unique transaction ID

## 📚 Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Wormhole Documentation](https://docs.wormhole.com/)
- [Arbitrum Documentation](https://docs.arbitrum.io/)