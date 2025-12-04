package handlers

import (
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

func GetTopArtistsHandler(store db.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("GetTopArtistsHandler: Received request to retrieve top artists")

		opts := OptsFromRequest(r)
		l.Debug().Msgf("GetTopArtistsHandler: Retrieving top artists with options: %+v", opts)

		artists, err := store.GetTopArtistsPaginated(ctx, opts)
		if err != nil {
			l.Err(err).Msg("GetTopArtistsHandler: Failed to retrieve top artists")
			utils.WriteError(w, "failed to get artists", http.StatusBadRequest)
			return
		}

		l.Debug().Msg("GetTopArtistsHandler: Successfully retrieved top artists")
		utils.WriteJSON(w, http.StatusOK, artists)
	}
}
