package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gabehf/koito/internal/db"
	"github.com/gabehf/koito/internal/logger"
	"github.com/gabehf/koito/internal/models"
	"github.com/gabehf/koito/internal/utils"
	"github.com/google/uuid"
)

type MiddlwareContextKey string

const (
	UserContextKey   MiddlwareContextKey = "user"
	apikeyContextKey MiddlwareContextKey = "apikeyID"
)

func ValidateSession(store db.DB) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			l := logger.FromContext(r.Context())

			l.Debug().Msgf("ValidateSession: Checking user authentication via session cookie")

			cookie, err := r.Cookie("koito_session")
			var sid uuid.UUID
			if err == nil {
				sid, err = uuid.Parse(cookie.Value)
				if err != nil {
					l.Err(err).Msg("ValidateSession: Could not parse UUID from session cookie")
					utils.WriteError(w, "session cookie is invalid", http.StatusUnauthorized)
					return
				}
			} else {
				l.Debug().Msgf("ValidateSession: No session cookie found; attempting API key authentication")
				utils.WriteError(w, "session cookie is missing", http.StatusUnauthorized)
				return
			}

			l.Debug().Msg("ValidateSession: Retrieved login cookie from request")

			u, err := store.GetUserBySession(r.Context(), sid)
			if err != nil {
				l.Err(fmt.Errorf("ValidateSession: %w", err)).Msg("Error accessing database")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
			if u == nil {
				l.Debug().Msg("ValidateSession: No user with session id found")
				utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, u)
			r = r.WithContext(ctx)

			l.Debug().Msgf("ValidateSession: Refreshing session for user '%s'", u.Username)

			store.RefreshSession(r.Context(), sid, time.Now().Add(30*24*time.Hour))

			l.Debug().Msgf("ValidateSession: Refreshed session for user '%s'", u.Username)

			next.ServeHTTP(w, r)
		})
	}
}

func ValidateApiKey(store db.DB) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			l := logger.FromContext(ctx)

			l.Debug().Msg("ValidateApiKey: Checking if user is already authenticated")

			u := GetUserFromContext(ctx)
			if u != nil {
				l.Debug().Msg("ValidateApiKey: User is already authenticated; skipping API key authentication")
				next.ServeHTTP(w, r)
				return
			}

			authh := r.Header.Get("Authorization")
			var token string
			if strings.HasPrefix(strings.ToLower(authh), "token ") {
				token = strings.TrimSpace(authh[6:]) // strip "Token "
			} else {
				l.Error().Msg("ValidateApiKey: Authorization header must be formatted 'Token {token}'")
				utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			u, err := store.GetUserByApiKey(ctx, token)
			if err != nil {
				l.Err(err).Msg("Failed to get user from database using api key")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
			if u == nil {
				l.Debug().Msg("Api key does not exist")
				utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			ctx = context.WithValue(r.Context(), UserContextKey, u)
			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}
