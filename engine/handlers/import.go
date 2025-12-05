package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strconv"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
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
	Listens     []interface{}          `json:"listens"`
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

		// Limit file size to 100MB for large listen histories
		r.Body = http.MaxBytesReader(w, r.Body, 100<<20)

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

		prefsRestored := false
		themeRestored := false
		listensPending := 0

		// Restore Preferences (v2 only)
		if importData.Preferences != nil && len(importData.Preferences) > 0 {
			// Get current preferences first to merge
			currentPrefBytes, err := store.GetUserPreferences(ctx, user.ID)
			var currentPrefs map[string]interface{}
			if err == nil && currentPrefBytes != nil {
				json.Unmarshal(currentPrefBytes, &currentPrefs)
			}
			if currentPrefs == nil {
				currentPrefs = make(map[string]interface{})
			}

			// Merge imported preferences into current ones
			// This preserves local keys (like AI cache) that might not be in the import
			for k, v := range importData.Preferences {
				currentPrefs[k] = v
			}

			mergedPrefBytes, err := json.Marshal(currentPrefs)
			if err == nil {
				if err := store.SaveUserPreferences(ctx, user.ID, mergedPrefBytes); err != nil {
					l.Error().Err(err).Msg("ImportHandler: Failed to save preferences")
				} else {
					l.Info().Msg("ImportHandler: Preferences restored (merged)")
					prefsRestored = true
				}
			}
		}

		// Restore Theme (v2 only)
		if len(importData.Theme) > 0 && string(importData.Theme) != "null" {
			if err := store.SaveUserTheme(ctx, user.ID, []byte(importData.Theme)); err != nil {
				l.Error().Err(err).Msg("ImportHandler: Failed to save theme")
			} else {
				l.Info().Msg("ImportHandler: Theme restored")
				themeRestored = true
			}
		}

		// Queue Listens for import (v1 and v2)
		// Write to import directory so the importer picks it up on next restart
		if len(importData.Listens) > 0 {
			listensPending = len(importData.Listens)
			l.Info().Msgf("ImportHandler: Found %d listens to import", listensPending)

			// Write the body to import directory for processing
			timestamp := time.Now().UnixMilli()
			filename := fmt.Sprintf("web_import_%d_koito.json", timestamp)
			importPath := path.Join(cfg.ConfigDir(), "import", filename)

			err := os.WriteFile(importPath, body, 0644)
			if err != nil {
				l.Error().Err(err).Msg("ImportHandler: Failed to write import file")
				utils.WriteError(w, "failed to queue import file", http.StatusInternalServerError)
				return
			}
			l.Info().Msgf("ImportHandler: Listens queued for import in file %s", filename)
		}

		// Build response based on what was restored
		var message string
		if importData.Version == "1" {
			if listensPending > 0 {
				message = "Legacy export (v1) received! " +
					strconv.Itoa(listensPending) + " listens will be imported on next restart."
			} else {
				message = "Legacy export (v1) detected but no listens were found."
			}
		} else {
			// v2 format
			parts := []string{}
			if prefsRestored {
				parts = append(parts, "settings")
			}
			if themeRestored {
				parts = append(parts, "theme")
			}
			if listensPending > 0 {
				parts = append(parts, strconv.Itoa(listensPending)+" listens (pending restart)")
			}

			if len(parts) > 0 {
				message = "Successfully processed: " + joinStrings(parts, ", ")
			} else {
				message = "Import completed, but no data was found to restore."
			}
		}

		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success":        true,
			"message":        message,
			"version":        importData.Version,
			"prefsRestored":  prefsRestored,
			"themeRestored":  themeRestored,
			"listensPending": listensPending,
		})
	}
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
