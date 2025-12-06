package handlers

import (
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/export"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

func ExportHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", `attachment; filename="beat_scrobble_export.json"`)
		ctx := r.Context()
		l := logger.FromContext(ctx)
		l.Debug().Msg("ExportHandler: Recieved request for export file")
		u := middleware.GetUserFromContext(ctx)
		if u == nil {
			l.Debug().Msg("ExportHandler: Unauthorized access")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		mode := r.URL.Query().Get("mode")
		err := export.ExportData(ctx, u, store, mode, w)
		if err != nil {
			l.Err(err).Msg("ExportHandler: Failed to create export file")
			utils.WriteError(w, "failed to create export file", http.StatusInternalServerError)
			return
		}
	}
}
