package spotify

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
)

// TokenManager handles Spotify API token caching and refresh
type TokenManager struct {
	mu          sync.RWMutex
	accessToken string
	expiresAt   time.Time
}

var tokenManager = &TokenManager{}

// Client wraps Spotify API interactions
type Client struct {
	Store  db.DB
	UserID int32
}

func NewClient(store db.DB, userID int32) *Client {
	return &Client{store, userID}
}

// GetToken retrieves a valid Spotify access token using Client Credentials flow
func (c *Client) GetToken(ctx context.Context) (string, error) {
	tokenManager.mu.RLock()
	if tokenManager.accessToken != "" && time.Now().Before(tokenManager.expiresAt) {
		token := tokenManager.accessToken
		tokenManager.mu.RUnlock()
		return token, nil
	}
	tokenManager.mu.RUnlock()

	// Get credentials from user preferences
	// Note: We assume userID 1 for single-user instances or use the provided UserID
	// ideally this should be parametrizable or config-based if global
	preferencesJSON, err := c.Store.GetUserPreferences(ctx, c.UserID)
	if err != nil {
		return "", fmt.Errorf("failed to get preferences: %w", err)
	}

	var preferences map[string]interface{}
	if err := json.Unmarshal(preferencesJSON, &preferences); err != nil {
		return "", fmt.Errorf("failed to parse preferences: %w", err)
	}

	clientID, _ := preferences["spotify_client_id"].(string)
	clientSecret, _ := preferences["spotify_client_secret"].(string)

	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("spotify credentials not configured")
	}

	// Request new token
	data := url.Values{}
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %w", err)
	}

	auth := base64.StdEncoding.EncodeToString([]byte(clientID + ":" + clientSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}

	// Cache the token
	tokenManager.mu.Lock()
	tokenManager.accessToken = tokenResp.AccessToken
	tokenManager.expiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second) // 1 min buffer
	tokenManager.mu.Unlock()

	return tokenResp.AccessToken, nil
}
