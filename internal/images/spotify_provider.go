package images

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/spotify"
)

type SpotifyProvider struct {
	client *spotify.Client
}

func NewSpotifyProvider(client *spotify.Client) *SpotifyProvider {
	return &SpotifyProvider{client: client}
}

func (p *SpotifyProvider) GetArtistImage(ctx context.Context, name string) (string, error) {
	token, err := p.client.GetToken(ctx)
	if err != nil {
		return "", err
	}

	searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=artist&limit=1", url.QueryEscape(name))
	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("spotify api error: %s", resp.Status)
	}

	var searchResp struct {
		Artists struct {
			Items []struct {
				Images []struct {
					URL    string `json:"url"`
					Width  int    `json:"width"`
					Height int    `json:"height"`
				} `json:"images"`
			} `json:"items"`
		} `json:"artists"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return "", fmt.Errorf("failed to decode spotify response: %w", err)
	}

	if len(searchResp.Artists.Items) > 0 {
		images := searchResp.Artists.Items[0].Images
		if len(images) > 0 {
			// Spotify usually returns images sorted by size, 0 is largest.
			// We want the largest one as per user requirement (server-side resize later)
			return images[0].URL, nil
		}
	}

	return "", nil
}

func (p *SpotifyProvider) GetAlbumImage(ctx context.Context, artist string, album string) (string, error) {
	token, err := p.client.GetToken(ctx)
	if err != nil {
		return "", err
	}

	query := fmt.Sprintf("artist:%s album:%s", artist, album)
	searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=album&limit=1", url.QueryEscape(query))
	req, _ := http.NewRequest("GET", searchURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("spotify api error: %s", resp.Status)
	}

	var searchResp struct {
		Albums struct {
			Items []struct {
				Images []struct {
					URL    string `json:"url"`
					Width  int    `json:"width"`
					Height int    `json:"height"`
				} `json:"images"`
			} `json:"items"`
		} `json:"albums"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return "", fmt.Errorf("failed to decode spotify response: %w", err)
	}

	if len(searchResp.Albums.Items) > 0 {
		images := searchResp.Albums.Items[0].Images
		if len(images) > 0 {
			return images[0].URL, nil
		}
	}

	return "", nil
}
