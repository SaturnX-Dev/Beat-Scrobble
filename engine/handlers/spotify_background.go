package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/spotify"
	"github.com/jackc/pgx/v5/pgtype"
)

// StartFullLibraryFetch runs in the background to fetch the rest of the library
func StartFullLibraryFetch(ctx context.Context, store db.DB, user *models.User) {
	// Use a detached context for background work, but inherit values if needed
	// Actually, just use Background with logger attached if possible, or just Background
	bgCtx := context.Background()
	l := logger.FromContext(ctx)
	// Re-attach logger to background context if needed, or just use 'l' for logging locally

	l.Info().Msg("Starting Background Full Library Fetch...")

	client := spotify.NewClient(store, user.ID)

	// Strict Rate Limit used between batches to avoid API bans during long runs
	sleepTime := 1500 * time.Millisecond

	httpClient := &http.Client{Timeout: 10 * time.Second}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				l.Error().Interface("recover", r).Msg("Background fetch panicked")
			}
		}()

		// 1. Process Artists (Starting from Page 2)
		page := 2
		for {
			token, err := client.GetToken(bgCtx)
			if err != nil {
				l.Error().Err(err).Msg("Background Fetch: Failed to get token")
				return
			}

			opts := db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   page,
			}
			artistResp, err := store.GetTopArtistsPaginated(bgCtx, opts)
			if err != nil {
				l.Error().Err(err).Msg("Background Fetch: Failed to get artists page")
				break
			}
			if len(artistResp.Items) == 0 {
				break
			}

			l.Info().Int("page", page).Msg("Background: Fetching Artists Page")

			// Separate items that have SpotifyID
			var idsToFetch []string
			var itemsToFetch []*models.Artist

			for _, artist := range artistResp.Items {
				if artist.SpotifyID != "" {
					idsToFetch = append(idsToFetch, artist.SpotifyID)
					itemsToFetch = append(itemsToFetch, artist)
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
					if json.NewDecoder(resp.Body).Decode(&batchResp) == nil {
						for j, item := range batchResp.Artists {
							if item.ID == "" {
								continue
							}
							targetArtist := itemsToFetch[i+j]
							// Update DB
							store.UpdateArtistMetadata(bgCtx, db.UpdateArtistMetadataParams{
								ID:         targetArtist.ID,
								Genres:     item.Genres,
								Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
								Followers:  pgtype.Int4{Int32: int32(item.Followers.Total), Valid: true},
								Bio:        pgtype.Text{Valid: false},
							})
						}
					}
					resp.Body.Close()
				}
				time.Sleep(sleepTime)
			}

			page++
			time.Sleep(sleepTime)
		}

		// 2. Process Albums (Starting from Page 2)
		page = 2
		for {
			token, err := client.GetToken(bgCtx)
			if err != nil {
				return
			}

			opts := db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   page,
			}
			albumResp, err := store.GetTopAlbumsPaginated(bgCtx, opts)
			if err != nil {
				break
			}
			if len(albumResp.Items) == 0 {
				break
			}

			l.Info().Int("page", page).Msg("Background: Fetching Albums Page")

			var idsToFetch []string
			var itemsToFetch []*models.Album
			for _, album := range albumResp.Items {
				if album.SpotifyID != "" {
					idsToFetch = append(idsToFetch, album.SpotifyID)
					itemsToFetch = append(itemsToFetch, album)
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
					if json.NewDecoder(resp.Body).Decode(&batchResp) == nil {
						for j, item := range batchResp.Albums {
							if item.ID == "" {
								continue
							}
							targetAlbum := itemsToFetch[i+j]
							store.UpdateReleaseMetadata(bgCtx, db.UpdateReleaseMetadataParams{
								ID:                   targetAlbum.ID,
								Genres:               item.Genres,
								Popularity:           pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								ReleaseDate:          pgtype.Text{String: item.ReleaseDate, Valid: true},
								SpotifyID:            pgtype.Text{String: item.ID, Valid: true},
								Label:                pgtype.Text{String: item.Label, Valid: true},
								ReleaseDatePrecision: pgtype.Text{String: item.ReleaseDatePrecision, Valid: true},
							})
						}
					}
					resp.Body.Close()
				}
				time.Sleep(sleepTime)
			}
			page++
			time.Sleep(sleepTime)
		}

		// 3. Process Tracks & Audio Features (Starting from Page 2)
		// NOTE: Audio Features fetching is expensive. We do it in batches of 100.
		page = 2
		for {
			token, err := client.GetToken(bgCtx)
			if err != nil {
				return
			}

			opts := db.GetItemsOpts{
				UserID: int(user.ID),
				Period: db.PeriodAllTime,
				Limit:  100,
				Page:   page,
			}
			trackResp, err := store.GetTopTracksPaginated(bgCtx, opts)
			if err != nil {
				break
			}
			if len(trackResp.Items) == 0 {
				break
			}

			l.Info().Int("page", page).Msg("Background: Fetching Tracks Page")

			var idsToFetch []string
			var itemsToFetch []*models.Track
			for _, track := range trackResp.Items {
				if track.SpotifyID != "" {
					idsToFetch = append(idsToFetch, track.SpotifyID)
					itemsToFetch = append(itemsToFetch, track)
				}
			}

			// Fetch Metadata (Popularity)
			for i := 0; i < len(idsToFetch); i += 50 {
				end := i + 50
				if end > len(idsToFetch) {
					end = len(idsToFetch)
				}
				batchIDs := idsToFetch[i:end]

				u := "https://api.spotify.com/v1/tracks?ids=" + strings.Join(batchIDs, ",")
				req, _ := http.NewRequest("GET", u, nil)
				req.Header.Set("Authorization", "Bearer "+token)
				resp, err := httpClient.Do(req)

				if err == nil && resp.StatusCode == http.StatusOK {
					var batchResp struct {
						Tracks []struct {
							ID         string `json:"id"`
							Popularity int    `json:"popularity"`
						} `json:"tracks"`
					}
					if json.NewDecoder(resp.Body).Decode(&batchResp) == nil {
						for j, item := range batchResp.Tracks {
							if item.ID == "" {
								continue
							}
							targetTrack := itemsToFetch[i+j]
							store.UpdateTrackMetadata(bgCtx, db.UpdateTrackMetadataParams{
								ID:         targetTrack.ID,
								Popularity: pgtype.Int4{Int32: int32(item.Popularity), Valid: true},
								SpotifyID:  pgtype.Text{String: item.ID, Valid: true},
							})
						}
					}
					resp.Body.Close()
				}
				time.Sleep(sleepTime)
			}

			// Audio Features (reusing idsToFetch)
			// Only for Tracks that don't have Tempo (assumption: Tempo=0 means no audio features)
			// But since we are paginating all, we can just update all or check inside loop.
			// Optimization: Filter idsToFetch for those needing features.
			// For simplicity in background, we'll just fetch for all in this batch to be sure.

			for i := 0; i < len(idsToFetch); i += 100 {
				end := i + 100
				if end > len(idsToFetch) {
					end = len(idsToFetch)
				}
				batchIDs := idsToFetch[i:end]

				u := "https://api.spotify.com/v1/audio-features?ids=" + strings.Join(batchIDs, ",")
				req, _ := http.NewRequest("GET", u, nil)
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
						for _, af := range audioResp.AudioFeatures {
							if af.ID == "" {
								continue
							}
							// Find internal ID
							var internalID int32
							for _, t := range itemsToFetch {
								if t.SpotifyID == af.ID {
									internalID = t.ID
									break
								}
							}
							if internalID == 0 {
								continue
							}

							store.UpdateTrackMetadata(bgCtx, db.UpdateTrackMetadataParams{
								ID:               internalID,
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
						}
					}
					resp.Body.Close()
				}
				time.Sleep(sleepTime)
			}

			page++
			time.Sleep(sleepTime)
		}

		// Notify Completion
		l.Info().Msg("Background Full Library Fetch Completed. Sending notification.")
		NotificationManager.Add(user.ID, Notification{
			ID:      "spotify_sync_complete",
			Type:    "success",
			Message: "Full Spotify Library Sync Complete",
		})
	}()
}
