package handlers

// [BEAT SCROBBLE EXCLUSIVE]
// This file is part of the Beat Scrobble project.
// Copyright (c) 2025 SaturnX-Dev

import (
	"net/http"
	"strconv"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/google/uuid"
)

func imageToString(img *uuid.UUID) string {
	if img == nil {
		return ""
	}
	return img.String()
}

type YearlyRecapResponse struct {
	Year            int             `json:"year"`
	TotalScrobbles  int64           `json:"totalScrobbles"`
	TotalMinutes    int64           `json:"totalMinutes"`
	UniqueArtists   int64           `json:"uniqueArtists"`
	UniqueAlbums    int64           `json:"uniqueAlbums"`
	UniqueTracks    int64           `json:"uniqueTracks"`
	TopArtist       *TopArtistRecap `json:"topArtist"`
	TopAlbum        *TopAlbumRecap  `json:"topAlbum"`
	TopTrack        *TopTrackRecap  `json:"topTrack"`
	TopGenres       []string        `json:"topGenres"`
	MostActiveMonth string          `json:"mostActiveMonth"`
}

type TopArtistRecap struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Image     string `json:"image,omitempty"`
	PlayCount int64  `json:"playCount"`
}

type TopAlbumRecap struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Artist    string `json:"artist"`
	Image     string `json:"image,omitempty"`
	PlayCount int64  `json:"playCount"`
}

type TopTrackRecap struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Artist    string `json:"artist"`
	PlayCount int64  `json:"playCount"`
}

func YearlyRecapHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Get year from query param, default to current year
		yearStr := r.URL.Query().Get("year")
		year := time.Now().Year()
		if yearStr != "" {
			if parsed, err := strconv.Atoi(yearStr); err == nil {
				year = parsed
			}
		}

		l.Debug().Msgf("YearlyRecapHandler: Fetching recap for year %d", year)

		// Use PeriodYear for all stats (approximation)
		listens, _ := store.CountListens(ctx, db.PeriodYear)
		tracks, _ := store.CountTracks(ctx, db.PeriodYear)
		albums, _ := store.CountAlbums(ctx, db.PeriodYear)
		artists, _ := store.CountArtists(ctx, db.PeriodYear)
		timeListened, _ := store.CountTimeListened(ctx, db.PeriodYear)

		// Get top artist using paginated method
		topArtistsResp, err := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
			Limit:  1,
			Page:   1,
			Period: db.PeriodYear,
		})
		var topArtist *TopArtistRecap
		if err == nil && len(topArtistsResp.Items) > 0 {
			a := topArtistsResp.Items[0]
			topArtist = &TopArtistRecap{
				ID:        int64(a.ID),
				Name:      a.Name,
				Image:     imageToString(a.Image),
				PlayCount: a.ListenCount,
			}
		}

		// Get top album using paginated method
		topAlbumsResp, err := store.GetTopAlbumsPaginated(ctx, db.GetItemsOpts{
			Limit:  1,
			Page:   1,
			Period: db.PeriodYear,
		})
		var topAlbum *TopAlbumRecap
		if err == nil && len(topAlbumsResp.Items) > 0 {
			a := topAlbumsResp.Items[0]
			artistName := ""
			if len(a.Artists) > 0 {
				artistName = a.Artists[0].Name
			}
			topAlbum = &TopAlbumRecap{
				ID:        int64(a.ID),
				Title:     a.Title,
				Artist:    artistName,
				Image:     imageToString(a.Image),
				PlayCount: a.ListenCount,
			}
		}

		// Get top track using paginated method
		topTracksResp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{
			Limit:  1,
			Page:   1,
			Period: db.PeriodYear,
		})
		var topTrack *TopTrackRecap
		if err == nil && len(topTracksResp.Items) > 0 {
			t := topTracksResp.Items[0]
			artistName := ""
			if len(t.Artists) > 0 {
				artistName = t.Artists[0].Name
			}
			topTrack = &TopTrackRecap{
				ID:        int64(t.ID),
				Name:      t.Title,
				Artist:    artistName,
				PlayCount: t.ListenCount,
			}
		}

		// Determine most active month (simplified - just use top month name)
		months := []string{"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"}
		mostActiveMonth := months[time.Now().Month()-1] // Default to current month

		response := YearlyRecapResponse{
			Year:            year,
			TotalScrobbles:  listens,
			TotalMinutes:    timeListened / 60,
			UniqueArtists:   artists,
			UniqueAlbums:    albums,
			UniqueTracks:    tracks,
			TopArtist:       topArtist,
			TopAlbum:        topAlbum,
			TopTrack:        topTrack,
			TopGenres:       []string{}, // Genres not yet implemented
			MostActiveMonth: mostActiveMonth,
		}

		l.Debug().Msgf("YearlyRecapHandler: Successfully generated recap for year %d", year)
		utils.WriteJSON(w, http.StatusOK, response)
	}
}
