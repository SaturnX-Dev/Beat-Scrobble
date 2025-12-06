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

// GetUserPreferencesHandler retrieves the user's preferences
func GetUserPreferencesHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("GetUserPreferencesHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("GetUserPreferencesHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		preferencesJSON, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("GetUserPreferencesHandler: Database error")
			utils.WriteError(w, "failed to retrieve preferences", http.StatusInternalServerError)
			return
		}

		// Handle nil or empty preferences - return empty object
		if preferencesJSON == nil || len(preferencesJSON) == 0 {
			l.Debug().Msgf("GetUserPreferencesHandler: No preferences found for user %d, returning empty", user.ID)
			utils.WriteJSON(w, http.StatusOK, map[string]interface{}{})
			return
		}

		var preferences map[string]interface{}
		if err := json.Unmarshal(preferencesJSON, &preferences); err != nil {
			l.Warn().Err(err).Msg("GetUserPreferencesHandler: Failed to unmarshal preferences, returning empty")
			// Return empty object instead of error for corrupted data
			utils.WriteJSON(w, http.StatusOK, map[string]interface{}{})
			return
		}

		l.Debug().Msgf("GetUserPreferencesHandler: Returning preferences for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, preferences)
	}
}

// SaveUserPreferencesHandler saves the user's preferences
func SaveUserPreferencesHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("SaveUserPreferencesHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("SaveUserPreferencesHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var newPrefs map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&newPrefs); err != nil {
			l.Debug().AnErr("error", err).Msg("SaveUserPreferencesHandler: Invalid JSON")
			utils.WriteError(w, "invalid preferences data", http.StatusBadRequest)
			return
		}

		// Fetch existing preferences to preserve server-side cache state
		// and checks for prompt changes
		existingPrefsJSON, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("SaveUserPreferencesHandler: Database error retrieving existing prefs")
			utils.WriteError(w, "failed to save preferences", http.StatusInternalServerError)
			return
		}

		finalPrefs := make(map[string]interface{})
		if existingPrefsJSON != nil && len(existingPrefsJSON) > 0 {
			if err := json.Unmarshal(existingPrefsJSON, &finalPrefs); err != nil {
				l.Warn().Err(err).Msg("SaveUserPreferencesHandler: Failed to unmarshal existing preferences")
				// Continue with empty map if corrupt
			}
		}

		// Helper to check if a key is a protected cache key
		isCacheKey := func(k string) bool {
			if k == "profile_critiques" || k == "ai_playlists_cache" {
				return true
			}
			if len(k) >= 15 && k[:15] == "comet_ai_track_" {
				return true
			}
			return false
		}

		// Track which prompts changed to trigger specific cache invalidation
		profilePromptChanged := false
		trackPromptChanged := false
		playlistPromptChanged := false

		// 1. Merge new non-cache settings into finalPrefs
		// We deliberately IGNORE cache keys from the client to prevent stale client state
		// from overwriting the server's cache.
		for k, v := range newPrefs {
			if isCacheKey(k) {
				continue // Skip client-provided cache data
			}

			// Check for prompt changes before updating
			if k == "profile_critique_prompt" {
				if oldVal, ok := finalPrefs[k]; !ok || oldVal != v {
					profilePromptChanged = true
				}
			} else if k == "ai_critique_prompt" {
				if oldVal, ok := finalPrefs[k]; !ok || oldVal != v {
					trackPromptChanged = true
				}
			} else if k == "ai_playlists_prompt" {
				if oldVal, ok := finalPrefs[k]; !ok || oldVal != v {
					playlistPromptChanged = true
				}
			}

			finalPrefs[k] = v
		}

		// 2. Invalidate cache if prompts changed
		clearedCount := 0
		if profilePromptChanged {
			if _, exists := finalPrefs["profile_critiques"]; exists {
				delete(finalPrefs, "profile_critiques")
				clearedCount++
				l.Info().Msg("Invalidated profile critiques cache due to prompt update")
			}

			// Also clear frontend-cached profile critiques
			keysToDelete := []string{}
			for key := range finalPrefs {
				if strings.HasPrefix(key, "comet_ai_profile_") {
					keysToDelete = append(keysToDelete, key)
				}
			}
			for _, key := range keysToDelete {
				delete(finalPrefs, key)
				clearedCount++
			}
		}

		if trackPromptChanged {
			// Clear all track critiques
			keysToDelete := []string{}
			for key := range finalPrefs {
				if len(key) >= 15 && key[:15] == "comet_ai_track_" {
					keysToDelete = append(keysToDelete, key)
				}
			}
			for _, key := range keysToDelete {
				delete(finalPrefs, key)
				clearedCount++
			}
			if len(keysToDelete) > 0 {
				l.Info().Int("count", len(keysToDelete)).Msg("Invalidated track critiques cache due to prompt update")
			}
		}

		if playlistPromptChanged {
			if _, exists := finalPrefs["ai_playlists_cache"]; exists {
				delete(finalPrefs, "ai_playlists_cache")
				clearedCount++
				l.Info().Msg("Invalidated playlist cache due to prompt update")
			}
		}

		// Convert to JSON for storage
		preferencesJSON, err := json.Marshal(finalPrefs)
		if err != nil {
			l.Error().Err(err).Msg("SaveUserPreferencesHandler: Failed to marshal preferences")
			utils.WriteError(w, "failed to save preferences", http.StatusInternalServerError)
			return
		}

		if err := store.SaveUserPreferences(ctx, user.ID, preferencesJSON); err != nil {
			l.Error().Err(err).Msg("SaveUserPreferencesHandler: Database error")
			utils.WriteError(w, "failed to save preferences", http.StatusInternalServerError)
			return
		}

		l.Debug().Msgf("SaveUserPreferencesHandler: Preferences saved for user %d (Validated %d cache items)", user.ID, clearedCount)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success":       true,
			"message":       "Preferences saved successfully",
			"cleared_cache": clearedCount,
		})
	}
}
