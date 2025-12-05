package handlers

// [BEAT SCROBBLE EXCLUSIVE]
// This file is part of the Beat Scrobble project.
// Copyright (c) 2025 SaturnX-Dev

import (
	"encoding/json"
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func uuidToString(img *uuid.UUID) string {
	if img == nil {
		return ""
	}
	return img.String()
}

type PublicProfileResponse struct {
	Username        string                 `json:"username"`
	Stats           PublicStatsResponse    `json:"stats"`
	TopArtists      []PublicTopArtist      `json:"topArtists"`
	TopAlbums       []PublicTopAlbum       `json:"topAlbums"`
	Theme           json.RawMessage        `json:"theme,omitempty"`
	ProfileImage    string                 `json:"profileImage,omitempty"`
	BackgroundImage string                 `json:"backgroundImage,omitempty"`
	Preferences     map[string]interface{} `json:"preferences,omitempty"`
}

type PublicStatsResponse struct {
	ListenCount     int64 `json:"listen_count"`
	ArtistCount     int64 `json:"artist_count"`
	AlbumCount      int64 `json:"album_count"`
	TrackCount      int64 `json:"track_count"`
	MinutesListened int64 `json:"minutes_listened"`
}

type PublicTopArtist struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Image       string `json:"image,omitempty"`
	ListenCount int64  `json:"listen_count"`
}

type PublicTopAlbum struct {
	ID          int64               `json:"id"`
	Title       string              `json:"title"`
	Image       string              `json:"image,omitempty"`
	Artists     []PublicAlbumArtist `json:"artists"`
	ListenCount int64               `json:"listen_count"`
}

type PublicAlbumArtist struct {
	Name string `json:"name"`
}

func PublicProfileHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		username := chi.URLParam(r, "username")
		if username == "" {
			utils.WriteError(w, "username required", http.StatusBadRequest)
			return
		}

		l.Debug().Msgf("PublicProfileHandler: Fetching public profile for user %s", username)

		// Get user by username
		user, err := store.GetUserByUsername(ctx, username)
		if err != nil {
			l.Debug().Err(err).Msg("User not found")
			utils.WriteError(w, "profile not found", http.StatusNotFound)
			return
		}

		// Check if user has enabled public profile sharing
		prefBytes, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Debug().Err(err).Msg("Failed to get user preferences")
			utils.WriteError(w, "profile not found", http.StatusNotFound)
			return
		}

		var prefs map[string]interface{}
		if prefBytes != nil {
			if err := json.Unmarshal(prefBytes, &prefs); err != nil {
				l.Error().Err(err).Msg("Failed to unmarshal preferences")
				utils.WriteError(w, "internal error", http.StatusInternalServerError)
				return
			}
		}

		shareEnabled, _ := prefs["profile_share_enabled"].(bool)
		if !shareEnabled {
			utils.WriteError(w, "profile sharing is disabled", http.StatusForbidden)
			return
		}

		// Get user theme for public profile
		themeData, _ := store.GetUserTheme(ctx, user.ID)

		// Extract profile image and public preferences
		profileImage, _ := prefs["profile_image"].(string)
		backgroundImage, _ := prefs["background_image"].(string)

		// Build public preferences (only theme-related ones)
		publicPrefs := make(map[string]interface{})
		if publicTheme, ok := prefs["public_profile_theme"]; ok {
			publicPrefs["public_profile_theme"] = publicTheme
		}
		if showAI, ok := prefs["public_profile_show_ai"]; ok {
			publicPrefs["public_profile_show_ai"] = showAI
		}
		if customColors, ok := prefs["customElementColors"]; ok {
			publicPrefs["customElementColors"] = customColors
		}
		if bgType, ok := prefs["customBackgroundType"]; ok {
			publicPrefs["customBackgroundType"] = bgType
		}
		if bgUrl, ok := prefs["customBackgroundUrl"]; ok {
			publicPrefs["customBackgroundUrl"] = bgUrl
		}

		// Fetch public stats (all time)
		listens, _ := store.CountListens(ctx, db.PeriodAllTime)
		tracks, _ := store.CountTracks(ctx, db.PeriodAllTime)
		albums, _ := store.CountAlbums(ctx, db.PeriodAllTime)
		artists, _ := store.CountArtists(ctx, db.PeriodAllTime)
		timeListened, _ := store.CountTimeListened(ctx, db.PeriodAllTime)

		// Fetch top artists using paginated method
		topArtistsResp, _ := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
			Limit:  5,
			Page:   1,
			Period: db.PeriodAllTime,
		})
		topArtists := make([]PublicTopArtist, 0)
		if topArtistsResp != nil {
			for _, a := range topArtistsResp.Items {
				topArtists = append(topArtists, PublicTopArtist{
					ID:          int64(a.ID),
					Name:        a.Name,
					Image:       uuidToString(a.Image),
					ListenCount: a.ListenCount,
				})
			}
		}

		// Fetch top albums using paginated method
		topAlbumsResp, _ := store.GetTopAlbumsPaginated(ctx, db.GetItemsOpts{
			Limit:  5,
			Page:   1,
			Period: db.PeriodAllTime,
		})
		topAlbums := make([]PublicTopAlbum, 0)
		if topAlbumsResp != nil {
			for _, a := range topAlbumsResp.Items {
				albumArtists := make([]PublicAlbumArtist, 0, len(a.Artists))
				for _, artist := range a.Artists {
					albumArtists = append(albumArtists, PublicAlbumArtist{Name: artist.Name})
				}
				topAlbums = append(topAlbums, PublicTopAlbum{
					ID:          int64(a.ID),
					Title:       a.Title,
					Image:       uuidToString(a.Image),
					Artists:     albumArtists,
					ListenCount: a.ListenCount,
				})
			}
		}

		response := PublicProfileResponse{
			Username: username,
			Stats: PublicStatsResponse{
				ListenCount:     listens,
				ArtistCount:     artists,
				AlbumCount:      albums,
				TrackCount:      tracks,
				MinutesListened: timeListened / 60,
			},
			TopArtists:      topArtists,
			TopAlbums:       topAlbums,
			Theme:           themeData,
			ProfileImage:    profileImage,
			BackgroundImage: backgroundImage,
			Preferences:     publicPrefs,
		}

		l.Debug().Msgf("PublicProfileHandler: Successfully fetched public profile for %s", username)
		utils.WriteJSON(w, http.StatusOK, response)
	}
}
