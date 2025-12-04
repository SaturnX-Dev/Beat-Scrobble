package middleware

import (
	"net/http"
	"slices"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
)

func AllowedHosts(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		l := logger.Get()
		if cfg.AllowAllHosts() {
			next.ServeHTTP(w, r)
			return
		} else if slices.Contains(cfg.AllowedHosts(), r.Host) {
			next.ServeHTTP(w, r)
			return
		}
		l.Warn().Msgf("Request denied from host %s. If you want to allow requests like this, add the host to your %s variable", r.Host, cfg.ALLOWED_HOSTS_ENV)
		w.WriteHeader(http.StatusForbidden)
	})
}
