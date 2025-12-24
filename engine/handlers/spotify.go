package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"strconv"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/spotify"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/jackc/pgx/v5/pgtype"
)

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

		client := spotify.NewClient(store, user.ID)
		token, err := client.GetToken(ctx)
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

		httpClient := &http.Client{Timeout: 10 * time.Second}
		resp, err := httpClient.Do(req)
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

// SpotifyFetchMetadataHandler fetches and updates metadata for an entity
func SpotifyFetchMetadataHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil || id == 0 {
			utils.WriteError(w, "invalid id", http.StatusBadRequest)
			return
		}

		entityType := r.URL.Query().Get("type") // artist, album, track
		if entityType == "" {
			utils.WriteError(w, "type is required", http.StatusBadRequest)
			return
		}

		spotifyID := r.URL.Query().Get("spotify_id")

		client := spotify.NewClient(store, user.ID)
		token, err := client.GetToken(ctx)
		if err != nil {
			l.Debug().Err(err).Msg("SpotifyFetchMetadataHandler: Failed to get Spotify token")
			utils.WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}

		httpClient := &http.Client{Timeout: 10 * time.Second}

		switch entityType {
		case "artist":
			if spotifyID == "" {
				utils.WriteError(w, "spotify_id is required", http.StatusBadRequest)
				return
			}

			// Fetch Artist Details: https://api.spotify.com/v1/artists/{id}
			req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/artists/"+spotifyID, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := httpClient.Do(req)
			if err != nil {
				utils.WriteError(w, "spotify api failed", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				utils.WriteError(w, "spotify api error", http.StatusBadGateway)
				return
			}

			var artistData struct {
				Genres     []string `json:"genres"`
				Popularity int      `json:"popularity"`
				Followers  struct {
					Total int `json:"total"`
				} `json:"followers"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&artistData); err != nil {
				utils.WriteError(w, "failed to decode spotify response", http.StatusInternalServerError)
				return
			}

			// Update DB
			err = store.UpdateArtistMetadata(ctx, db.UpdateArtistMetadataParams{
				ID:         int32(id),
				Genres:     artistData.Genres,
				Popularity: pgtype.Int4{Int32: int32(artistData.Popularity), Valid: true},
				SpotifyID:  pgtype.Text{String: spotifyID, Valid: true},
				Bio:        pgtype.Text{Valid: false},
				Followers:  pgtype.Int4{Int32: int32(artistData.Followers.Total), Valid: true},
			})
			if err != nil {
				l.Error().Err(err).Msg("Failed to update artist metadata")
				utils.WriteError(w, "database update failed", http.StatusInternalServerError)
				return
			}

		case "album":
			if spotifyID == "" {
				utils.WriteError(w, "spotify_id is required", http.StatusBadRequest)
				return
			}

			// Fetch Album Details: https://api.spotify.com/v1/albums/{id}
			req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/albums/"+spotifyID, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := httpClient.Do(req)
			if err != nil {
				utils.WriteError(w, "spotify api failed", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				utils.WriteError(w, "spotify api error", http.StatusBadGateway)
				return
			}

			var albumData struct {
				Genres               []string `json:"genres"`
				Popularity           int      `json:"popularity"`
				ReleaseDate          string   `json:"release_date"`
				ReleaseDatePrecision string   `json:"release_date_precision"`
				Label                string   `json:"label"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&albumData); err != nil {
				utils.WriteError(w, "failed to decode spotify response", http.StatusInternalServerError)
				return
			}

			err = store.UpdateReleaseMetadata(ctx, db.UpdateReleaseMetadataParams{
				ID:                   int32(id),
				Genres:               albumData.Genres,
				Popularity:           pgtype.Int4{Int32: int32(albumData.Popularity), Valid: true},
				ReleaseDate:          pgtype.Text{String: albumData.ReleaseDate, Valid: true},
				SpotifyID:            pgtype.Text{String: spotifyID, Valid: true},
				Label:                pgtype.Text{String: albumData.Label, Valid: true},
				ReleaseDatePrecision: pgtype.Text{String: albumData.ReleaseDatePrecision, Valid: true},
			})
			if err != nil {
				l.Error().Err(err).Msg("Failed to update release metadata")
				utils.WriteError(w, "database update failed", http.StatusInternalServerError)
				return
			}

		case "track":
			// If we don't have an ID, we try to find it first
			if spotifyID == "" || spotifyID == "undefined" {
				l.Info().Msg("SpotifyID missing for track, attempting to search...")

				// 1. Get Track Details from DB
				track, err := store.GetTrack(ctx, db.GetTrackOpts{
					ID:     int32(id),
					UserID: user.ID,
				})
				if err != nil {
					l.Error().Err(err).Msg("Failed to get track from DB")
					utils.WriteError(w, "track not found", http.StatusNotFound)
					return
				}

				// 2. Search Spotify
				var query string
				// If we have artist IDs, we should ideally fetch the artist name too,
				// but for now, let's use the track title and hope for the best or fetch artists.
				// Actually, GetTrack returns *models.Track which should have Artists populated if the query does it.
				// Let's check models.Track definition or just fetch artists.

				artists, err := store.GetArtistsForTrack(ctx, int32(id))
				if err == nil && len(artists) > 0 {
					query = fmt.Sprintf("track:%s artist:%s", track.Title, artists[0].Name)
				} else {
					query = fmt.Sprintf("track:%s", track.Title)
				}

				l.Debug().Str("query", query).Msg("Searching Spotify for track")

				searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=track&limit=1", url.QueryEscape(query))
				req, _ := http.NewRequest("GET", searchURL, nil)
				req.Header.Set("Authorization", "Bearer "+token)
				respSearch, err := httpClient.Do(req)
				if err != nil {
					l.Error().Err(err).Msg("Spotify search failed")
					utils.WriteError(w, "spotify search failed", http.StatusInternalServerError)
					return
				}
				defer respSearch.Body.Close()

				var searchResp struct {
					Tracks struct {
						Items []struct {
							ID string `json:"id"`
						} `json:"items"`
					} `json:"tracks"`
				}
				if err := json.NewDecoder(respSearch.Body).Decode(&searchResp); err != nil {
					l.Error().Err(err).Msg("Failed to decode search response")
					utils.WriteError(w, "spotify search response error", http.StatusInternalServerError)
					return
				}

				if len(searchResp.Tracks.Items) == 0 {
					l.Warn().Str("track", track.Title).Msg("No match found on Spotify")
					utils.WriteError(w, "track not found on spotify", http.StatusNotFound)
					return
				}

				spotifyID = searchResp.Tracks.Items[0].ID
				l.Info().Str("title", track.Title).Str("new_id", spotifyID).Msg("Found Spotify ID for track")
			}

			// 1. Fetch Track Details
			req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/tracks/"+spotifyID, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := httpClient.Do(req)
			if err != nil {
				utils.WriteError(w, "spotify api failed", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				utils.WriteError(w, "spotify api error", http.StatusBadGateway)
				return
			}

			var trackData struct {
				Popularity int `json:"popularity"`
				Album      struct {
					ReleaseDate string `json:"release_date"`
				} `json:"album"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&trackData); err != nil {
				utils.WriteError(w, "failed to decode spotify response", http.StatusInternalServerError)
				return
			}

			err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
				ID:               int32(id),
				Popularity:       pgtype.Int4{Int32: int32(trackData.Popularity), Valid: true},
				SpotifyID:        pgtype.Text{String: spotifyID, Valid: true},
				Danceability:     pgtype.Float8{Valid: false},
				Energy:           pgtype.Float8{Valid: false},
				Key:              pgtype.Int4{Valid: false},
				Loudness:         pgtype.Float8{Valid: false},
				Mode:             pgtype.Int4{Valid: false},
				Speechiness:      pgtype.Float8{Valid: false},
				Acousticness:     pgtype.Float8{Valid: false},
				Instrumentalness: pgtype.Float8{Valid: false},
				Liveness:         pgtype.Float8{Valid: false},
				Valence:          pgtype.Float8{Valid: false},
				Tempo:            pgtype.Float8{Valid: false},
			})
			if err != nil {
				l.Error().Err(err).Msg("Failed to update track metadata")
				utils.WriteError(w, "database update failed", http.StatusInternalServerError)
				return
			}
		}

		utils.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// AttemptAutoFetchForListen checks if metadata needs to be fetched for a new scrobble
func AttemptAutoFetchForListen(ctx context.Context, store db.DB, user *models.User, trackName, artistName, albumName string) {
	// Run in background (detached context)
	go func() {
		// Create a new context with timeout
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()

		l := logger.FromContext(ctx) // Use logger from original context
		l.Debug().Str("track", trackName).Msg("Attempting auto-fetch for new scrobble")

		// 1. Check User Preferences
		prefsJSON, err := store.GetUserPreferences(bgCtx, user.ID)
		if err != nil {
			return // Cannot check preferences
		}
		var prefs map[string]interface{}
		if json.Unmarshal(prefsJSON, &prefs) != nil {
			return
		}

		// Defaults
		fetchArtist := getConfigBool(prefs, "spotify_fetch_artist_metadata", true)
		fetchAlbum := getConfigBool(prefs, "spotify_fetch_album_metadata", true)
		fetchTrack := getConfigBool(prefs, "spotify_fetch_track_metadata", true)

		if !fetchArtist && !fetchAlbum && !fetchTrack {
			return // Nothing to do
		}

		client := spotify.NewClient(store, user.ID)
		token, err := client.GetToken(bgCtx)
		if err != nil {
			l.Debug().Err(err).Msg("AutoFetch: Failed to get token")
			return
		}

		httpClient := &http.Client{Timeout: 10 * time.Second}

		// Helper to search and update
		searchAndUpdate := func(query, typeStr string) string {
			searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=%s&limit=1", url.QueryEscape(query), typeStr)
			req, _ := http.NewRequest("GET", searchURL, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := httpClient.Do(req)
			if err != nil || resp.StatusCode != 200 {
				return ""
			}
			defer resp.Body.Close()

			var searchResp struct {
				Tracks struct {
					Items []struct {
						ID string `json:"id"`
					} `json:"items"`
				} `json:"tracks"`
				Artists struct {
					Items []struct {
						ID         string   `json:"id"`
						Genres     []string `json:"genres"`
						Popularity int      `json:"popularity"`
					} `json:"items"`
				} `json:"artists"`
				Albums struct {
					Items []struct {
						ID          string   `json:"id"`
						ReleaseDate string   `json:"release_date"`
						Genres      []string `json:"genres"`
						Popularity  int      `json:"popularity"`
						Label       string   `json:"label"`
					} `json:"items"`
				} `json:"albums"`
			}
			if json.NewDecoder(resp.Body).Decode(&searchResp) != nil {
				return ""
			}

			// Handle Updates
			if typeStr == "artist" && len(searchResp.Artists.Items) > 0 {
				item := searchResp.Artists.Items[0]
				artists, _ := store.SearchArtists(bgCtx, artistName)
				if len(artists) > 0 {
					store.UpdateArtistMetadata(bgCtx, db.UpdateArtistMetadataParams{
						ID:         artists[0].ID,
						Genres:     item.Genres,
						Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
						SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
					})
					l.Info().Msgf("AutoFetch: Updated Artist %s", artistName)
					return item.ID
				}
			} else if typeStr == "album" && len(searchResp.Albums.Items) > 0 {
				item := searchResp.Albums.Items[0]
				albums, _ := store.SearchAlbums(bgCtx, albumName)
				if len(albums) > 0 {
					store.UpdateReleaseMetadata(bgCtx, db.UpdateReleaseMetadataParams{
						ID:          albums[0].ID,
						Genres:      item.Genres,
						Popularity:  pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
						SpotifyID:   pgtype.Text{String: item.ID, Valid: true},
						ReleaseDate: pgtype.Text{String: item.ReleaseDate, Valid: true},
						Label:       pgtype.Text{String: item.Label, Valid: true},
					})
					l.Info().Msgf("AutoFetch: Updated Album %s", albumName)
					return item.ID
				}
			} else if typeStr == "track" && len(searchResp.Tracks.Items) > 0 {
				item := searchResp.Tracks.Items[0]
				tracks, _ := store.SearchTracks(bgCtx, trackName)
				if len(tracks) > 0 {
					reqT, _ := http.NewRequest("GET", "https://api.spotify.com/v1/tracks/"+item.ID, nil)
					reqT.Header.Set("Authorization", "Bearer "+token)
					respT, err := httpClient.Do(reqT)
					if err == nil && respT.StatusCode == 200 {
						var fullTrack struct {
							Popularity int `json:"popularity"`
						}
						json.NewDecoder(respT.Body).Decode(&fullTrack)
						store.UpdateTrackMetadata(bgCtx, db.UpdateTrackMetadataParams{
							ID:         tracks[0].ID,
							Popularity: pgtype.Int4{Int32: int32(fullTrack.Popularity), Valid: true},
							SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
						})
						l.Info().Msgf("AutoFetch: Updated Track %s", trackName)
					}
					respT.Body.Close()
					return item.ID
				}
			}
			return ""
		}

		if fetchArtist {
			searchAndUpdate(artistName, "artist")
		}
		if fetchAlbum && albumName != "" {
			query := fmt.Sprintf("album:%s artist:%s", albumName, artistName)
			searchAndUpdate(query, "album")
		}
		if fetchTrack {
			query := fmt.Sprintf("track:%s artist:%s", trackName, artistName)
			searchAndUpdate(query, "track")
		}
	}()
}

func getConfigBool(prefs map[string]interface{}, key string, def bool) bool {
	if val, ok := prefs[key]; ok {
		if boolVal, ok := val.(bool); ok {
			return boolVal
		}
	}
	return def
}

// SpotifyBulkFetchSSEHandler fetches metadata for ALL entities with real-time progress updates
func SpotifyBulkFetchSSEHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
			return
		}

		type SSEEvent struct {
			Type string
			Data interface{}
		}

		eventChan := make(chan SSEEvent)

		go func() {
			defer close(eventChan)

			send := func(eventType string, data interface{}) {
				select {
				case eventChan <- SSEEvent{Type: eventType, Data: data}:
				case <-ctx.Done():
					return
				}
			}

			client := spotify.NewClient(store, user.ID)
			token, err := client.GetToken(ctx)
			if err != nil {
				send("error", map[string]string{"message": "Failed to get Spotify token: " + err.Error()})
				send("complete", map[string]interface{}{"success": false})
				return
			}

			httpClient := &http.Client{Timeout: 10 * time.Second}

			// 1. Calculate Total Count for Progress
			send("log", map[string]string{"message": "Calculating library size..."})

			countArtists, _ := store.CountArtists(ctx, user.ID, db.PeriodAllTime)
			countAlbums, _ := store.CountAlbums(ctx, user.ID, db.PeriodAllTime)
			countTracks, _ := store.CountTracks(ctx, user.ID, db.PeriodAllTime)

			totalSteps := int(countArtists + countAlbums + countTracks)
			if totalSteps == 0 {
				totalSteps = 1 // Avoid divide by zero
			}

			var processed, failed int

			// Helper for progress update
			updateProgress := func() {
				prog := float64(processed+failed) / float64(totalSteps) * 100
				if prog > 100 {
					prog = 100
				}
				send("progress", map[string]interface{}{"percent": prog, "processed": processed, "failed": failed})
			}

			// === PHASE 1: PRIORITY FETCH (Top 100 of each) ===
			send("log", map[string]string{"message": "Phase 1: Fetching Top 100 Artists..."})

			// Helper to process a single page of artists
			processArtistPage := func(page int) int {
				artistResp, err := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
					UserID: int(user.ID),
					Period: db.PeriodAllTime,
					Limit:  100,
					Page:   page,
				})
				if err != nil || len(artistResp.Items) == 0 {
					return 0
				}

				var idsToFetch []string
				var itemsToFetch []*models.Artist

				for _, artist := range artistResp.Items {
					if artist.SpotifyID != "" {
						idsToFetch = append(idsToFetch, artist.SpotifyID)
						itemsToFetch = append(itemsToFetch, artist)
					} else {
						processed++
					}
				}

				// Batch Fetch
				for i := 0; i < len(idsToFetch); i += 50 {
					end := i + 50
					if end > len(idsToFetch) {
						end = len(idsToFetch)
					}
					batchIDs := idsToFetch[i:end]

					u := "https://api.spotify.com/v1/artists?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					if err == nil && resp.StatusCode == 200 {
						var realBatchResp struct {
							Artists []struct {
								ID         string   `json:"id"`
								Genres     []string `json:"genres"`
								Popularity int      `json:"popularity"`
								Followers  struct {
									Total int `json:"total"`
								} `json:"followers"`
							} `json:"artists"`
						}
						json.NewDecoder(resp.Body).Decode(&realBatchResp)
						for j, item := range realBatchResp.Artists {
							if item.ID == "" {
								continue
							}
							target := itemsToFetch[i+j]
							store.UpdateArtistMetadata(ctx, db.UpdateArtistMetadataParams{
								ID: target.ID, Genres: item.Genres, Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID: pgtype.Text{String: item.ID, Valid: true}, Followers: pgtype.Int4{Int32: int32(item.Followers.Total), Valid: true},
							})
							processed++
						}
						resp.Body.Close()
					} else {
						failed += len(batchIDs)
					}
					updateProgress()
					time.Sleep(100 * time.Millisecond)
				}
				return len(artistResp.Items)
			}

			// Phase 1: Only Top 100 Artists
			processArtistPage(1)

			// Helper to process a single page of albums
			processAlbumPage := func(page int) int {
				albumResp, err := store.GetTopAlbumsPaginated(ctx, db.GetItemsOpts{UserID: int(user.ID), Period: db.PeriodAllTime, Limit: 100, Page: page})
				if err != nil || len(albumResp.Items) == 0 {
					return 0
				}

				var idsToFetch []string
				var itemsToFetch []*models.Album
				for _, album := range albumResp.Items {
					if album.SpotifyID != "" {
						idsToFetch = append(idsToFetch, album.SpotifyID)
						itemsToFetch = append(itemsToFetch, album)
					} else {
						processed++
					}
				}

				for i := 0; i < len(idsToFetch); i += 20 {
					end := i + 20
					if end > len(idsToFetch) {
						end = len(idsToFetch)
					}
					batchIDs := idsToFetch[i:end]
					u := "https://api.spotify.com/v1/albums?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)
					if err == nil && resp.StatusCode == 200 {
						var batchResp struct {
							Albums []struct {
								ID          string   `json:"id"`
								Genres      []string `json:"genres"`
								Popularity  int      `json:"popularity"`
								ReleaseDate string   `json:"release_date"`
								Label       string   `json:"label"`
							} `json:"albums"`
						}
						json.NewDecoder(resp.Body).Decode(&batchResp)
						for j, item := range batchResp.Albums {
							if item.ID == "" {
								continue
							}
							target := itemsToFetch[i+j]
							store.UpdateReleaseMetadata(ctx, db.UpdateReleaseMetadataParams{
								ID: target.ID, Genres: item.Genres, Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								ReleaseDate: pgtype.Text{String: item.ReleaseDate, Valid: true}, SpotifyID: pgtype.Text{String: item.ID, Valid: true},
								Label: pgtype.Text{String: item.Label, Valid: true},
							})
							processed++
						}
						resp.Body.Close()
					} else {
						failed += len(batchIDs)
					}
					updateProgress()
					time.Sleep(100 * time.Millisecond)
				}
				return len(albumResp.Items)
			}

			// Helper to process a single page of tracks
			processTrackPage := func(page int) int {
				trackResp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{UserID: int(user.ID), Period: db.PeriodAllTime, Limit: 100, Page: page})
				if err != nil || len(trackResp.Items) == 0 {
					return 0
				}

				var idsToFetch []string
				var itemsToFetch []*models.Track
				for _, track := range trackResp.Items {
					if track.SpotifyID != "" {
						idsToFetch = append(idsToFetch, track.SpotifyID)
						itemsToFetch = append(itemsToFetch, track)
					} else {
						processed++
					}
				}

				for i := 0; i < len(idsToFetch); i += 50 {
					end := i + 50
					if end > len(idsToFetch) {
						end = len(idsToFetch)
					}
					batchIDs := idsToFetch[i:end]
					u := "https://api.spotify.com/v1/tracks?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)
					if err == nil && resp.StatusCode == 200 {
						var batchResp struct {
							Tracks []struct {
								ID         string `json:"id"`
								Popularity int    `json:"popularity"`
							} `json:"tracks"`
						}
						json.NewDecoder(resp.Body).Decode(&batchResp)
						for j, item := range batchResp.Tracks {
							if item.ID == "" {
								continue
							}
							target := itemsToFetch[i+j]
							store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
								ID: target.ID, Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID: pgtype.Text{String: item.ID, Valid: true},
							})
							processed++
						}
						resp.Body.Close()
					} else {
						failed += len(batchIDs)
					}
					updateProgress()
					time.Sleep(100 * time.Millisecond)
				}
				return len(trackResp.Items)
			}

			// Phase 1: Top 100 Albums
			send("log", map[string]string{"message": "Phase 1: Fetching Top 100 Albums..."})
			processAlbumPage(1)

			// Phase 1: Top 100 Tracks
			send("log", map[string]string{"message": "Phase 1: Fetching Top 100 Tracks..."})
			processTrackPage(1)

			// === PHASE 2: DEEP SCAN (Rest of library, with calm) ===
			send("log", map[string]string{"message": "Phase 2: Deep Scan starting (background)..."})

			// Deep scan: Artists page 2+
			for page := 2; processArtistPage(page) > 0; page++ {
				time.Sleep(200 * time.Millisecond) // Extra calm for deep scan
			}

			// Deep scan: Albums page 2+
			for page := 2; processAlbumPage(page) > 0; page++ {
				time.Sleep(200 * time.Millisecond)
			}

			// Deep scan: Tracks page 2+
			for page := 2; processTrackPage(page) > 0; page++ {
				time.Sleep(200 * time.Millisecond)
			}

			send("log", map[string]string{"message": "Metadata Sync Complete!"})
			send("complete", map[string]interface{}{"success": true, "processed": processed, "failed": failed})
		}()

		for event := range eventChan {
			data, _ := json.Marshal(event.Data)
			fmt.Fprintf(w, "event: %s\n", event.Type)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
