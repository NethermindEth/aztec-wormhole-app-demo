.PHONY: all build clean test test-coverage run-aztec run-arbitrum

# Build the single relayer binary
all: build

build:
	@echo "Building relayer..."
	@go build -o build/relayer .

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf build/
	@rm -f coverage.out coverage.html

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run Aztec → Arbitrum relayer
run-aztec: build
	@echo "Starting Aztec → Arbitrum relayer..."
	./build/relayer aztec

# Run Arbitrum → Aztec relayer
run-arbitrum: build
	@echo "Starting Arbitrum → Aztec relayer..."
	./build/relayer arbitrum

# Development mode - run both relayers in parallel (requires tmux or separate terminals)
dev:
	@echo "To run both relayers in development:"
	@echo "  Terminal 1: make run-aztec"
	@echo "  Terminal 2: make run-arbitrum"
	@echo ""
	@echo "Or with custom flags:"
	@echo "  ./build/relayer aztec --debug --spy-rpc-host=localhost:7072"
	@echo "  ./build/relayer arbitrum --debug --verification-service-url=http://localhost:8080"

# Docker build targets (optional)
docker-build:
	@echo "Building Docker image..."
	@docker build -t wormhole-relayer:latest .

docker-run-aztec:
	@echo "Running Aztec relayer in Docker..."
	@docker run --rm -it wormhole-relayer:latest aztec

docker-run-arbitrum:
	@echo "Running Arbitrum relayer in Docker..."
	@docker run --rm -it wormhole-relayer:latest arbitrum

# Check code formatting
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run ./...

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

# Update dependencies
update-deps:
	@echo "Updating dependencies..."
	@go get -u ./...
	@go mod tidy

# Show available commands
help:
	@echo "Wormhole Relayer - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "Build:"
	@echo "  make build           - Build the relayer binary"
	@echo "  make clean          - Remove build artifacts"
	@echo ""
	@echo "Run:"
	@echo "  make run-aztec      - Run Aztec → Arbitrum relayer"
	@echo "  make run-arbitrum   - Run Arbitrum → Aztec relayer"
	@echo "  make dev            - Show development mode instructions"
	@echo ""
	@echo "Test:"
	@echo "  make test           - Run all tests"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-run-aztec    - Run Aztec relayer in Docker"
	@echo "  make docker-run-arbitrum - Run Arbitrum relayer in Docker"
	@echo ""
	@echo "Development:"
	@echo "  make fmt            - Format code"
	@echo "  make lint           - Run linter (requires golangci-lint)"
	@echo "  make deps           - Install dependencies"
	@echo "  make update-deps    - Update dependencies"
	@echo ""
	@echo "CLI Usage:"
	@echo "  ./build/relayer --help           - Show help"
	@echo "  ./build/relayer aztec --help     - Show Aztec relayer options"
	@echo "  ./build/relayer arbitrum --help  - Show Arbitrum relayer options"
	@echo ""
	@echo "Environment Variables:"
	@echo "  All flags can be set via environment variables with RELAYER_ prefix"
	@echo "  Example: RELAYER_SPY_RPC_HOST=localhost:7072 ./build/relayer aztec"