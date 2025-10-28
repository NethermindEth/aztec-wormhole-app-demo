# Verified Donation Platform - Frontend

This is the frontend application for the **Aztec-Wormhole Verified Donation Platform** demo, showcasing the integration of zero-knowledge identity proofs with secure cross-chain transfers.

## Overview

This Next.js application demonstrates a complete donation flow that combines:
- **ZKPassport SDK** for privacy-preserving identity verification
- **Aztec Network** for private smart contract execution
- **Wormhole** for secure cross-chain messaging
- **Arbitrum** for EVM compatibility

## Features

- 🔐 **Zero-Knowledge Identity Verification**: Users prove their identity (age, citizenship, document type) without revealing personal data
- 💝 **Verified Donations**: Make donations with cryptographic proof of identity
- 🌉 **Cross-Chain Transfers**: Bridge tokens from Aztec to Arbitrum using Wormhole protocol
- 📱 **QR Code Verification**: Scan QR codes with the ZKPassport mobile app for identity verification
- ✅ **Real-time Confirmation**: Track donation status and cross-chain transfer confirmation

## Getting Started

### Prerequisites

- Node.js >= 20.9.0
- Access to an Aztec PXE endpoint (default: `http://localhost:8090`)
- ZKPassport mobile app for identity verification

### Installation

From the root of the monorepo:

```bash
npm install
```

Or install this package individually:

```bash
cd packages/frontend
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

## Next.js App Structure

This application uses Next.js 16 with the App Router and a proper separation of server and client components:

- **Server components** handle static metadata and app structure
- **Client components** manage state, user interactions, and network communications (ZKPassport SDK, Aztec.js)

This architecture ensures optimal performance and SEO while still providing a rich interactive experience.

## How It Works

1. **User enters donation amount** (1-254 tokens)
2. **QR code is generated** for identity verification
3. **User scans QR code** with ZKPassport mobile app
4. **Zero-knowledge proofs are generated** proving identity attributes without revealing personal data
5. **Donation transaction is submitted** to Aztec network with ZK proofs
6. **Wormhole bridges the message** to Arbitrum
7. **Donation is confirmed** on the destination chain

## Configuration

### Environment Variables

The frontend may require the following environment variables:

```bash
NEXT_PUBLIC_PXE_URL=http://localhost:8090  # Aztec PXE endpoint
NEXT_PUBLIC_POLLING_INTERVAL=5000          # Polling interval for donation confirmation (ms)
```

### Contract Artifacts

The frontend uses compiled Aztec contract artifacts from:
- `app/artifacts/emitter-ZKPassportCredentialEmitter.json`
- `app/artifacts/wormhole_contracts-Wormhole.json`

These are automatically generated when building the Aztec contracts in `packages/aztec-contracts/`.

### Contract Addresses

Contract addresses are configured in `app/assets/addresses.json` and are used by the deployment and messaging scripts.

## Technology Stack

- **Next.js 16** (React 19) with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Aztec.js 2.0.3** for Aztec network interaction
- **ZKPassport SDK 0.10.0** for identity verification
- **Viem** for Ethereum interactions

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Aztec Documentation](https://docs.aztec.network/)
- [ZKPassport Documentation](https://zkpassport.id/)
- [Wormhole Documentation](https://docs.wormhole.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## Part of Monorepo

This frontend is part of the Aztec-Wormhole-ZKPassport monorepo. See the [main README](../../README.md) for the complete project documentation and setup instructions.
