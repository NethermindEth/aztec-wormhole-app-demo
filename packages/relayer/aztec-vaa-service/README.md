# Aztec VAA Verification Service *(soon to be renamed)*

The **VAA Verification Service** is a JavaScript REST server that links an EVM-side relayer to Aztec. It demonstrates how to take a cross-chain message (a Wormhole VAA in this example), validate it, and dispatch an Aztec transaction. While the sample implementation verifies a VAA directly, the pattern applies to any Aztec contract call: your contract can invoke [`verify_vaa`](../../aztec/contracts/src/main.nr) before executing application-specific logic to ensure cross-chain safety.

> ℹ️ **Heads-up:** this service will be renamed to “aztec-vaa-processing-service” in a future refactor. Everything below refers to the current verification service name.

---

## Features

- Boots a PXE instance and connects to the Aztec devnet/testnet node.
- Registers the target Aztec contract and Schnorr account wallet.
- Exposes REST endpoints for health checks, generic VAA verification, and a canned `/test` flow using a known Arbitrum Sepolia VAA.
- Demonstrates how to send transactions via Aztec after cross-chain message validation.

---

## Prerequisites

1. **Node.js 18+** (the scripts assume an up-to-date Node runtime).
2. **Dependencies installed** with `npm install` inside this package.
3. **Environment variables** defined in `.env` (copy `.env.example` if needed):
   - `PRIVATE_KEY` – Schnorr account private key registered on the target Aztec network.
   - `CONTRACT_ADDRESS` – Aztec contract to receive the cross-chain call.
   - `NODE_URL` (optional) – Defaults to `https://devnet.aztec-labs.com/.`.
   - `PORT` (optional) – HTTP port for the service (defaults to `3000`).

---

## Running the Service

```bash
# Install dependencies (if not already done)
npm install

# Start the verification service
npm run start-verification
# or
node vaa-verification-service.mjs
```

Once running, the console will display successful initialization logs and list available endpoints.

---

## HTTP API

| Endpoint  | Method | Description |
|-----------|--------|-------------|
| `/health` | GET    | Returns readiness, network info, and the target contract address. |
| `/verify` | POST   | Verifies a provided VAA and submits the `verify_vaa` transaction to Aztec. |
| `/test`   | POST   | Runs the built-in validation using a hardcoded Arbitrum Sepolia VAA. |

### Example: Calling `/test`

```bash
curl -X POST http://localhost:3000/test \
     -H "Content-Type: application/json" \
     -d '{}'
```

Successful responses return:

```json
{
  "success": true,
  "network": "devnet",
  "txHash": "0x…",
  "contractAddress": "0x…",
  "message": "VAA verified successfully on Aztec devnet (TEST ENDPOINT)",
  "processedAt": "<ISO timestamp>",
  "vaaLength": 221
}
```

Errors include `success: false` with diagnostic messages if the VAA is malformed or the PXE cannot submit the transaction.

---

## Adapting for Your Cross-Chain App

While this sample calls the Wormhole `verify_vaa` entrypoint directly, production applications typically:

1. Decode the cross-chain payload off-chain.
2. Submit a tailored Aztec transaction that invokes your contract.
3. Inside your contract, call [`verify_vaa`](../../aztec/contracts/src/main.nr) (or a similar proof-verification routine) to guard against spoofed messages.

This service already handles PXE setup, wallet registration, and transaction submission—reuse those pieces and swap in your own contract interaction logic.

---

## Builder Checklist

Use this quick list when customizing the verification service:

1. **Contract Artifact** – Update the artifact import to your compiled Aztec contract (or load it dynamically).
2. **Contract Address & Salt** – Point `CONTRACT_ADDRESS` (and any salts) to your deployed instance.
3. **PXE Fee Strategy** – Replace or configure `paymentMethod` if you use a custom fee payment mechanism.
4. **Payload Handling** – Modify the `/verify` handler to parse, validate, and translate your cross-chain payload before calling your contract.
5. **Security Checks** – Ensure your contract calls [`verify_vaa`](../../aztec/contracts/src/main.nr) (or equivalent) to gate any cross-chain effects.
6. **Endpoint Naming** – Adjust or add endpoints (e.g., `/bridge`, `/execute`) that map cleanly to your application flows.
7. **Logging & Monitoring** – Integrate structured logging or tracing for production deployment.
8. **Env Management** – Externalize sensitive keys and network config using your infra’s secret store.

---

## Extending the Example

- **Multiple Networks:** Run separate instances per Aztec network (devnet/testnet) by adjusting `NODE_URL` and credentials.
- **Batching Calls:** Wrap related actions in a single `verifyVaaBytes` helper variant to reuse fee setup and wallet handling.
- **Error Handling:** Enhance retries and add fallbacks if the Aztec node is temporarily unavailable.

With these guidelines, you can turn the verification service into a production bridge component that safely executes Aztec transactions triggered by cross-chain messages.
