package handlers

import (
	"encoding/json"
	"net/http"

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
			// If no preferences found, return empty object
			if err.Error() == "sql: no rows in result set" {
				l.Debug().Msgf("GetUserPreferencesHandler: No preferences found for user %d, returning empty", user.ID)
				utils.WriteJSON(w, http.StatusOK, map[string]interface{}{})
				return
			}
			l.Error().Err(err).Msg("GetUserPreferencesHandler: Database error")
			utils.WriteError(w, "failed to retrieve preferences", http.StatusInternalServerError)
			return
		}

		var preferences map[string]interface{}
		if err := json.Unmarshal(preferencesJSON, &preferences); err != nil {
			l.Error().Err(err).Msg("GetUserPreferencesHandler: Failed to unmarshal preferences")
			utils.WriteError(w, "invalid preferences data", http.StatusInternalServerError)
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

		var preferences map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&preferences); err != nil {
			l.Debug().AnErr("error", err).Msg("SaveUserPreferencesHandler: Invalid JSON")
			utils.WriteError(w, "invalid preferences data", http.StatusBadRequest)
			return
		}

		// Convert to JSON for storage
		preferencesJSON, err := json.Marshal(preferences)
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

		l.Debug().Msgf("SaveUserPreferencesHandler: Preferences saved for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Preferences saved successfully",
		})
	}
}
