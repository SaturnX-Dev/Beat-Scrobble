package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("LoginHandler: Received request")

		if err := r.ParseForm(); err != nil {
			l.Debug().AnErr("error", err).Msg("LoginHandler: Failed to parse form")
			utils.WriteError(w, "invalid request format", http.StatusBadRequest)
			return
		}

		username := r.FormValue("username")
		password := r.FormValue("password")
		if username == "" || password == "" {
			l.Debug().Msg("LoginHandler: Missing credentials")
			utils.WriteError(w, "username and password required", http.StatusBadRequest)
			return
		}

		user, err := store.GetUserByUsername(ctx, username)
		if err != nil {
			l.Error().Err(err).Msg("LoginHandler: Database error fetching user")
			utils.WriteError(w, "authentication failed", http.StatusInternalServerError)
			return
		}
		if user == nil {
			l.Debug().Msg("LoginHandler: User not found")
			utils.WriteError(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		if err := bcrypt.CompareHashAndPassword(user.Password, []byte(password)); err != nil {
			l.Debug().Msg("LoginHandler: Invalid password")
			utils.WriteError(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		expiresAt := time.Now().Add(24 * time.Hour)
		if strings.ToLower(r.FormValue("remember_me")) == "true" {
			expiresAt = time.Now().Add(30 * 24 * time.Hour)
		}

		session, err := store.SaveSession(ctx, user.ID, expiresAt, r.FormValue("remember_me") == "true")
		if err != nil {
			l.Error().Err(err).Msg("LoginHandler: Failed to create session")
			utils.WriteError(w, "authentication failed", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "beat_scrobble_session",
			Value:    session.ID.String(),
			Expires:  expiresAt,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		l.Debug().Msgf("LoginHandler: User %d authenticated", user.ID)
		w.WriteHeader(http.StatusNoContent)
	}
}

func LogoutHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("LogoutHandler: Received request")

		cookie, err := r.Cookie("beat_scrobble_session")
		if err == nil {
			sid, err := uuid.Parse(cookie.Value)
			if err != nil {
				l.Debug().AnErr("error", err).Msg("LogoutHandler: Invalid session ID")
			} else if err := store.DeleteSession(ctx, sid); err != nil {
				l.Error().Err(err).Msg("LogoutHandler: Failed to delete session")
			}
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "beat_scrobble_session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})

		l.Debug().Msg("LogoutHandler: Session terminated")
		w.WriteHeader(http.StatusNoContent)
	}
}

func MeHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("MeHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("MeHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		l.Debug().Msgf("MeHandler: Returning user data for ID %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, user)
	}
}

func SignupHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("SignupHandler: Received request")

		// Check Max Users Limit
		if max := cfg.MaxUsers(); max > 0 {
			count, err := store.CountUsers(ctx)
			if err != nil {
				l.Error().Err(err).Msg("SignupHandler: Failed to count users")
				utils.WriteError(w, "registration failed", http.StatusInternalServerError)
				return
			}
			if int(count) >= max {
				l.Warn().Msgf("SignupHandler: Max users reached (%d >= %d)", count, max)
				utils.WriteError(w, "registration closed: max users reached", http.StatusForbidden)
				return
			}
		}

		if err := r.ParseForm(); err != nil {
			l.Debug().AnErr("error", err).Msg("SignupHandler: Failed to parse form")
			utils.WriteError(w, "invalid request format", http.StatusBadRequest)
			return
		}

		username := r.FormValue("username")
		password := r.FormValue("password")
		if username == "" || password == "" {
			l.Debug().Msg("SignupHandler: Missing credentials")
			utils.WriteError(w, "username and password required", http.StatusBadRequest)
			return
		}

		// Check if user exists
		existing, err := store.GetUserByUsername(ctx, username)
		if err != nil {
			l.Error().Err(err).Msg("SignupHandler: Database error checking username")
			utils.WriteError(w, "registration failed", http.StatusInternalServerError)
			return
		}
		if existing != nil {
			l.Debug().Msgf("SignupHandler: Username '%s' already taken", username)
			utils.WriteError(w, "username already taken", http.StatusConflict)
			return
		}

		// Create User
		user, err := store.SaveUser(ctx, db.SaveUserOpts{
			Username: username,
			Password: password,
			Role:     models.UserRoleUser, // Default role for new signups
		})
		if err != nil {
			l.Error().Err(err).Msg("SignupHandler: Failed to create user")
			// Check if it's a validation error
			errMsg := err.Error()
			if strings.Contains(errMsg, "ValidateUsername") || strings.Contains(errMsg, "ValidateAndNormalizePassword") {
				// Extract the actual validation message
				if strings.Contains(errMsg, "at least 8 characters") {
					utils.WriteError(w, "password must be at least 8 characters", http.StatusBadRequest)
				} else if strings.Contains(errMsg, "username") {
					utils.WriteError(w, "invalid username format", http.StatusBadRequest)
				} else {
					utils.WriteError(w, "validation failed", http.StatusBadRequest)
				}
				return
			}
			utils.WriteError(w, "registration failed", http.StatusInternalServerError)
			return
		}

		l.Info().Msgf("SignupHandler: New user created: %s (ID: %d)", username, user.ID)

		// Create Session (Auto-Login)
		expiresAt := time.Now().Add(24 * time.Hour)
		session, err := store.SaveSession(ctx, user.ID, expiresAt, false)
		if err != nil {
			l.Error().Err(err).Msg("SignupHandler: Failed to create session")
			utils.WriteError(w, "registration successful but login failed", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "beat_scrobble_session",
			Value:    session.ID.String(),
			Expires:  expiresAt,
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		})

		w.WriteHeader(http.StatusCreated)
	}
}

func UpdateUserHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("UpdateUserHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("UpdateUserHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if err := r.ParseForm(); err != nil {
			l.Error().Err(err).Msg("UpdateUserHandler: Invalid form data")
			utils.WriteError(w, "invalid request", http.StatusBadRequest)
			return
		}

		opts := db.UpdateUserOpts{ID: user.ID}
		changed := false

		if username := r.FormValue("username"); username != "" {
			opts.Username = username
			changed = true
		}

		if password := r.FormValue("password"); password != "" {
			// Require current password for security
			currentPassword := r.FormValue("current_password")
			if currentPassword == "" {
				utils.WriteError(w, "current password required to change password", http.StatusForbidden)
				return
			}

			// Verify current password
			dbUser, err := store.GetUser(ctx, user.ID)
			if err != nil {
				l.Error().Err(err).Msg("UpdateUserHandler: Error fetching user for verification")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}

			if err := bcrypt.CompareHashAndPassword(dbUser.Password, []byte(currentPassword)); err != nil {
				utils.WriteError(w, "incorrect current password", http.StatusForbidden)
				return
			}

			opts.Password = password
			changed = true
		}

		if !changed {
			l.Debug().Msg("UpdateUserHandler: No update parameters provided")
			utils.WriteError(w, "no changes specified", http.StatusBadRequest)
			return
		}

		if err := store.UpdateUser(ctx, opts); err != nil {
			l.Error().Err(err).Msg("UpdateUserHandler: Update failed")
			utils.WriteError(w, "update failed", http.StatusBadRequest)
			return
		}

		l.Debug().Msgf("UpdateUserHandler: User %d updated", user.ID)
		w.WriteHeader(http.StatusNoContent)
	}
}
