package handlers

import (
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
			if spotifyID == "" {
				utils.WriteError(w, "spotify_id is required", http.StatusBadRequest)
				return
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

			// 2. Fetch Audio Features
			reqFeatures, _ := http.NewRequest("GET", "https://api.spotify.com/v1/audio-features/"+spotifyID, nil)
			reqFeatures.Header.Set("Authorization", "Bearer "+token)
			respFeatures, err := httpClient.Do(reqFeatures)

			var (
				danceability     pgtype.Float8
				energy           pgtype.Float8
				key              pgtype.Int4
				loudness         pgtype.Float8
				mode             pgtype.Int4
				speechiness      pgtype.Float8
				acousticness     pgtype.Float8
				instrumentalness pgtype.Float8
				liveness         pgtype.Float8
				valence          pgtype.Float8
				tempo            pgtype.Float8
			)

			// Audio features are optional, don't fail if this fails
			if err == nil && respFeatures.StatusCode == http.StatusOK {
				defer respFeatures.Body.Close()
				var audioFeatures struct {
					Danceability     float64 `json:"danceability"`
					Energy           float64 `json:"energy"`
					Key              int     `json:"key"`
					Loudness         float64 `json:"loudness"`
					Mode             int     `json:"mode"`
					Speechiness      float64 `json:"speechiness"`
					Acousticness     float64 `json:"acousticness"`
					Instrumentalness float64 `json:"instrumentalness"`
					Liveness         float64 `json:"liveness"`
					Valence          float64 `json:"valence"`
					Tempo            float64 `json:"tempo"`
				}

				if err := json.NewDecoder(respFeatures.Body).Decode(&audioFeatures); err == nil {
					l.Debug().Interface("features", audioFeatures).Msg("Fetched audio features")
					danceability = pgtype.Float8{Float64: audioFeatures.Danceability, Valid: true}
					energy = pgtype.Float8{Float64: audioFeatures.Energy, Valid: true}
					key = pgtype.Int4{Int32: int32(audioFeatures.Key), Valid: true}
					loudness = pgtype.Float8{Float64: audioFeatures.Loudness, Valid: true}
					mode = pgtype.Int4{Int32: int32(audioFeatures.Mode), Valid: true}
					speechiness = pgtype.Float8{Float64: audioFeatures.Speechiness, Valid: true}
					acousticness = pgtype.Float8{Float64: audioFeatures.Acousticness, Valid: true}
					instrumentalness = pgtype.Float8{Float64: audioFeatures.Instrumentalness, Valid: true}
					liveness = pgtype.Float8{Float64: audioFeatures.Liveness, Valid: true}
					valence = pgtype.Float8{Float64: audioFeatures.Valence, Valid: true}
					tempo = pgtype.Float8{Float64: audioFeatures.Tempo, Valid: true}
				}
			}

			err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
				ID:               int32(id),
				Popularity:       pgtype.Int4{Int32: int32(trackData.Popularity), Valid: true},
				SpotifyID:        pgtype.Text{String: spotifyID, Valid: true},
				Danceability:     danceability,
				Energy:           energy,
				Key:              key,
				Loudness:         loudness,
				Mode:             mode,
				Speechiness:      speechiness,
				Acousticness:     acousticness,
				Instrumentalness: instrumentalness,
				Liveness:         liveness,
				Valence:          valence,
				Tempo:            tempo,
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

// SpotifyBulkFetchSSEHandler fetches metadata for top entities with real-time progress updates
func SpotifyBulkFetchSSEHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		logger := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // Nginx
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

		// Unbuffered channel for events
		eventChan := make(chan SSEEvent)

		// Start processing in background goroutine
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
			token, err := client.GetToken(ctx) // ctx (from request) is safe here? Yes, if client disconnects, we want to stop.
			if err != nil {
				send("error", map[string]string{"message": "Failed to get Spotify token: " + err.Error()})
				send("complete", map[string]interface{}{"success": false, "processed": 0, "failed": 0})
				return
			}

			httpClient := &http.Client{Timeout: 10 * time.Second}
			var processed, failed int
			totalSteps := 400 // includes audio features phase

			// 1. Artists
			send("log", map[string]string{"message": "Fetching Top 100 Artists..."})
			artistResp, err := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   1,
			})
			if err == nil {
				send("log", map[string]string{"message": fmt.Sprintf("Database query returned %d artists", len(artistResp.Items))})
				if len(artistResp.Items) == 0 {
					send("log", map[string]string{"message": "WARN: No artists found in database. Have you imported listening history?"})
				}

				// Separate items that have SpotifyID vs those that need search
				var idsToFetch []string
				var itemsToFetch []*models.Artist
				var searchItems []*models.Artist

				for _, artist := range artistResp.Items {
					if artist.SpotifyID != "" {
						idsToFetch = append(idsToFetch, artist.SpotifyID)
						itemsToFetch = append(itemsToFetch, artist)
					} else {
						searchItems = append(searchItems, artist)
					}
				}

				// Batch Fetch (Batch size 50)
				for i := 0; i < len(idsToFetch); i += 50 {
					// Check context
					select {
					case <-ctx.Done():
						return
					default:
					}

					end := i + 50
					if end > len(idsToFetch) {
						end = len(idsToFetch)
					}
					batchIDs := idsToFetch[i:end]

					send("log", map[string]string{"message": fmt.Sprintf("Batch fetching %d artists...", len(batchIDs))})

					u := "https://api.spotify.com/v1/artists?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx) // Use request context
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					if err == nil && resp.StatusCode == http.StatusOK {
						var batchResp struct {
							Artists []struct {
								ID         string   `json:"id"`
								Genres     []string `json:"genres"`
								Popularity int      `json:"popularity"`
								Followers  struct {
									Total int `json:"total"`
								} `json:"followers"`
							} `json:"artists"`
						}
						if err := json.NewDecoder(resp.Body).Decode(&batchResp); err == nil {
							for j, item := range batchResp.Artists {
								if item.ID == "" {
									continue
								}
								targetArtist := itemsToFetch[i+j]
								err = store.UpdateArtistMetadata(ctx, db.UpdateArtistMetadataParams{
									ID:         targetArtist.ID,
									Genres:     item.Genres,
									Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
									SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
									Bio:        pgtype.Text{Valid: false},
									Followers:  pgtype.Int4{Int32: int32(item.Followers.Total), Valid: true},
								})
								if err == nil {
									processed++
								} else {
									failed++
								}
							}
						}
						resp.Body.Close()
					}

					progress := float64(processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
				}

				// Search Handling (Legacy 1-by-1)
				for _, artist := range searchItems {
					// Check context
					select {
					case <-ctx.Done():
						return
					default:
					}

					searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=artist&limit=1", url.QueryEscape(artist.Name))
					req, _ := http.NewRequest("GET", searchURL, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					success := false
					if err == nil && resp.StatusCode == http.StatusOK {
						var searchResp struct {
							Artists struct {
								Items []struct {
									ID         string   `json:"id"`
									Genres     []string `json:"genres"`
									Popularity int      `json:"popularity"`
									Followers  struct {
										Total int `json:"total"`
									} `json:"followers"`
								} `json:"items"`
							} `json:"artists"`
						}
						if json.NewDecoder(resp.Body).Decode(&searchResp) == nil && len(searchResp.Artists.Items) > 0 {
							item := searchResp.Artists.Items[0]
							err = store.UpdateArtistMetadata(ctx, db.UpdateArtistMetadataParams{
								ID:         artist.ID,
								Genres:     item.Genres,
								Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
								Bio:        pgtype.Text{Valid: false},
								Followers:  pgtype.Int4{Int32: int32(item.Followers.Total), Valid: true},
							})
							if err == nil {
								success = true
							}
						}
						resp.Body.Close()
					}

					if success {
						processed++
						send("log", map[string]string{"message": fmt.Sprintf("Found new artist mapping: %s", artist.Name)})
					} else {
						failed++
						send("log", map[string]string{"message": fmt.Sprintf("Failed to find: %s", artist.Name)})
					}
					progress := float64(processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(50 * time.Millisecond) // Rate limit
				}
			}

			// 2. Process Top Albums
			send("log", map[string]string{"message": "Fetching Top 100 Albums..."})
			albumResp, err := store.GetTopAlbumsPaginated(ctx, db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   1,
			})

			if err == nil {
				send("log", map[string]string{"message": fmt.Sprintf("Database query returned %d albums", len(albumResp.Items))})
				if len(albumResp.Items) == 0 {
					send("log", map[string]string{"message": "WARN: No albums found in database."})
				}

				// Separate albums with SpotifyID vs those that need search
				var albumIDsToFetch []string
				var albumsToFetch []*models.Album
				var albumsToSearch []*models.Album

				for _, album := range albumResp.Items {
					if album.SpotifyID != "" {
						albumIDsToFetch = append(albumIDsToFetch, album.SpotifyID)
						albumsToFetch = append(albumsToFetch, album)
					} else {
						albumsToSearch = append(albumsToSearch, album)
					}
				}

				// Batch Fetch Albums (20 at a time - Spotify limit for albums)
				for i := 0; i < len(albumIDsToFetch); i += 20 {
					select {
					case <-ctx.Done():
						return
					default:
					}

					end := i + 20
					if end > len(albumIDsToFetch) {
						end = len(albumIDsToFetch)
					}
					batchIDs := albumIDsToFetch[i:end]

					send("log", map[string]string{"message": fmt.Sprintf("Batch fetching %d albums...", len(batchIDs))})

					u := "https://api.spotify.com/v1/albums?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					if err == nil && resp.StatusCode == http.StatusOK {
						var batchResp struct {
							Albums []struct {
								ID                   string   `json:"id"`
								Genres               []string `json:"genres"`
								Popularity           int      `json:"popularity"`
								ReleaseDate          string   `json:"release_date"`
								Label                string   `json:"label"`
								ReleaseDatePrecision string   `json:"release_date_precision"`
							} `json:"albums"`
						}
						if err := json.NewDecoder(resp.Body).Decode(&batchResp); err == nil {
							for j, item := range batchResp.Albums {
								if item.ID == "" {
									continue
								}
								targetAlbum := albumsToFetch[i+j]
								err = store.UpdateReleaseMetadata(ctx, db.UpdateReleaseMetadataParams{
									ID:                   targetAlbum.ID,
									Genres:               item.Genres,
									Popularity:           pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
									ReleaseDate:          pgtype.Text{String: item.ReleaseDate, Valid: true},
									SpotifyID:            pgtype.Text{String: item.ID, Valid: true},
									Label:                pgtype.Text{String: item.Label, Valid: true},
									ReleaseDatePrecision: pgtype.Text{String: item.ReleaseDatePrecision, Valid: true},
								})
								if err == nil {
									processed++
								} else {
									failed++
								}
							}
						}
						resp.Body.Close()
					}

					progress := float64(100+processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(100 * time.Millisecond) // Rate limit between batches
				}

				// Search for albums without SpotifyID (1 by 1 with longer delay)
				for _, album := range albumsToSearch {
					select {
					case <-ctx.Done():
						return
					default:
					}

					searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=album&limit=1", url.QueryEscape(album.Title))
					req, _ := http.NewRequest("GET", searchURL, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					success := false
					if err == nil && resp.StatusCode == http.StatusOK {
						var searchResp struct {
							Albums struct {
								Items []struct {
									ID                   string   `json:"id"`
									Genres               []string `json:"genres"`
									Popularity           int      `json:"popularity"`
									ReleaseDate          string   `json:"release_date"`
									Label                string   `json:"label"`
									ReleaseDatePrecision string   `json:"release_date_precision"`
								} `json:"items"`
							} `json:"albums"`
						}
						if json.NewDecoder(resp.Body).Decode(&searchResp) == nil && len(searchResp.Albums.Items) > 0 {
							item := searchResp.Albums.Items[0]
							err = store.UpdateReleaseMetadata(ctx, db.UpdateReleaseMetadataParams{
								ID:                   album.ID,
								Genres:               item.Genres,
								Popularity:           pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								ReleaseDate:          pgtype.Text{String: item.ReleaseDate, Valid: true},
								SpotifyID:            pgtype.Text{String: item.ID, Valid: true},
								Label:                pgtype.Text{String: item.Label, Valid: true},
								ReleaseDatePrecision: pgtype.Text{String: item.ReleaseDatePrecision, Valid: true},
							})
							if err == nil {
								success = true
							}
						}
						resp.Body.Close()
					}

					if success {
						processed++
						send("log", map[string]string{"message": fmt.Sprintf("Found album: %s", album.Title)})
					} else {
						failed++
					}
					progress := float64(100+processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(150 * time.Millisecond) // Longer delay for search
				}
			}

			// 3. Process Top Tracks
			send("log", map[string]string{"message": "Fetching Top 100 Tracks..."})
			trackResp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   1,
			})
			if err == nil {
				send("log", map[string]string{"message": fmt.Sprintf("Database query returned %d tracks", len(trackResp.Items))})
				if len(trackResp.Items) == 0 {
					send("log", map[string]string{"message": "WARN: No tracks found in database."})
				}

				// Separate tracks with SpotifyID vs those that need search
				var trackIDsToFetch []string
				var tracksToFetch []*models.Track
				var tracksToSearch []*models.Track

				for _, track := range trackResp.Items {
					if track.SpotifyID != "" {
						trackIDsToFetch = append(trackIDsToFetch, track.SpotifyID)
						tracksToFetch = append(tracksToFetch, track)
					} else {
						tracksToSearch = append(tracksToSearch, track)
					}
				}

				// Batch Fetch Tracks (50 at a time)
				for i := 0; i < len(trackIDsToFetch); i += 50 {
					select {
					case <-ctx.Done():
						return
					default:
					}

					end := i + 50
					if end > len(trackIDsToFetch) {
						end = len(trackIDsToFetch)
					}
					batchIDs := trackIDsToFetch[i:end]

					send("log", map[string]string{"message": fmt.Sprintf("Batch fetching %d tracks...", len(batchIDs))})

					// Fetch tracks
					u := "https://api.spotify.com/v1/tracks?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					if err == nil && resp.StatusCode == http.StatusOK {
						var batchResp struct {
							Tracks []struct {
								ID         string `json:"id"`
								Popularity int    `json:"popularity"`
							} `json:"tracks"`
						}
						if err := json.NewDecoder(resp.Body).Decode(&batchResp); err == nil {
							for j, item := range batchResp.Tracks {
								if item.ID == "" {
									continue
								}
								targetTrack := tracksToFetch[i+j]
								err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
									ID:         targetTrack.ID,
									Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
									SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
								})
								if err == nil {
									processed++
								} else {
									failed++
								}
							}
						}
						resp.Body.Close()
					}

					progress := float64(200+processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(100 * time.Millisecond) // Rate limit between batches
				}

				// Search for tracks without SpotifyID (1 by 1 with longer delay)
				for _, track := range tracksToSearch {
					select {
					case <-ctx.Done():
						return
					default:
					}

					searchURL := fmt.Sprintf("https://api.spotify.com/v1/search?q=%s&type=track&limit=1", url.QueryEscape(track.Title))
					req, _ := http.NewRequest("GET", searchURL, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					success := false
					if err == nil && resp.StatusCode == http.StatusOK {
						var searchResp struct {
							Tracks struct {
								Items []struct {
									ID         string `json:"id"`
									Popularity int    `json:"popularity"`
								} `json:"items"`
							} `json:"tracks"`
						}
						if json.NewDecoder(resp.Body).Decode(&searchResp) == nil && len(searchResp.Tracks.Items) > 0 {
							item := searchResp.Tracks.Items[0]
							err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
								ID:         track.ID,
								Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
							})
							if err == nil {
								success = true
							}
						}
						resp.Body.Close()
					}

					if success {
						processed++
						send("log", map[string]string{"message": fmt.Sprintf("Found track: %s", track.Title)})
					} else {
						failed++
					}
					progress := float64(200+processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(150 * time.Millisecond) // Longer delay for search
				}
			}

			// 4. Fetch Audio Features for all tracks with SpotifyID
			send("log", map[string]string{"message": "Fetching Audio Features..."})

			// Collect all track SpotifyIDs from the database
			allTracksResp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  500,
				Page:   1,
			})
			if err == nil {
				var audioFeatureIDs []string
				var audioFeatureTracks []*models.Track

				for _, track := range allTracksResp.Items {
					if track.SpotifyID != "" && track.Tempo == 0 { // Only fetch if we don't have audio features yet
						audioFeatureIDs = append(audioFeatureIDs, track.SpotifyID)
						audioFeatureTracks = append(audioFeatureTracks, track)
					}
				}

				totalAudioBatches := (len(audioFeatureIDs) + 99) / 100
				send("log", map[string]string{"message": fmt.Sprintf("Found %d tracks needing audio features (%d batches)", len(audioFeatureIDs), totalAudioBatches)})

				// Batch fetch audio features (100 at a time)
				for i := 0; i < len(audioFeatureIDs); i += 100 {
					select {
					case <-ctx.Done():
						return
					default:
					}

					end := i + 100
					if end > len(audioFeatureIDs) {
						end = len(audioFeatureIDs)
					}
					batchIDs := audioFeatureIDs[i:end]
					batchNum := (i / 100) + 1

					send("log", map[string]string{"message": fmt.Sprintf("Audio features batch %d/%d (%d tracks)", batchNum, totalAudioBatches, len(batchIDs))})

					u := "https://api.spotify.com/v1/audio-features?ids=" + strings.Join(batchIDs, ",")
					req, _ := http.NewRequest("GET", u, nil)
					req = req.WithContext(ctx)
					req.Header.Set("Authorization", "Bearer "+token)
					resp, err := httpClient.Do(req)

					if err == nil && resp.StatusCode == http.StatusOK {
						var audioResp struct {
							AudioFeatures []struct {
								ID               string  `json:"id"`
								Danceability     float64 `json:"danceability"`
								Energy           float64 `json:"energy"`
								Key              int     `json:"key"`
								Loudness         float64 `json:"loudness"`
								Mode             int     `json:"mode"`
								Speechiness      float64 `json:"speechiness"`
								Acousticness     float64 `json:"acousticness"`
								Instrumentalness float64 `json:"instrumentalness"`
								Liveness         float64 `json:"liveness"`
								Valence          float64 `json:"valence"`
								Tempo            float64 `json:"tempo"`
							} `json:"audio_features"`
						}
						if json.NewDecoder(resp.Body).Decode(&audioResp) == nil {
							for j, af := range audioResp.AudioFeatures {
								if af.ID == "" {
									continue
								}
								targetTrack := audioFeatureTracks[i+j]
								err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
									ID:               targetTrack.ID,
									Danceability:     pgtype.Float8{Float64: af.Danceability, Valid: true},
									Energy:           pgtype.Float8{Float64: af.Energy, Valid: true},
									Key:              pgtype.Int4{Int32: int32(af.Key), Valid: true},
									Loudness:         pgtype.Float8{Float64: af.Loudness, Valid: true},
									Mode:             pgtype.Int4{Int32: int32(af.Mode), Valid: true},
									Speechiness:      pgtype.Float8{Float64: af.Speechiness, Valid: true},
									Acousticness:     pgtype.Float8{Float64: af.Acousticness, Valid: true},
									Instrumentalness: pgtype.Float8{Float64: af.Instrumentalness, Valid: true},
									Liveness:         pgtype.Float8{Float64: af.Liveness, Valid: true},
									Valence:          pgtype.Float8{Float64: af.Valence, Valid: true},
									Tempo:            pgtype.Float8{Float64: af.Tempo, Valid: true},
								})
								if err == nil {
									processed++
								} else {
									failed++
								}
							}
						}
						resp.Body.Close()
					}

					progress := float64(300+processed+failed) / float64(totalSteps) * 100
					send("progress", map[string]interface{}{"percent": progress, "processed": processed, "failed": failed})
					time.Sleep(200 * time.Millisecond) // Rate limit for audio features
				}
			}

			send("complete", map[string]interface{}{"success": true, "processed": processed, "failed": failed})

			// Start background fetch for the rest of the library (Pages 2+)
			StartFullLibraryFetch(ctx, store, user)
		}()

		// Consumer Loop: Write to SSE stream
		for event := range eventChan {
			jsonData, err := json.Marshal(event.Data)
			if err != nil {
				logger.Error().Err(err).Msg("Failed to marshal SSE data")
				continue
			}
			_, err = fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, jsonData)
			if err != nil {
				logger.Error().Err(err).Msg("Failed to write to SSE stream")
				return // Client disconnected or network error
			}
			flusher.Flush()
		}
	}
}
