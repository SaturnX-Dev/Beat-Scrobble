package middleware

import (
	"fmt"
	"net/http"
	"time"
)

func CacheControl(duration time.Duration) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", int(duration.Seconds())))
			next.ServeHTTP(w, r)
		})
	}
}
