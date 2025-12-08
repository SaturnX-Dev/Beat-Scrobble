package handlers

import (
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

func PresencePingHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Optional: Update last seen for user if logged in
		user := middleware.GetUserFromContext(ctx)

		response := map[string]interface{}{
			"status": "ok",
		}

		if user != nil {
			// Check for notifications
			notifs := NotificationManager.GetAndClear(user.ID)
			if len(notifs) > 0 {
				response["notifications"] = notifs
			}
		}

		utils.WriteJSON(w, http.StatusOK, response)
	}
}
