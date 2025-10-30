package clients

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

// ADD: HTTP verification service types
type VerificationRequest struct {
	VAABytes string `json:"vaaBytes"`
}

type VerificationResponse struct {
	Success bool   `json:"success"`
	TxHash  string `json:"txHash,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ADD: HTTP client for verification service
type VerificationServiceClient struct {
	baseURL    string
	httpClient *http.Client
	logger     *zap.Logger
}

// ADD: Create new verification service client
func NewVerificationServiceClient(logger *zap.Logger, baseURL string) *VerificationServiceClient {
	return &VerificationServiceClient{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		logger: logger.With(zap.String("component", "VerificationServiceClient")),
	}
}

// ADD: Verify VAA via HTTP service
func (c *VerificationServiceClient) VerifyVAA(ctx context.Context, vaaBytes []byte) (string, error) {
	c.logger.Debug("Sending VAA to verification service", zap.Int("vaaLength", len(vaaBytes)))

	// Prepare request
	vaaHex := hex.EncodeToString(vaaBytes)
	if !strings.HasPrefix(vaaHex, "0x") {
		vaaHex = "0x" + vaaHex
	}

	request := VerificationRequest{
		VAABytes: vaaHex,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal verification request: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/verify", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send verification request: %v", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read verification response: %v", err)
	}

	c.logger.Debug("Received response from verification service",
		zap.Int("statusCode", resp.StatusCode))

	// Parse response
	var response VerificationResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal verification response: %v", err)
	}

	if !response.Success {
		return "", fmt.Errorf("verification failed: %s", response.Error)
	}

	return response.TxHash, nil
}

// ADD: Check if verification service is healthy
func (c *VerificationServiceClient) CheckHealth(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/health", nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %v", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("health check failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("verification service unhealthy: status %d", resp.StatusCode)
	}

	return nil
}
