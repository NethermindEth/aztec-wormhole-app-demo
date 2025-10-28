# Aztec-Wormhole-ZkPassport Demo

A **Verified Donation Platform** demonstrating the integration of zero-knowledge identity proofs with secure cross-chain transfers.

This monorepo combines:
- **ZKPassport SDK** for privacy-preserving identity verification
- **Aztec Network** for private smart contract execution
- **Wormhole** for secure cross-chain messaging
- **Arbitrum** for EVM compatibility

## 🏗️ Architecture

The application enables users to make donations with verified identity proofs (age, citizenship, etc.) without revealing personal information. The donation flow involves:

1. **Identity Verification**: Users prove their identity using ZKPassport (passport/ID verification)
2. **Zero-Knowledge Proofs**: Generate cryptographic proofs without revealing personal data
3. **Cross-Chain Transfer**: Bridge tokens from Arbitrum to Aztec using Wormhole
4. **Private Execution**: Process donations on Aztec with full privacy

## 📦 Monorepo Structure

This project uses **Turborepo** for efficient monorepo management:

```
aztec-wormhole-app-demo/
├── packages/
│   ├── frontend/                    # Next.js web application
│   │   └── app/
│   │       ├── artifacts/           # Compiled Aztec contract artifacts (auto-generated)
│   │       ├── scripts/             # Contract deployment & interaction scripts
│   │       └── assets/              # Contract addresses & configuration
│   ├── aztec-contracts/             # Noir smart contracts for Aztec
│   │   ├── emitter/                 # ZKPassport credential emitter contract
│   │   ├── wormhole/                # Wormhole protocol implementation
│   │   └── wormhole-source/         # Git submodule (NethermindEth/wormhole)
│   ├── evm-contracts/               # Solidity contracts (Foundry)
│   │   ├── src/                     # Contract sources (Vault, Donation, BridgeToken)
│   │   └── script/                  # Deployment scripts
│   └── relayer/                     # Go-based bidirectional Aztec-Arbitrum relayer
├── package.json                     # Root workspace configuration
└── turbo.json                       # Turborepo configuration
```

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version `>=20.9.0` (required by Next.js 16)
  ```bash
  # Check your Node version
  node --version
  
  # Using nvm (recommended)
  nvm install 20
  nvm use 20
  ```

- **npm**: Version `>=10.0.0` (comes with Node.js 20+)

- **Aztec Nargo**: For compiling Aztec contracts (optional if using pre-built artifacts)
  ```bash
  # Install Aztec
  bash -i <(curl -s https://install.aztec.network)
  ```
  See [Aztec Installation Guide](https://docs.aztec.network/getting-started) for details.

- **Go**: For running the relayer (optional if you only want to run the frontend)

- **Foundry**: For EVM contract development (optional)

## 📥 Installation

1. **Clone the repository with submodules**
   ```bash
   git clone --recurse-submodules <repository-url>
   cd aztec-wormhole-app-demo
   ```

   **Already cloned without submodules?** Initialize them:
   ```bash
   git submodule update --init --recursive
   ```

   > **Note:** This project uses Git submodules for Wormhole protocol implementations:
   > - `packages/evm-contracts/lib/wormhole` - For Solidity contract dependencies
   > - `packages/aztec-contracts/wormhole-source` - For Aztec/Noir contract sources (aztec branch)
   >
   > The `--recurse-submodules` flag ensures all dependencies are properly initialized.

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install dependencies for all packages in the monorepo.

## 🛠️ Development

### Running All Packages

To start all development servers in parallel:

```bash
npm run dev
```

This will start:
- **Frontend** at `http://localhost:3000`
- **Relayer** service (if configured)
- Any other configured services

### Running Specific Packages

To run only the frontend:

```bash
cd packages/frontend
npm run dev
```

Or using Turborepo filters:

```bash
npx turbo run dev --filter=zkpassport-sdk-example
```

### Building

Build all packages:

```bash
npm run build
```

Build specific package:

```bash
cd packages/frontend
npm run build
```

## 📚 Package Details

### Frontend (`packages/frontend`)

**Technology Stack:**
- **Next.js 16** (React 19) with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Aztec.js 2.0.3** for Aztec network interaction
- **ZKPassport SDK 0.10.0** for identity verification

**Key Dependencies:**
```json
{
  "@aztec/accounts": "2.0.3",
  "@aztec/aztec.js": "2.0.3",
  "@aztec/noir-contracts.js": "2.0.3",
  "@zkpassport/sdk": "0.10.0",
  "@zkpassport/utils": "0.25.3"
}
```

**Features:**
- QR code generation for mobile identity verification
- Real-time proof generation status
- Cross-chain donation tracking
- Beautiful, responsive UI

**Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Aztec Contracts (`packages/aztec-contracts/`)

**Technology Stack:**
- **Noir** programming language
- **Aztec Nargo** compiler
- **Aztec SDK** for contract deployment

This package contains two Noir smart contracts for the Aztec network:

#### 1. Emitter Contract (`packages/aztec-contracts/emitter`)
The `ZKPassportCredentialEmitter` contract for managing verified credentials on Aztec.

#### 2. Wormhole Contract (`packages/aztec-contracts/wormhole`)
The Aztec implementation of the Wormhole protocol for cross-chain messaging. Sources are symlinked from the `wormhole-source` git submodule (NethermindEth/wormhole, aztec branch).

#### Artifact Generation

Both contracts follow the same build pipeline:

1. **Compilation**: Contracts are compiled using `aztec-nargo compile`
2. **Artifact Output**: Compiled JSON artifacts are generated in each contract's `target/` directory
3. **Auto-Copy**: A post-build script automatically copies artifacts to `packages/frontend/app/artifacts/`

**Build Process:**

```bash
# Build all Aztec contracts (via Turborepo)
npm run build

# Or build individually
cd packages/aztec-contracts/emitter
npm run build  # Compiles and copies emitter-ZKPassportCredentialEmitter.json

cd packages/aztec-contracts/wormhole
npm run build  # Compiles and copies wormhole_contracts-Wormhole.json
```

**Generated Artifacts:**
- `packages/frontend/app/artifacts/emitter-ZKPassportCredentialEmitter.json`
- `packages/frontend/app/artifacts/wormhole_contracts-Wormhole.json`

These artifacts are imported by the frontend scripts (`deploy.mjs`, `send-message.mjs`) for contract interaction.

**Note:** The artifacts are auto-generated and should not be manually edited. To update them, modify the Noir source code and rebuild.

### EVM Contracts (`packages/evm-contracts`)

**Technology Stack:**
- **Solidity** smart contracts
- **Foundry** for development and testing
- **OpenZeppelin** contracts for security

**Contracts:**
- `Vault.sol` - Main vault contract for cross-chain operations
- `Donation.sol` - Donation handling logic
- `BridgeToken.sol` - Token bridging functionality

**Scripts:**
- Deploy script using Foundry in `script/DeployVault.s.sol`

### Relayer (`packages/relayer`)

**Technology Stack:**
- **Go** for high-performance message relaying
- Connects to Aztec PXE and Arbitrum RPC
- Monitors Wormhole spy service

Handles bidirectional message passing between Aztec and Arbitrum networks.

## 🔧 Configuration

### Environment Variables

Copy the example environment file and configure:

```bash
cp env.example .env
```

Key environment variables (see `env.example` for full list):
- Aztec network configuration
- Arbitrum RPC endpoints
- Contract addresses
- Wormhole settings

### Frontend Configuration

The frontend may require additional configuration in `packages/frontend`:
- Aztec PXE endpoint
- ZKPassport service configuration
- API endpoints

## 🧪 Testing

The application has been tested with:
- ✅ TypeScript compilation
- ✅ ESLint validation
- ✅ Production build generation
- ✅ Runtime functionality (form validation, UI rendering)

## 📖 Additional Resources

- [Aztec Documentation](https://docs.aztec.network/)
- [ZKPassport Documentation](https://zkpassport.id/)
- [Wormhole Documentation](https://docs.wormhole.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 🐛 Troubleshooting

### Missing Submodules Error

**Error:** `Cannot find module 'wormhole/ethereum/contracts/...'` or compilation failures in contracts

**Cause:** Wormhole submodules weren't initialized during clone.

**Solution:**
```bash
git submodule update --init --recursive
```

**For EVM contracts**, rebuild after initializing submodules:
```bash
cd packages/evm-contracts
forge build
```

**For Aztec contracts**, the Wormhole contract sources are symlinked from the `wormhole-source` submodule. If you see broken symlinks or compilation errors:
```bash
# Ensure submodules are initialized
git submodule update --init --recursive

# Rebuild Aztec contracts
cd packages/aztec-contracts/wormhole
npm run build
```

### Node.js Version Error

**Error:** `You are using Node.js X.X.X. For Next.js, Node.js version ">=20.9.0" is required.`

**Solution:** Upgrade to Node.js 20 or higher:
```bash
nvm install 20
nvm use 20
```

### Multiple Lockfiles Warning

**Warning:** Next.js detects multiple `package-lock.json` files

**Solution:** This is expected in a monorepo. You can ignore this warning or configure `turbopack.root` in `next.config.ts`.

### Port Already in Use

**Error:** Port 3000 is already in use

**Solution:** Kill the existing process or use a different port:
```bash
# Kill process on port 3000
pkill -f "next dev"

# Or start on a different port
PORT=3001 npm run dev
```

## 🤝 Contributing

This is a demo application showcasing the integration of multiple Web3 technologies. For contributions or questions, please refer to the individual package documentation.

## 📄 License

See [LICENSE](LICENSE) file for details.
