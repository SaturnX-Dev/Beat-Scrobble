package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gabehf/koito/engine/middleware"
	"github.com/gabehf/koito/internal/db"
	"github.com/gabehf/koito/internal/logger"
	"github.com/gabehf/koito/internal/utils"
)

// UserTheme represents the theme data structure
type UserTheme struct {
	Bg           string `json:"bg"`
	BgSecondary  string `json:"bgSecondary"`
	BgTertiary   string `json:"bgTertiary"`
	Fg           string `json:"fg"`
	FgSecondary  string `json:"fgSecondary"`
	FgTertiary   string `json:"fgTertiary"`
	Primary      string `json:"primary"`
	PrimaryDim   string `json:"primaryDim"`
	Accent       string `json:"accent"`
	AccentDim    string `json:"accentDim"`
	Error        string `json:"error"`
	Warning      string `json:"warning"`
	Success      string `json:"success"`
	Info         string `json:"info"`
}

// SaveUserThemeHandler saves the user's custom theme
func SaveUserThemeHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("SaveUserThemeHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("SaveUserThemeHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var theme UserTheme
		if err := json.NewDecoder(r.Body).Decode(&theme); err != nil {
			l.Debug().AnErr("error", err).Msg("SaveUserThemeHandler: Invalid JSON")
			utils.WriteError(w, "invalid theme data", http.StatusBadRequest)
			return
		}

		// Validate theme has required colors
		if theme.Bg == "" || theme.Fg == "" || theme.Primary == "" {
			l.Debug().Msg("SaveUserThemeHandler: Missing required theme colors")
			utils.WriteError(w, "theme must include bg, fg, and primary colors", http.StatusBadRequest)
			return
		}

		// Convert to JSON for storage
		themeJSON, err := json.Marshal(theme)
		if err != nil {
			l.Error().Err(err).Msg("SaveUserThemeHandler: Failed to marshal theme")
			utils.WriteError(w, "failed to save theme", http.StatusInternalServerError)
			return
		}

		if err := store.SaveUserTheme(ctx, user.ID, themeJSON); err != nil {
			l.Error().Err(err).Msg("SaveUserThemeHandler: Database error")
			utils.WriteError(w, "failed to save theme", http.StatusInternalServerError)
			return
		}

		l.Debug().Msgf("SaveUserThemeHandler: Theme saved for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Theme saved successfully",
		})
	}
}

// GetUserThemeHandler retrieves the user's saved theme
func GetUserThemeHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("GetUserThemeHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("GetUserThemeHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		themeJSON, err := store.GetUserTheme(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("GetUserThemeHandler: Database error")
			utils.WriteError(w, "failed to retrieve theme", http.StatusInternalServerError)
			return
		}

		if themeJSON == nil {
			l.Debug().Msgf("GetUserThemeHandler: No theme found for user %d", user.ID)
			w.WriteHeader(http.StatusNoContent)
			return
		}

		var theme UserTheme
		if err := json.Unmarshal(themeJSON, &theme); err != nil {
			l.Error().Err(err).Msg("GetUserThemeHandler: Failed to unmarshal theme")
			utils.WriteError(w, "invalid theme data", http.StatusInternalServerError)
			return
		}

		l.Debug().Msgf("GetUserThemeHandler: Returning theme for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, theme)
	}
}
