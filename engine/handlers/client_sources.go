package handlers

import (
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

func GetClientSourcesHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("GetClientSourcesHandler: Received request")

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			l.Debug().Msg("GetClientSourcesHandler: Invalid user context")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		sources, err := store.GetClientSources(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("GetClientSourcesHandler: Failed to retrieve client sources")
			utils.WriteError(w, "failed to retrieve client sources", http.StatusInternalServerError)
			return
		}

		l.Debug().Msgf("GetClientSourcesHandler: Retrieved %d client sources", len(sources))
		utils.WriteJSON(w, http.StatusOK, sources)
	}
}
