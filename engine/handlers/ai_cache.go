package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

// ClearAICacheHandler clears the cached AI critiques when prompts are updated
func ClearAICacheHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Get current preferences
		prefBytes, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("Failed to get user preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		var prefs map[string]interface{}
		if prefBytes != nil {
			if err := json.Unmarshal(prefBytes, &prefs); err != nil {
				l.Error().Err(err).Msg("Failed to unmarshal preferences")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
		} else {
			prefs = make(map[string]interface{})
		}

		clearedCount := 0

		// Clear profile critiques cache
		if _, exists := prefs["profile_critiques"]; exists {
			delete(prefs, "profile_critiques")
			clearedCount++
		}

		// Clear all track critiques (Now Playing cache)
		// Keys are in format: comet_ai_track_{trackId}
		keysToDelete := []string{}
		for key := range prefs {
			if strings.HasPrefix(key, "comet_ai_track_") || strings.HasPrefix(key, "comet_ai_profile_") {
				keysToDelete = append(keysToDelete, key)
			}
		}
		for _, key := range keysToDelete {
			delete(prefs, key)
			clearedCount++
		}

		// Clear playlist cache if exists
		if _, exists := prefs["ai_playlists_cache"]; exists {
			delete(prefs, "ai_playlists_cache")
			clearedCount++
		}

		// Save updated preferences
		newPrefBytes, err := json.Marshal(prefs)
		if err != nil {
			l.Error().Err(err).Msg("Failed to marshal preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		if err := store.SaveUserPreferences(ctx, user.ID, newPrefBytes); err != nil {
			l.Error().Err(err).Msg("Failed to save preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		l.Info().Int("cleared_count", clearedCount).Msg("AI cache cleared successfully")
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"message":       "AI cache cleared successfully",
			"cleared_count": clearedCount,
		})
	}
}

// ExportAICacheHandler exports only the AI cache data
func ExportAICacheHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", `attachment; filename="beat_scrobble_ai_cache.json"`)

		ctx := r.Context()
		l := logger.FromContext(ctx)
		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Get current preferences
		prefBytes, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("Failed to get user preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		var prefs map[string]interface{}
		if prefBytes != nil {
			if err := json.Unmarshal(prefBytes, &prefs); err != nil {
				l.Error().Err(err).Msg("Failed to unmarshal preferences")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
		}

		// Extract only AI cache data
		cacheData := make(map[string]interface{})
		count := 0

		for k, v := range prefs {
			isCache := false
			if k == "profile_critiques" {
				isCache = true
			} else if k == "ai_playlists_cache" {
				isCache = true
			} else if len(k) >= 15 && k[:15] == "comet_ai_track_" {
				isCache = true
			} else if strings.HasPrefix(k, "comet_ai_profile_") {
				isCache = true
			}

			if isCache {
				cacheData[k] = v
				count++
			}
		}

		l.Info().Int("count", count).Msg("Exporting AI cache items")
		if err := json.NewEncoder(w).Encode(cacheData); err != nil {
			l.Error().Err(err).Msg("Failed to encode cache export")
		}
	}
}

// ImportAICacheHandler imports AI cache data from a JSON file
func ImportAICacheHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)
		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse uploaded JSON
		var importedCache map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&importedCache); err != nil {
			utils.WriteError(w, "invalid json", http.StatusBadRequest)
			return
		}

		// Get current preferences
		prefBytes, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("Failed to get user preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		var prefs map[string]interface{}
		if prefBytes != nil {
			if err := json.Unmarshal(prefBytes, &prefs); err != nil {
				l.Error().Err(err).Msg("Failed to unmarshal preferences")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
		} else {
			prefs = make(map[string]interface{})
		}

		// Merge cache data
		importedCount := 0
		for k, v := range importedCache {
			// Validate keys to ensure we only import cache data
			isCache := false
			if k == "profile_critiques" {
				isCache = true
			} else if k == "ai_playlists_cache" {
				isCache = true
			} else if len(k) >= 15 && k[:15] == "comet_ai_track_" {
				isCache = true
			} else if strings.HasPrefix(k, "comet_ai_profile_") {
				isCache = true
			}

			if isCache {
				prefs[k] = v
				importedCount++
			}
		}

		// Save updated preferences
		newPrefBytes, err := json.Marshal(prefs)
		if err != nil {
			l.Error().Err(err).Msg("Failed to marshal preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		if err := store.SaveUserPreferences(ctx, user.ID, newPrefBytes); err != nil {
			l.Error().Err(err).Msg("Failed to save preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		l.Info().Int("imported_count", importedCount).Msg("AI cache imported successfully")
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"message": "AI cache imported successfully",
			"count":   importedCount,
		})
	}
}
