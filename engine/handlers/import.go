package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gabehf/koito/engine/middleware"
	"github.com/gabehf/koito/internal/db"
	"github.com/gabehf/koito/internal/logger"
	"github.com/gabehf/koito/internal/utils"
)

type KoitoImport struct {
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

		var importData KoitoImport
		if err := json.Unmarshal(body, &importData); err != nil {
			l.Error().Err(err).Msg("ImportHandler: Invalid JSON")
			utils.WriteError(w, "invalid import file format", http.StatusBadRequest)
			return
		}

		// Restore Preferences
		if importData.Preferences != nil && len(importData.Preferences) > 0 {
			prefBytes, err := json.Marshal(importData.Preferences)
			if err == nil {
				if err := store.SaveUserPreferences(ctx, user.ID, prefBytes); err != nil {
					l.Error().Err(err).Msg("ImportHandler: Failed to save preferences")
				} else {
					l.Info().Msg("ImportHandler: Preferences restored")
				}
			}
		}

		// Restore Theme
		if len(importData.Theme) > 0 {
			if err := store.SaveUserTheme(ctx, user.ID, []byte(importData.Theme)); err != nil {
				l.Error().Err(err).Msg("ImportHandler: Failed to save theme")
			} else {
				l.Info().Msg("ImportHandler: Theme restored")
			}
		}

		// Scrobbles import is complex (needs deduplication, artist/album/track resolution)
		// For now, we only restore settings. Scrobble import can be added later.

		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Settings restored successfully. Scrobble import is not yet supported.",
		})
	}
}
