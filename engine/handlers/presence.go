package handlers

import (
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/ai"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

// PresencePingHandler updates user's presence timestamp
func PresencePingHandler(presence *ai.PresenceManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if err := presence.Ping(ctx, int32(user.ID)); err != nil {
			utils.WriteError(w, "failed to update presence", http.StatusInternalServerError)
			return
		}

		utils.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

// GetPresenceStatusHandler checks if user is online (for debugging/admin)
func GetPresenceStatusHandler(presence *ai.PresenceManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		online, err := presence.IsOnline(ctx, int32(user.ID))
		if err != nil {
			utils.WriteError(w, "failed to check presence", http.StatusInternalServerError)
			return
		}

		utils.WriteJSON(w, http.StatusOK, map[string]bool{"online": online})
	}
}
