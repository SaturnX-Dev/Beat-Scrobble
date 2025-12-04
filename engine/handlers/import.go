package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

type BeatScrobbleImport struct {
	Version     string                 `json:"version"`
	ExportedAt  time.Time              `json:"exported_at"`
	User        string                 `json:"user"`
	Preferences map[string]interface{} `json:"preferences"`
	Theme       json.RawMessage        `json:"theme"`
	Listens     []interface{}          `json:"listens"` // Ignored for now
}

func ImportHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Limit file size to 50MB
		r.Body = http.MaxBytesReader(w, r.Body, 50<<20)

		body, err := io.ReadAll(r.Body)
		if err != nil {
			l.Error().Err(err).Msg("ImportHandler: Failed to read body")
			utils.WriteError(w, "failed to read request body", http.StatusBadRequest)
			return
		}

		var importData BeatScrobbleImport
		if err := json.Unmarshal(body, &importData); err != nil {
			l.Error().Err(err).Msg("ImportHandler: Invalid JSON")
			utils.WriteError(w, "invalid import file format", http.StatusBadRequest)
			return
		}

		// Restore Preferences
		prefsRestored := false
		if importData.Preferences != nil && len(importData.Preferences) > 0 {
			prefBytes, err := json.Marshal(importData.Preferences)
			if err == nil {
				if err := store.SaveUserPreferences(ctx, user.ID, prefBytes); err != nil {
					l.Error().Err(err).Msg("ImportHandler: Failed to save preferences")
				} else {
					l.Info().Msg("ImportHandler: Preferences restored")
					prefsRestored = true
				}
			}
		}

		// Restore Theme
		themeRestored := false
		if len(importData.Theme) > 0 {
			if err := store.SaveUserTheme(ctx, user.ID, []byte(importData.Theme)); err != nil {
				l.Error().Err(err).Msg("ImportHandler: Failed to save theme")
			} else {
				l.Info().Msg("ImportHandler: Theme restored")
				themeRestored = true
			}
		}

		// Build response based on what was restored
		var message string
		if importData.Version == "1" || (!prefsRestored && !themeRestored) {
			// Legacy v1 file detected
			message = "Legacy export (v1) detected. This file only contains listening history. To backup settings and themes, use 'Full Backup' (v2) next time."
		} else if prefsRestored && themeRestored {
			message = "Settings and theme restored successfully!"
		} else if prefsRestored {
			message = "Settings restored successfully!"
		} else if themeRestored {
			message = "Theme restored successfully!"
		} else {
			message = "Import completed, but no settings or theme were found to restore."
		}

		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success":       true,
			"message":       message,
			"version":       importData.Version,
			"prefsRestored": prefsRestored,
			"themeRestored": themeRestored,
		})
	}
}
