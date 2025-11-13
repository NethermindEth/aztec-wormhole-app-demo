# Quick Start - Get Running in 2 Minutes ⚡

Educational playground for learning Aztec.js with the live devnet.

## 🚀 Zero-Config Deploy

```bash
cd packages/interactoor
pnpm install        # Install dependencies
pnpm build          # Compile contract  
pnpm deploy:counter # Deploy everything!
```

**That's it!** No configuration needed - works out of the box with:
- ✅ Default test keys (safe for learning)
- ✅ Automatic account deployment
- ✅ Sponsored FPC (no Fee Juice needed!)

## Test Connection (Optional)

```bash
pnpm test:connection
```

You should see network info and "✅ Connection test successful!"

## Try the Examples

```bash
# Learn step-by-step
node examples/01-connect-sandbox.ts      # Connect to devnet
node examples/02-create-accounts.ts      # Account basics
node examples/03-deploy-contract.ts      # Deployment
node examples/04-send-transactions.ts    # Transactions
node examples/05-simulate-functions.ts   # Reading state
```

Each example is educational and doesn't require a funded account.

## What's Inside

- **Counter Contract** (`contracts/counter/`) - Learn Noir smart contracts
- **6 Examples** (`examples/`) - Progressive tutorials
- **Tests** (`tests/`) - Testing patterns
- **Live Devnet** - Real Aztec network (no local setup!)

## Learning Paths

**Beginner**: Run examples 1-2, read the Counter contract  
**Intermediate**: Run all examples, understand transactions  
**Advanced**: Study Emitter contract, build your own dApp

## Next Steps

- 📖 Read **[README.md](./README.md)** for comprehensive guide
- 🌐 Check **[DEVNET_INFO.md](./DEVNET_INFO.md)** for network details  
- 💬 Join [Aztec Discord](https://discord.gg/aztec) for help

## What Makes This Special

✅ **Zero configuration** - works immediately!  
✅ **No Fee Juice needed** - Sponsored FPC pays fees  
✅ **Live devnet** - Real network (devnet.aztec-labs.com)  
✅ **Latest Aztec.js** - v3.0.0-devnet.2  
✅ **Educational** - Heavily commented code  

## Optional: Custom Keys

Want your own keys instead of defaults?

```bash
pnpm generate:keys  # Generate new keys
# Copy to .env or use as env vars
```

See **[USAGE.md](./USAGE.md)** for full configuration options.

---

**Ready to deploy?** Just run `pnpm deploy:counter` 🚀
