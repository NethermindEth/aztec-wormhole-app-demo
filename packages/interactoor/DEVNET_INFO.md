# Aztec Devnet - Technical Reference

This document contains technical details about the Aztec devnet that this package connects to.

> 💡 **For getting started**, see [QUICKSTART.md](./QUICKSTART.md)  
> 📖 **For full documentation**, see [README.md](./README.md)

## 🌐 Network Details

### Connection
- **URL**: https://devnet.aztec-labs.com
- **Node Version**: 3.0.0-devnet.2
- **Status**: Live 24/7

### Layer 1 (Ethereum Sepolia)
- **Chain ID**: 11155111
- **Network**: Ethereum Sepolia Testnet
- **Rollup Version**: 1667575857

## 📍 Contract Addresses

### L1 Contracts (on Sepolia)

```
Rollup Address:           0xb05f36c9dffa76f0af639385ef44d5560e0160c1
Registry Address:         0x9017a63e26eaf1197c49b4315a9f32a771abeea7
Inbox Address:            0x33631b33f335e249279db08b9b7272c9906c1405
Outbox Address:           0xfe37ceedec5674805fdc3cd5ca8aa6ca656cbfb9
Fee Juice Address:        0xa9144418460188c2b59914e6a7cb01deb1e019d7
Fee Juice Portal:         0xeea84a878a3fd52d14e7820dddb60d35219b9cd9
```

### Protocol Contracts (Aztec L2)

```
Class Registry:           0x0000000000000000000000000000000000000000000000000000000000000003
Instance Registry:        0x0000000000000000000000000000000000000000000000000000000000000002
Fee Juice:                0x0000000000000000000000000000000000000000000000000000000000000005
MultiCall Entrypoint:     0x0000000000000000000000000000000000000000000000000000000000000004
```

## 🔍 How to Query

### Using cURL

```bash
# Get node info
curl -s -X POST \
  --data '{"method":"node_getNodeInfo"}' \
  -H 'Content-Type: application/json' \
  https://devnet.aztec-labs.com | jq

# Get block number
curl -s -X POST \
  --data '{"method":"node_getBlockNumber"}' \
  -H 'Content-Type: application/json' \
  https://devnet.aztec-labs.com | jq
```

### Using Aztec.js

```javascript
import { createAztecNodeClient } from '@aztec/aztec.js/node';

const node = createAztecNodeClient('https://devnet.aztec-labs.com');
const nodeInfo = await node.getNodeInfo();
const blockNumber = await node.getBlockNumber();

console.log('Node Version:', nodeInfo.nodeVersion);
console.log('Current Block:', blockNumber);
```

### Using Test Script

```bash
cd packages/interactoor
pnpm test:connection
```

## 🎯 What You Can Do

### ✅ Available Operations

- Connect to the devnet
- Query network information
- Read public state
- View contract addresses
- Generate account keys
- Calculate deployment addresses
- Simulate transactions

### ⚠️ Requires Funded Account

- Deploy contracts
- Send transactions
- Modify state
- Pay gas fees

## 💰 Getting Fee Juice

Fee Juice is required for transactions on Aztec. To get Fee Juice for the devnet:

1. **Check for Faucet**: Look for devnet faucet (if available)
2. **Ask Community**: Request from other devnet users
3. **Bridge from L1**: Use the Fee Juice Portal (requires Sepolia ETH)

### Fee Juice Portal

- **Address**: 0xeea84a878a3fd52d14e7820dddb60d35219b9cd9
- **Purpose**: Bridge Fee Juice from Sepolia to Aztec
- **Requires**: Sepolia ETH for L1 gas

## 📊 Network Status

Check if the devnet is online:

```bash
curl -s https://devnet.aztec-labs.com && echo "✅ Devnet is online"
```

Get current state:

```bash
curl -s -X POST \
  --data '{"method":"node_getNodeInfo"}' \
  -H 'Content-Type: application/json' \
  https://devnet.aztec-labs.com | jq -r '.result.nodeVersion'
```

## 🔄 Version Compatibility

### Current Versions
- **Devnet Node**: 3.0.0-devnet.2
- **Aztec.js**: devnet tag (maps to 3.0.0-devnet.2)
- **Noir Version**: Compatible with node version

### Checking Versions

```bash
# Check devnet version
curl -s -X POST --data '{"method":"node_getNodeInfo"}' \
  -H 'Content-Type: application/json' \
  https://devnet.aztec-labs.com | jq '.result.nodeVersion'

# Check your package version
cd packages/interactoor
pnpm list @aztec/aztec.js
```

## 🛠️ RPC Methods

Available JSON-RPC methods:

- `node_getNodeInfo` - Get node information
- `node_getBlockNumber` - Get current block number
- `node_getBlock` - Get block by number
- `node_getL1ContractAddresses` - Get L1 contract addresses
- And more...

For full API documentation, see: https://docs.aztec.network

## 🌍 Network Topology

```
┌─────────────────────┐
│  Ethereum Sepolia   │  Layer 1
│  (Chain ID: 11155111)│
└──────────┬──────────┘
           │
           │ Rollup Bridge
           │
┌──────────▼──────────┐
│   Aztec Devnet      │  Layer 2
│  (devnet.aztec-labs)│
│  Version: 3.0.0-devnet.2│
└─────────────────────┘
           │
           │ Your App
           │
┌──────────▼──────────┐
│  @aztec/aztec.js    │  SDK
│  (devnet tag)       │
└─────────────────────┘
```

## 📝 Notes

- **Shared Network**: Multiple users share this devnet
- **No Guarantees**: State may be reset periodically
- **For Testing**: Not suitable for production
- **Rate Limits**: May apply (be respectful)
- **Best Effort**: Availability not guaranteed

## 🔗 Resources

- **Devnet Status**: Check community channels
- **Documentation**: https://docs.aztec.network
- **Discord**: https://discord.gg/aztec
- **Forum**: https://forum.aztec.network

---

**Last Updated**: October 29, 2025
**Devnet Version**: 3.0.0-devnet.2

