# Build stage
FROM golang:1.24.6-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    file \
    make \
    git

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application with static linking for Alpine
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o relayer relayer.go

# Runtime stage
FROM alpine:3.20

# Install CA certificates for HTTPS connections
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN adduser -D -g '' relayer

# Copy the binary from builder
COPY --from=builder /build/relayer /usr/local/bin/relayer

# Set ownership
RUN chown relayer:relayer /usr/local/bin/relayer

# Switch to non-root user
USER relayer

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/relayer"]
