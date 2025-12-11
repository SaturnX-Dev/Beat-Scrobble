package middleware

import "net/http"

// SecurityHeaders adds standard security headers to every response
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Protect against MIME sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Protect against Clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable XSS protection filter in browser (useful for older browsers)
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Control referrer information
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		next.ServeHTTP(w, r)
	})
}
