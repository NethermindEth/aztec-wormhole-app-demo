# Aztec Interactoor 🎓

An educational playground for learning **Aztec.js** and smart contract development on the Aztec network. This package connects to the live Aztec devnet and provides hands-on tutorials for developers getting started with privacy-preserving applications.

> 🚀 **New here?** Check [QUICKSTART.md](./QUICKSTART.md) to get running in 2 minutes!

## 🌟 What's Inside

- **📚 6 Progressive Examples**: Step-by-step tutorials covering all Aztec.js fundamentals
- **📝 Counter Contract**: A well-documented Noir contract demonstrating core concepts
- **🧪 Test Suite**: Learn testing patterns for Aztec contracts
- **🌐 Live Devnet**: Connects to real Aztec network (no local setup needed!)
- **📖 Comprehensive Docs**: In-depth explanations and best practices

## 🚀 Quick Start

```bash
# Install and test connection
cd packages/interactoor
pnpm install
pnpm test:connection

# Run examples
node examples/01-connect-sandbox.ts
node examples/02-create-accounts.ts
# ... and more
```

See [QUICKSTART.md](./QUICKSTART.md) for the fastest way to get started.

### Available Commands

```bash
pnpm build              # Compile Counter contract (requires aztec-nargo)
pnpm test:connection    # Test devnet connection
pnpm example:connect    # Run example 1
pnpm example:accounts   # Run example 2
# ... (see package.json for all commands)
```

### Network Information

This package connects to the live Aztec devnet:
- **URL**: https://devnet.aztec-labs.com
- **Version**: 3.0.0-devnet.2
- **L1**: Ethereum Sepolia

See [DEVNET_INFO.md](./DEVNET_INFO.md) for detailed network information and contract addresses.

## 📚 Learning Path

### 1. Understanding Aztec Basics

**Start with**: `test-devnet.mjs` or `examples/01-connect-sandbox.ts`

Learn:
- How to connect to the Aztec devnet
- Querying node information  
- Understanding L1 contracts on Sepolia
- Checking network status

**Key Concepts**:
- **Node Client**: Connection to Aztec devnet
- **Devnet**: Live test network running 24/7
- **L1 Contracts**: Sepolia contracts Aztec uses

### 2. Account Management

**Continue with**: `examples/02-create-accounts.ts`

Learn:
- Creating account keys (secret, salt, signing key)
- Setting up wallets
- Importing pre-deployed test accounts
- Understanding Fee Juice (gas token)

**Key Concepts**:
- **Account Abstraction**: Accounts are smart contracts
- **Fee Juice**: Token used for gas payments
- **Account Deployment**: Requires Fee Juice to deploy

### 3. Contract Deployment

**Progress to**: `examples/03-deploy-contract.ts`

Learn:
- Loading contract artifacts
- Deploying contracts
- Deterministic addresses
- Verifying deployments

**Key Concepts**:
- **Contract Artifacts**: Compiled contract JSON
- **Deployment Transaction**: Special transaction that creates contract
- **Contract Registration**: Adding contract to PXE

### 4. Sending Transactions

**Continue with**: `examples/04-send-transactions.ts`

Learn:
- Calling public functions
- Calling private functions
- Understanding transaction receipts
- Public vs private state

**Key Concepts**:
- **Public Functions**: State visible to all
- **Private Functions**: Encrypted state
- **Transaction Status**: Tracking transaction lifecycle

### 5. Simulating Functions

**Advance to**: `examples/05-simulate-functions.ts`

Learn:
- Reading contract state
- Simulating transactions before sending
- Understanding unconstrained functions
- Performance considerations

**Key Concepts**:
- **Unconstrained Functions**: Read-only, instant execution
- **Simulation**: Test transaction without executing
- **View Functions**: Query state without gas

### 6. Advanced Contracts

**Explore**: `examples/06-use-emitter.ts`

Learn:
- Complex contract interactions
- Multi-contract composition
- Zero-knowledge proof verification
- Cross-chain messaging

## 📝 The Counter Contract

Our educational contract (`contracts/counter/src/main.nr`) demonstrates:

### Public State
```noir
public_count: PublicMutable<u64>  // Visible to everyone
admin: SharedImmutable<AztecAddress>  // Immutable admin address
```

### Private State
```noir
private_counts: Map<AztecAddress, PrivateMutable<u64>>  // Per-user encrypted
```

### Function Types

**Public Functions** (execute on network):
- `increment_public()` - Anyone can increment
- `increment_public_by(amount)` - Admin only
- `reset_public()` - Admin only

**Private Functions** (execute locally, encrypted):
- `increment_private()` - Increment caller's private counter
- `increment_private_by(amount)` - Increment by amount
- `reset_private()` - Reset caller's private counter

**Unconstrained Functions** (read-only):
- `get_public_count()` - Read public counter
- `get_private_count(owner)` - Read private counter
- `get_admin()` - Read admin address

### Example Usage

```typescript
// Deploy
const contract = await Contract.deploy(wallet, artifact, [adminAddress])
  .send().wait();

// Public interaction
await contract.methods.increment_public().send().wait();
const count = await contract.methods.get_public_count().simulate();

// Private interaction
await contract.methods.increment_private().send().wait();
const myCount = await contract.methods
  .get_private_count(myAddress)
  .simulate();
```

## 🧪 Testing

Our test suite (`tests/counter.test.ts`) covers:

- ✅ Contract deployment and initialization
- ✅ Public state modifications
- ✅ Private state per user
- ✅ Access control (admin functions)
- ✅ View functions
- ✅ Simulation vs execution

Run tests:
```bash
pnpm test
```

See `tests/README.md` for testing patterns and best practices.

## 🏗️ Project Structure

```
interactoor/
├── contracts/
│   └── counter/              # Learning contract
│       ├── src/
│       │   └── main.nr       # Counter contract source
│       └── Nargo.toml        # Contract configuration
├── examples/
│   ├── 01-connect-sandbox.ts    # Connecting to network
│   ├── 02-create-accounts.ts    # Account management
│   ├── 03-deploy-contract.ts    # Contract deployment
│   ├── 04-send-transactions.ts  # Sending transactions
│   ├── 05-simulate-functions.ts # Simulating & reading
│   ├── 06-use-emitter.ts        # Advanced contracts
│   └── full-demo.ts             # Complete walkthrough
├── tests/
│   ├── counter.test.ts       # Contract test suite
│   └── README.md             # Testing guide
├── scripts/
│   └── copy-artifacts.mjs    # Build helper
├── src/
│   └── artifacts/            # Compiled contracts (generated)
└── README.md                 # This file
```

## 💡 Key Concepts

### Public vs Private

| Aspect | Public | Private |
|--------|--------|---------|
| **Visibility** | Everyone can see | Encrypted |
| **Execution** | On Aztec network | Local, then proven |
| **Speed** | Slower (network consensus) | Faster locally |
| **Use Case** | Shared state | Personal data |
| **Gas** | Paid in Fee Juice | Paid in Fee Juice |

### Account Abstraction

On Aztec, accounts ARE smart contracts:
- Custom authentication logic
- Flexible signing schemes
- Built-in privacy features
- Programmable accounts

### Zero-Knowledge Proofs

- All computations are proven with ZK proofs
- Private data stays private
- Proofs verified on Ethereum (L1)
- Trustless privacy guarantees

## 🔗 Integration with Monorepo

This package is part of the Aztec-Wormhole demo monorepo:

- **Related Contracts**:
  - `../aztec-contracts/emitter`: ZK Passport credential emitter
  - `../aztec-contracts/wormhole`: Wormhole bridge integration
  
- **Frontend**: `../frontend` uses these contracts for the demo app

- **Testing**: All packages tested together in CI/CD

## 📖 Additional Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 2 minutes
- **[DEVNET_INFO.md](./DEVNET_INFO.md)** - Network details and contract addresses
- **[tests/README.md](./tests/README.md)** - Testing patterns and guides

## 🔗 Resources

**Official Documentation**
- [Aztec Docs](https://docs.aztec.network) - Complete documentation
- [Aztec.js Guide](https://docs.aztec.network/nightly/developers/docs/guides/aztec-js) - JavaScript SDK guide
- [Noir Language](https://noir-lang.org) - Smart contract language

**Community**
- [Discord](https://discord.gg/aztec) - Get help and discuss
- [Forum](https://forum.aztec.network) - Technical discussions
- [GitHub](https://github.com/AztecProtocol/aztec-packages) - Source code
- [Twitter](https://twitter.com/aztecnetwork) - Updates and news

**Learning Resources**
- [Awesome Aztec](https://github.com/AztecProtocol/awesome-aztec) - Curated resources
- [Aztec Starter Kit](https://github.com/AztecProtocol/aztec-starter) - Project templates

## 🎯 Next Steps

After completing these tutorials:

1. **Modify the Counter Contract**
   - Add new features
   - Experiment with different state types
   - Try different access control patterns

2. **Build Your Own Contract**
   - Start with a simple idea
   - Use the Counter as a template
   - Test thoroughly

3. **Explore Advanced Features**
   - Study the Emitter contract
   - Learn about cross-contract calls
   - Understand proof verification
   - Explore Wormhole integration

4. **Join the Community**
   - Share your projects
   - Ask questions
   - Contribute to Aztec

## 🐛 Troubleshooting

### Devnet Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Check your internet connection and verify devnet is online: `curl https://devnet.aztec-labs.com`

### Import Errors
```
Error: ERR_PACKAGE_PATH_NOT_EXPORTED
```
**Solution**: Use explicit imports from `@aztec/aztec.js/*` (see examples)

### Contract Not Found
```
Error: Cannot find module './src/artifacts/Counter.json'
```
**Solution**: Run `pnpm build` to compile contracts

### Out of Fee Juice
```
Error: Insufficient Fee Juice balance
```
**Solution**: 
- Get Fee Juice from devnet faucet (if available)
- Or have another account send you Fee Juice
- For learning, use the educational examples (no transactions needed)

### Slow Transactions
Transactions on devnet can take 30-60 seconds. This is normal for:
- Contract deployment
- First transaction in a session
- Complex private computations

### Package Version Issues
This package uses `devnet` tag to match the live devnet (version 3.0.0-devnet.2).  
See [DEVNET_INFO.md](./DEVNET_INFO.md#version-compatibility) for version checking commands.

## 🤝 Contributing

This is an educational resource! Contributions welcome:

- 📝 Improve documentation
- 🐛 Fix bugs
- ✨ Add new examples
- 🧪 Add more tests
- 💡 Suggest improvements

## 📄 License

See [LICENSE](../../LICENSE) in the repository root.

## 🙏 Acknowledgments

Built for the Aztec-Wormhole integration demo, showcasing:
- Zero-knowledge privacy on Aztec
- Cross-chain messaging with Wormhole
- Privacy-preserving applications

---

**Happy Learning! 🚀**

For questions or help, join the [Aztec Discord](https://discord.gg/aztec) or check out the [documentation](https://docs.aztec.network).

