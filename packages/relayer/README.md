# Wormhole Relayer

A bidirectional relayer for Wormhole messages between Aztec and EVM-compatible chains (e.g., Arbitrum).

## Overview

This relayer monitors the Wormhole network for Verified Action Approvals (VAAs) and relays them between different blockchain networks:
- **Aztec Command**: Relays VAAs from EVM chains to Aztec
- **EVM Command**: Relays VAAs from Aztec to EVM chains

## Prerequisites

- Go 1.20 or higher
- Access to a Wormhole Spy service (default: `localhost:7073`)
- For Aztec relaying: Access to an Aztec PXE node
- For EVM relaying: Private key with sufficient funds for gas fees

## Build Instructions

### Building from Source

```bash
# Clone the repository (if not already cloned)
git clone https://github.com/NethermindEth/aztec-wormhole-app-demo.git
cd aztec-wormhole-app-demo/packages/relayer

# Download dependencies
go mod download

# Build the relayer binary
go build -o relayer .

# Optional: Install to $GOPATH/bin
go install .
```

### Running Tests

```bash
# Run all tests
go test ./...

# Run tests with verbose output
go test -v ./...

# Run tests for specific package
go test ./internal/submitter/...
```

## Usage

### Global Flags

These flags are available for all commands:

| Flag | Default | Description |
|------|---------|-------------|
| `--debug` | `false` | Enables debug output with detailed logging |
| `--json` | `false` | Enables structured logging in JSON format |
| `--spy-rpc-host` | `localhost:7073` | Wormhole spy service endpoint |
| `--wormhole-contract` | `0x0848d2af...` | Wormhole core contract address |
| `--emitter-address` | `0x0848d2af...` | Emitter address to monitor |

### Aztec Command (EVM → Aztec)

Relays Wormhole VAAs from EVM chains to Aztec.

```bash
./relayer aztec [flags]
```

#### Aztec-Specific Flags

| Flag | Default | Description | Required |
|------|---------|-------------|----------|
| `--aztec-pxe-url` | `http://localhost:8090` | PXE URL for Aztec | No |
| `--aztec-wallet-address` | `0x1f3933ca...` | Aztec wallet address to use | No |
| `--aztec-target-contract` | `0x0848d2af...` | Target contract on Aztec to send VAAs to | No |
| `--chain-id` | `10003` | Aztec chain ID | No |
| `--verification-service-url` | `http://localhost:8080` | Verification service URL (optional) | No |

#### Example Usage

```bash
# Basic usage with defaults
./relayer aztec

# With custom configuration
./relayer aztec \
  --aztec-pxe-url http://your-pxe:8090 \
  --aztec-wallet-address 0xYourWalletAddress \
  --aztec-target-contract 0xYourTargetContract \
  --debug

# With JSON logging for production
./relayer aztec --json

# Using environment variables
export WORMHOLE_RELAYER_AZTEC_PXE_URL=http://your-pxe:8090
export WORMHOLE_RELAYER_SPY_RPC_HOST=your-spy:7073
./relayer aztec
```

### EVM Command (Aztec → EVM)

Relays Wormhole VAAs from Aztec to EVM-compatible chains.

```bash
./relayer evm [flags]
```

#### EVM-Specific Flags

| Flag | Default | Description | Required |
|------|---------|-------------|----------|
| `--private-key` | - | Private key for EVM transactions | **Yes** |
| `--evm-rpc-url` | `https://sepolia-rollup.arbitrum.io/rpc` | RPC URL for EVM chain | No |
| `--evm-target-contract` | `0x248EC2E5...` | Target contract on EVM chain | No |
| `--chain-id` | `10003` | Destination EVM chain ID | No |

> **Note:** The stock EVM submitter targets the demo contract included in this repo. If your contract exposes a different interface you must update the Go code—see [EVM Submitter Reference Implementation](#evm-submitter-reference-implementation).

#### Example Usage

```bash
# Basic usage (private key required)
./relayer evm --private-key 0xYourPrivateKey

# With custom Arbitrum configuration
./relayer evm \
  --private-key 0xYourPrivateKey \
  --evm-rpc-url https://arb1.arbitrum.io/rpc \
  --evm-target-contract 0xYourTargetContract \
  --chain-id 42161

# With debug output
./relayer evm \
  --private-key 0xYourPrivateKey \
  --debug \
  --json

# Using environment variables (recommended for private key)
export WORMHOLE_RELAYER_PRIVATE_KEY=0xYourPrivateKey
export WORMHOLE_RELAYER_EVM_RPC_URL=https://your-rpc-endpoint
./relayer evm
```

## Configuration

### Environment Variables

All command-line flags can be set via environment variables using the pattern:
`WORMHOLE_RELAYER_<FLAG_NAME>`

Replace hyphens with underscores and convert to uppercase:
- `--spy-rpc-host` → `WORMHOLE_RELAYER_SPY_RPC_HOST`
- `--aztec-pxe-url` → `WORMHOLE_RELAYER_AZTEC_PXE_URL`
- `--private-key` → `WORMHOLE_RELAYER_PRIVATE_KEY`

### Using .env File

The relayer supports loading configuration from a `.env` file in the current directory:

```bash
# .env
WORMHOLE_RELAYER_PRIVATE_KEY=0xYourPrivateKey
WORMHOLE_RELAYER_SPY_RPC_HOST=your-spy-host:7073
WORMHOLE_RELAYER_AZTEC_PXE_URL=http://your-pxe:8090
WORMHOLE_RELAYER_EVM_RPC_URL=https://your-rpc-endpoint
```

### EVM Submitter Reference Implementation

The EVM relayer ships with a minimal submitter that targets the example contract in this repository. It calls a `verify(bytes encodedVm)` method and assumes:

- The contract ABI matches the hardcoded call in `internal/clients/evm.go`.
- Only a single `bytes` argument (the VAA payload) is required.
- No ETH value needs to be sent and a static gas limit of `3,000,000` is sufficient.

This is intended as scaffolding. Expect to copy and adapt the submitter for your own contract, wiring in your contract’s ABI and method signature.

#### Builder Checklist

- [ ] Duplicate `internal/clients/evm.go` / `internal/submitter/evm.go` (or fork the relayer) 
- [ ] Adjust argument packing to match your contract inputs (e.g., multiple parameters, structs, non-`bytes` types).
- [ ] Update gas limit/value strategy if needed.

## Architecture

The relayer consists of several key components:

### Core Components

1. **Spy Client**: Connects to the Wormhole Spy service to receive signed VAAs
2. **VAA Processor**: Processes incoming VAAs and determines handling based on chain ID
3. **Submitters**:
   - `AztecSubmitter`: Submits VAAs to Aztec via PXE
   - `EVMSubmitter`: Submits VAAs to EVM chains via RPC
4. **Relayer**: Orchestrates the flow between components

### Message Flow

```
EVM → Aztec:
1. EVM contract emits Wormhole message
2. Guardians sign the message creating a VAA
3. Spy service broadcasts the VAA
4. Relayer receives VAA via Spy client
5. VAA Processor validates chain ID
6. AztecSubmitter sends to Aztec PXE
7. Transaction confirmed on Aztec

Aztec → EVM:
1. Aztec contract emits Wormhole message
2. Guardians sign the message creating a VAA
3. Spy service broadcasts the VAA
4. Relayer receives VAA via Spy client
5. VAA Processor validates chain ID
6. EVMSubmitter sends transaction to EVM
7. Transaction confirmed on EVM chain
```

## Monitoring

### Logging Levels

- **INFO**: General operational messages
- **DEBUG**: Detailed processing information (use `--debug` flag)
- **WARN**: Recoverable issues (e.g., connection retries)
- **ERROR**: Non-recoverable errors

### Health Checks

The relayer logs its status at various stages:
- Connection status to Spy service
- Connection status to blockchain nodes
- VAA processing events
- Transaction submission results

### Example Log Output

```json
{
  "L": "INFO",
  "T": "2025-01-18T12:00:00Z",
  "C": "cmd/aztec.go:89",
  "M": "Starting Aztec relayer (EVM -> Aztec)"
}
```

## Troubleshooting

### Common Issues

1. **"Connection refused" to Spy service**
   - Ensure the Wormhole Spy service is running
   - Check the `--spy-rpc-host` configuration
   - Verify network connectivity

2. **"Failed to create EVM client"**
   - Verify the RPC URL is accessible
   - Check that the private key is valid (64 hex characters)
   - Ensure the account has sufficient funds for gas

3. **"Failed to create PXE client"**
   - Verify the Aztec PXE node is running
   - Check the `--aztec-pxe-url` configuration
   - Ensure the wallet address is valid

4. **Transaction failures**
   - Check target contract addresses
   - Verify chain IDs match your network
   - Ensure contracts are deployed and accessible

### Debug Mode

Enable debug mode for detailed troubleshooting:

```bash
./relayer aztec --debug --json 2>&1 | tee relayer.log
```

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Never commit private keys to version control**
2. **Use environment variables or secure key management for production**
3. **Ensure RPC endpoints use HTTPS in production**
4. **Monitor relayer logs for suspicious activity**
5. **Keep the relayer binary and dependencies updated**

### Recommended Production Setup

```bash
# Use environment variables for sensitive data
export WORMHOLE_RELAYER_PRIVATE_KEY=$(cat /secure/path/to/key)

# Run with JSON logging for parsing
./relayer evm --json 2>&1 | tee -a /var/log/relayer.log

# Use systemd or similar for automatic restarts
# See example systemd service file below
```

### Example Systemd Service

```ini
[Unit]
Description=Wormhole Relayer
After=network.target

[Service]
Type=simple
User=relayer
ExecStart=/usr/local/bin/relayer aztec --json
Restart=always
RestartSec=10
Environment="WORMHOLE_RELAYER_SPY_RPC_HOST=localhost:7073"
Environment="WORMHOLE_RELAYER_AZTEC_PXE_URL=http://localhost:8090"

[Install]
WantedBy=multi-user.target
```

## Contributing

Please ensure all contributions:
1. Include appropriate tests
2. Follow Go best practices
3. Update documentation as needed
4. Pass `go fmt` and `go vet`

## License

See the main repository for license information.
