# Aztec-Wormhole Relayer

A relayer that processes VAAs (Verifiable Action Attestations) using the Wormhole protocol.

## Quick Start

```bash
# Run with debug logging (shows all VAA processing)
LOG_LEVEL=debug go run relayer.go

# Run with info logging (shows only important events)
LOG_LEVEL=info go run relayer.go

# Run with warn/error logging (shows only problems)
LOG_LEVEL=warn go run relayer.go
```

## Prerequisites

1. **Spy Service**: Must be running on port 7073
   ```bash
   docker run --pull=always --platform=linux/amd64 \
       -p 7073:7073 \
       --entrypoint /guardiand ghcr.io/wormhole-foundation/guardiand:latest \
       spy \
       --nodeKey /node.key \
       --spyRPC "[::]:7073" \
       --env testnet
   ```

## Log Levels Explained

### Debug Level (`LOG_LEVEL=debug`)
- **Shows**: All VAA processing logs, including non-subscribed chains
- **Use case**: Development, debugging, monitoring all activity
- **Example logs**:
  ```
  DEBUG Processing VAA {"chain": 26, "sequence": 165411200, ...}
  DEBUG VAA Details {"emitterChain": 26, "emitterAddress": "...", ...}
  DEBUG Skipping VAA (not from configured chains) {"chain": 26, ...}
  ```

### Info Level (`LOG_LEVEL=info`) - **Default**
- **Shows**: Only meaningful processing steps for subscribed chains
- **Use case**: Production monitoring, clean logs
- **Example logs**:
  ```
  INFO Processing VAA from Aztec to Arbitrum {"sequence": 123, ...}
  INFO Processing VAA from Arbitrum to Aztec {"sequence": 456, ...}
  INFO VAA verification completed {"direction": "Aztec->Arbitrum", "txHash": "0x...", ...}
  ```

### Warn/Error Level (`LOG_LEVEL=warn` or `LOG_LEVEL=error`)
- **Shows**: Only problems, failures, and warnings
- **Use case**: Production alerting, minimal logging
- **Example logs**:
  ```
  WARN Verification service failed, trying direct PXE
  ERROR Failed to send verify transaction {"direction": "Aztec->Arbitrum", ...}
  ```

## What Gets Logged

- **Debug**: All VAAs received from spy service (including non-subscribed chains)
- **Info**: Only VAAs from subscribed chains (Aztec ↔ Arbitrum) with processing details
- **Warn/Error**: Connection issues, transaction failures, service unavailability