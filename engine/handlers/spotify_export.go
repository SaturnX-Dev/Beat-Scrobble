package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/jackc/pgx/v5/pgtype"
)

// SpotifyMetadataExport is the structure for the export JSON
type SpotifyMetadataExport struct {
	Version    string                `json:"version"`
	ExportedAt time.Time             `json:"exported_at"`
	Artists    []SpotifyArtistExport `json:"artists"`
	Albums     []SpotifyAlbumExport  `json:"albums"`
	Tracks     []SpotifyTrackExport  `json:"tracks"`
}

type SpotifyArtistExport struct {
	Name       string   `json:"name"`
	SpotifyID  string   `json:"spotify_id,omitempty"`
	Genres     []string `json:"genres,omitempty"`
	Popularity int      `json:"popularity,omitempty"`
	Followers  int      `json:"followers,omitempty"`
	Bio        string   `json:"bio,omitempty"`
}

type SpotifyAlbumExport struct {
	Title                string   `json:"title"`
	Artist               string   `json:"artist,omitempty"`
	SpotifyID            string   `json:"spotify_id,omitempty"`
	Genres               []string `json:"genres,omitempty"`
	Popularity           int      `json:"popularity,omitempty"`
	ReleaseDate          string   `json:"release_date,omitempty"`
	Label                string   `json:"label,omitempty"`
	ReleaseDatePrecision string   `json:"release_date_precision,omitempty"`
}

type SpotifyTrackExport struct {
	Title            string  `json:"title"`
	Artist           string  `json:"artist,omitempty"`
	SpotifyID        string  `json:"spotify_id,omitempty"`
	Popularity       int     `json:"popularity,omitempty"`
	Danceability     float64 `json:"danceability,omitempty"`
	Energy           float64 `json:"energy,omitempty"`
	Key              int     `json:"key,omitempty"`
	Loudness         float64 `json:"loudness,omitempty"`
	Mode             int     `json:"mode,omitempty"`
	Speechiness      float64 `json:"speechiness,omitempty"`
	Acousticness     float64 `json:"acousticness,omitempty"`
	Instrumentalness float64 `json:"instrumentalness,omitempty"`
	Liveness         float64 `json:"liveness,omitempty"`
	Valence          float64 `json:"valence,omitempty"`
	Tempo            float64 `json:"tempo,omitempty"`
}

// ExportSpotifyMetadataHandler exports all Spotify metadata to JSON
func ExportSpotifyMetadataHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		l.Info().Msg("ExportSpotifyMetadataHandler: Starting metadata export")

		// Get all artists with Spotify metadata
		artistsResp, err := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
			Period: db.PeriodAllTime,
			Limit:  10000,
			Page:   1,
		})
		if err != nil {
			l.Error().Err(err).Msg("Failed to get artists")
			utils.WriteError(w, "failed to get artists", http.StatusInternalServerError)
			return
		}

		var exportArtists []SpotifyArtistExport
		for _, a := range artistsResp.Items {
			if a.SpotifyID != "" || len(a.Genres) > 0 || a.Popularity > 0 {
				ea := SpotifyArtistExport{
					Name:       a.Name,
					SpotifyID:  a.SpotifyID,
					Genres:     a.Genres,
					Popularity: int(a.Popularity),
					Followers:  int(a.Followers),
					Bio:        a.Bio,
				}
				exportArtists = append(exportArtists, ea)
			}
		}

		// Get all albums with Spotify metadata
		albumsResp, err := store.GetTopAlbumsPaginated(ctx, db.GetItemsOpts{
			Period: db.PeriodAllTime,
			Limit:  10000,
			Page:   1,
		})
		if err != nil {
			l.Error().Err(err).Msg("Failed to get albums")
			utils.WriteError(w, "failed to get albums", http.StatusInternalServerError)
			return
		}

		var exportAlbums []SpotifyAlbumExport
		for _, a := range albumsResp.Items {
			if a.SpotifyID != "" || len(a.Genres) > 0 || a.Popularity > 0 {
				artistName := ""
				if len(a.Artists) > 0 {
					artistName = a.Artists[0].Name
				}
				ea := SpotifyAlbumExport{
					Title:                a.Title,
					Artist:               artistName,
					SpotifyID:            a.SpotifyID,
					Genres:               a.Genres,
					Popularity:           int(a.Popularity),
					ReleaseDate:          a.ReleaseDate,
					Label:                a.Label,
					ReleaseDatePrecision: a.ReleaseDatePrecision,
				}
				exportAlbums = append(exportAlbums, ea)
			}
		}

		// Get all tracks with Spotify metadata
		tracksResp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{
			Period: db.PeriodAllTime,
			Limit:  10000,
			Page:   1,
		})
		if err != nil {
			l.Error().Err(err).Msg("Failed to get tracks")
			utils.WriteError(w, "failed to get tracks", http.StatusInternalServerError)
			return
		}

		var exportTracks []SpotifyTrackExport
		for _, t := range tracksResp.Items {
			if t.SpotifyID != "" || t.Popularity > 0 || t.Tempo > 0 {
				artistName := ""
				if len(t.Artists) > 0 {
					artistName = t.Artists[0].Name
				}
				et := SpotifyTrackExport{
					Title:            t.Title,
					Artist:           artistName,
					SpotifyID:        t.SpotifyID,
					Popularity:       int(t.Popularity),
					Danceability:     t.Danceability,
					Energy:           t.Energy,
					Key:              int(t.Key),
					Loudness:         t.Loudness,
					Mode:             int(t.Mode),
					Speechiness:      t.Speechiness,
					Acousticness:     t.Acousticness,
					Instrumentalness: t.Instrumentalness,
					Liveness:         t.Liveness,
					Valence:          t.Valence,
					Tempo:            t.Tempo,
				}
				exportTracks = append(exportTracks, et)
			}
		}

		export := SpotifyMetadataExport{
			Version:    "1",
			ExportedAt: time.Now().UTC(),
			Artists:    exportArtists,
			Albums:     exportAlbums,
			Tracks:     exportTracks,
		}

		l.Info().
			Int("artists", len(exportArtists)).
			Int("albums", len(exportAlbums)).
			Int("tracks", len(exportTracks)).
			Msg("ExportSpotifyMetadataHandler: Export complete")

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", `attachment; filename="beat_scrobble_spotify_metadata.json"`)
		json.NewEncoder(w).Encode(export)
	}
}

// ImportSpotifyMetadataHandler imports Spotify metadata from JSON
func ImportSpotifyMetadataHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		l.Info().Msg("ImportSpotifyMetadataHandler: Starting metadata import")

		var importData SpotifyMetadataExport
		if err := json.NewDecoder(r.Body).Decode(&importData); err != nil {
			utils.WriteError(w, "invalid json", http.StatusBadRequest)
			return
		}

		var artistsUpdated, albumsUpdated, tracksUpdated int

		// Import artists
		for _, a := range importData.Artists {
			if a.Name == "" {
				continue
			}
			// Find artist by name
			artist, err := store.GetArtist(ctx, db.GetArtistOpts{Name: a.Name})
			if err != nil || artist == nil {
				continue
			}

			// Update metadata using existing function
			err = store.UpdateArtistMetadata(ctx, db.UpdateArtistMetadataParams{
				ID:         artist.ID,
				SpotifyID:  pgtype.Text{String: a.SpotifyID, Valid: a.SpotifyID != ""},
				Genres:     a.Genres,
				Popularity: pgtype.Int4{Int32: int32(a.Popularity), Valid: a.Popularity > 0},
				Followers:  pgtype.Int4{Int32: int32(a.Followers), Valid: a.Followers > 0},
				Bio:        pgtype.Text{String: a.Bio, Valid: a.Bio != ""},
			})
			if err == nil {
				artistsUpdated++
			}
		}

		// Import albums
		for _, a := range importData.Albums {
			if a.Title == "" {
				continue
			}
			// Find album by title
			album, err := store.GetAlbum(ctx, db.GetAlbumOpts{Title: a.Title})
			if err != nil || album == nil {
				continue
			}

			// Update metadata using existing function
			err = store.UpdateReleaseMetadata(ctx, db.UpdateReleaseMetadataParams{
				ID:                   album.ID,
				SpotifyID:            pgtype.Text{String: a.SpotifyID, Valid: a.SpotifyID != ""},
				Genres:               a.Genres,
				Popularity:           pgtype.Int4{Int32: int32(a.Popularity), Valid: a.Popularity > 0},
				ReleaseDate:          pgtype.Text{String: a.ReleaseDate, Valid: a.ReleaseDate != ""},
				Label:                pgtype.Text{String: a.Label, Valid: a.Label != ""},
				ReleaseDatePrecision: pgtype.Text{String: a.ReleaseDatePrecision, Valid: a.ReleaseDatePrecision != ""},
			})
			if err == nil {
				albumsUpdated++
			}
		}

		// Import tracks
		for _, t := range importData.Tracks {
			if t.Title == "" {
				continue
			}
			// Find track by title
			track, err := store.GetTrack(ctx, db.GetTrackOpts{Title: t.Title})
			if err != nil || track == nil {
				continue
			}

			// Update metadata using existing function
			err = store.UpdateTrackMetadata(ctx, db.UpdateTrackMetadataParams{
				ID:               track.ID,
				SpotifyID:        pgtype.Text{String: t.SpotifyID, Valid: t.SpotifyID != ""},
				Popularity:       pgtype.Int4{Int32: int32(t.Popularity), Valid: t.Popularity > 0},
				Danceability:     pgtype.Float8{Float64: t.Danceability, Valid: t.Danceability > 0},
				Energy:           pgtype.Float8{Float64: t.Energy, Valid: t.Energy > 0},
				Key:              pgtype.Int4{Int32: int32(t.Key), Valid: true},
				Loudness:         pgtype.Float8{Float64: t.Loudness, Valid: true},
				Mode:             pgtype.Int4{Int32: int32(t.Mode), Valid: true},
				Speechiness:      pgtype.Float8{Float64: t.Speechiness, Valid: t.Speechiness > 0},
				Acousticness:     pgtype.Float8{Float64: t.Acousticness, Valid: t.Acousticness > 0},
				Instrumentalness: pgtype.Float8{Float64: t.Instrumentalness, Valid: t.Instrumentalness > 0},
				Liveness:         pgtype.Float8{Float64: t.Liveness, Valid: t.Liveness > 0},
				Valence:          pgtype.Float8{Float64: t.Valence, Valid: t.Valence > 0},
				Tempo:            pgtype.Float8{Float64: t.Tempo, Valid: t.Tempo > 0},
			})
			if err == nil {
				tracksUpdated++
			}
		}

		l.Info().
			Int("artists", artistsUpdated).
			Int("albums", albumsUpdated).
			Int("tracks", tracksUpdated).
			Msg("ImportSpotifyMetadataHandler: Import complete")

		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"message":         "Spotify metadata imported successfully",
			"artists_updated": artistsUpdated,
			"albums_updated":  albumsUpdated,
			"tracks_updated":  tracksUpdated,
		})
	}
}
