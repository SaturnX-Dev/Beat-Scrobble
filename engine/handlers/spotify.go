package handlers

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

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

// SpotifyTokenManager handles Spotify API token caching and refresh
type SpotifyTokenManager struct {
	mu          sync.RWMutex
	accessToken string
	expiresAt   time.Time
}

var spotifyTokenManager = &SpotifyTokenManager{}

// SpotifySearchResult represents a simplified search result
type SpotifySearchResult struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Artists []string `json:"artists,omitempty"`
	Images  []struct {
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"images"`
	Type string `json:"type"`
}

// SpotifySearchResponse is the API response
type SpotifySearchResponse struct {
	Results []SpotifySearchResult `json:"results"`
}

// getSpotifyToken retrieves a valid Spotify access token using Client Credentials flow
func getSpotifyToken(ctx context.Context, store db.DB, userID int32) (string, error) {
	spotifyTokenManager.mu.RLock()
	if spotifyTokenManager.accessToken != "" && time.Now().Before(spotifyTokenManager.expiresAt) {
		token := spotifyTokenManager.accessToken
		spotifyTokenManager.mu.RUnlock()
		return token, nil
	}
	spotifyTokenManager.mu.RUnlock()

	// Get credentials from user preferences
	preferencesJSON, err := store.GetUserPreferences(ctx, userID)
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
	spotifyTokenManager.mu.Lock()
	spotifyTokenManager.accessToken = tokenResp.AccessToken
	spotifyTokenManager.expiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second) // 1 min buffer
	spotifyTokenManager.mu.Unlock()

	return tokenResp.AccessToken, nil
}

// SpotifySearchHandler searches Spotify for artists, albums, or tracks
func SpotifySearchHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		query := r.URL.Query().Get("q")
		searchType := r.URL.Query().Get("type") // artist, album, track
		if query == "" {
			utils.WriteError(w, "query is required", http.StatusBadRequest)
			return
		}
		if searchType == "" {
			searchType = "album" // default to album
		}

		token, err := getSpotifyToken(ctx, store, user.ID)
		if err != nil {
			l.Debug().Err(err).Msg("SpotifySearchHandler: Failed to get Spotify token")
			utils.WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Make search request to Spotify
		searchURL := fmt.Sprintf(
			"https://api.spotify.com/v1/search?q=%s&type=%s&limit=10",
			url.QueryEscape(query),
			searchType,
		)

		req, err := http.NewRequest("GET", searchURL, nil)
		if err != nil {
			utils.WriteError(w, "failed to create search request", http.StatusInternalServerError)
			return
		}
		req.Header.Set("Authorization", "Bearer "+token)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			l.Error().Err(err).Msg("SpotifySearchHandler: Search request failed")
			utils.WriteError(w, "spotify search failed", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			l.Error().Str("body", string(body)).Int("status", resp.StatusCode).Msg("SpotifySearchHandler: Spotify API error")
			utils.WriteError(w, "spotify search failed", http.StatusBadGateway)
			return
		}

		// Parse response based on type
		var results []SpotifySearchResult

		switch searchType {
		case "artist":
			var searchResp struct {
				Artists struct {
					Items []struct {
						ID     string `json:"id"`
						Name   string `json:"name"`
						Images []struct {
							URL    string `json:"url"`
							Width  int    `json:"width"`
							Height int    `json:"height"`
						} `json:"images"`
					} `json:"items"`
				} `json:"artists"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
				utils.WriteError(w, "failed to parse response", http.StatusInternalServerError)
				return
			}
			for _, item := range searchResp.Artists.Items {
				results = append(results, SpotifySearchResult{
					ID:     item.ID,
					Name:   item.Name,
					Images: item.Images,
					Type:   "artist",
				})
			}

		case "album":
			var searchResp struct {
				Albums struct {
					Items []struct {
						ID      string `json:"id"`
						Name    string `json:"name"`
						Artists []struct {
							Name string `json:"name"`
						} `json:"artists"`
						Images []struct {
							URL    string `json:"url"`
							Width  int    `json:"width"`
							Height int    `json:"height"`
						} `json:"images"`
					} `json:"items"`
				} `json:"albums"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
				utils.WriteError(w, "failed to parse response", http.StatusInternalServerError)
				return
			}
			for _, item := range searchResp.Albums.Items {
				artists := make([]string, 0, len(item.Artists))
				for _, a := range item.Artists {
					artists = append(artists, a.Name)
				}
				results = append(results, SpotifySearchResult{
					ID:      item.ID,
					Name:    item.Name,
					Artists: artists,
					Images:  item.Images,
					Type:    "album",
				})
			}

		case "track":
			var searchResp struct {
				Tracks struct {
					Items []struct {
						ID      string `json:"id"`
						Name    string `json:"name"`
						Artists []struct {
							Name string `json:"name"`
						} `json:"artists"`
						Album struct {
							Images []struct {
								URL    string `json:"url"`
								Width  int    `json:"width"`
								Height int    `json:"height"`
							} `json:"images"`
						} `json:"album"`
					} `json:"items"`
				} `json:"tracks"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
				utils.WriteError(w, "failed to parse response", http.StatusInternalServerError)
				return
			}
			for _, item := range searchResp.Tracks.Items {
				artists := make([]string, 0, len(item.Artists))
				for _, a := range item.Artists {
					artists = append(artists, a.Name)
				}
				results = append(results, SpotifySearchResult{
					ID:      item.ID,
					Name:    item.Name,
					Artists: artists,
					Images:  item.Album.Images,
					Type:    "track",
				})
			}
		}

		l.Debug().Int("results", len(results)).Msg("SpotifySearchHandler: Search completed")
		utils.WriteJSON(w, http.StatusOK, SpotifySearchResponse{Results: results})
	}
}

// SpotifyConfiguredHandler checks if Spotify credentials are configured
func SpotifyConfiguredHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		preferencesJSON, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			utils.WriteJSON(w, http.StatusOK, map[string]bool{"configured": false})
			return
		}

		var preferences map[string]interface{}
		if err := json.Unmarshal(preferencesJSON, &preferences); err != nil {
			utils.WriteJSON(w, http.StatusOK, map[string]bool{"configured": false})
			return
		}

		clientID, _ := preferences["spotify_client_id"].(string)
		clientSecret, _ := preferences["spotify_client_secret"].(string)

		utils.WriteJSON(w, http.StatusOK, map[string]bool{
			"configured": clientID != "" && clientSecret != "",
		})
	}
}
