package handlers

// [LEGACY CORE]
// This file is part of the original Koito core.
// Maintained by Beat Scrobble for backward compatibility.

import (
	"net/http"
	"strconv"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

func SubmitListenWithIDHandler(store db.DB) http.HandlerFunc {

	var defaultClientStr = "Beat Scrobble Web UI"

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		l.Debug().Msg("SubmitListenWithIDHandler: Got request")

		u := middleware.GetUserFromContext(ctx)
		if u == nil {
			l.Debug().Msg("SubmitListenWithIDHandler: Unauthorized request (user context is nil)")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		err := r.ParseForm()
		if err != nil {
			l.Debug().Msg("SubmitListenWithIDHandler: Failed to parse form")
			utils.WriteError(w, "form is invalid", http.StatusBadRequest)
			return
		}

		trackIDStr := r.FormValue("track_id")
		timestampStr := r.FormValue("unix")
		client := r.FormValue("client")
		if client == "" {
			client = defaultClientStr
		}

		if trackIDStr == "" || timestampStr == "" {
			l.Debug().Msg("SubmitListenWithIDHandler: Request is missing required parameters")
			utils.WriteError(w, "track_id and unix (timestamp) must be provided", http.StatusBadRequest)
			return
		}
		trackID, err := strconv.Atoi(trackIDStr)
		if err != nil {
			l.Debug().AnErr("error", err).Msg("SubmitListenWithIDHandler: Invalid track id")
			utils.WriteError(w, "invalid track_id", http.StatusBadRequest)
			return
		}
		unix, err := strconv.ParseInt(timestampStr, 10, 64)
		if err != nil || time.Now().Unix() < unix {
			l.Debug().AnErr("error", err).Msg("SubmitListenWithIDHandler: Invalid unix timestamp")
			utils.WriteError(w, "invalid timestamp", http.StatusBadRequest)
			return
		}

		ts := time.Unix(unix, 0)
		err = store.SaveListen(ctx, db.SaveListenOpts{
			TrackID: int32(trackID),
			Time:    ts,
			UserID:  u.ID,
			Client:  client,
		})
		if err != nil {
			l.Err(err).Msg("SubmitListenWithIDHandler: Failed to submit listen")
			utils.WriteError(w, "failed to submit listen", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	}
}
