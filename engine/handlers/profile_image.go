package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/go-chi/chi/v5"
)

const profileImagesDir = "profile_images"
const maxProfileImageSize = 5 * 1024 * 1024 // 5MB

// UploadProfileImageHandler handles profile image uploads
func UploadProfileImageHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		l.Debug().Msgf("UploadProfileImageHandler: Uploading profile image for user %d", user.ID)

		// Parse multipart form with size limit
		r.Body = http.MaxBytesReader(w, r.Body, maxProfileImageSize)
		if err := r.ParseMultipartForm(maxProfileImageSize); err != nil {
			l.Warn().Err(err).Msg("UploadProfileImageHandler: File too large or invalid form")
			utils.WriteError(w, "file too large (max 5MB)", http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("image")
		if err != nil {
			l.Warn().Err(err).Msg("UploadProfileImageHandler: No file provided")
			utils.WriteError(w, "no file provided", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Validate file type
		contentType := header.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "image/") {
			utils.WriteError(w, "file must be an image", http.StatusBadRequest)
			return
		}

		// Create profile images directory
		imageDir := filepath.Join(cfg.ConfigDir(), profileImagesDir)
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			l.Error().Err(err).Msg("UploadProfileImageHandler: Failed to create directory")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Determine file extension from content type
		ext := ".jpg"
		switch contentType {
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		case "image/gif":
			ext = ".gif"
		}

		// Save file with user ID as filename
		filename := fmt.Sprintf("%d%s", user.ID, ext)
		destPath := filepath.Join(imageDir, filename)

		dest, err := os.Create(destPath)
		if err != nil {
			l.Error().Err(err).Msg("UploadProfileImageHandler: Failed to create file")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}
		defer dest.Close()

		if _, err := io.Copy(dest, file); err != nil {
			l.Error().Err(err).Msg("UploadProfileImageHandler: Failed to save file")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Store image path in preferences
		prefs := map[string]interface{}{}
		prefsData, _ := store.GetUserPreferences(ctx, user.ID)
		if prefsData != nil {
			json.Unmarshal(prefsData, &prefs)
		}
		prefs["profile_image"] = fmt.Sprintf("/profile-images/%s?v=%d", filename, time.Now().Unix())
		newPrefsData, _ := json.Marshal(prefs)
		store.SaveUserPreferences(ctx, user.ID, newPrefsData)

		l.Info().Msgf("UploadProfileImageHandler: Profile image saved for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"path":    fmt.Sprintf("/profile-images/%s?v=%d", filename, time.Now().Unix()),
		})
	}
}

// GetProfileImageHandler serves profile images
func GetProfileImageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logger.FromContext(r.Context())
		filename := chi.URLParam(r, "filename")

		if filename == "" {
			http.NotFound(w, r)
			return
		}

		// Clean the filename to prevent directory traversal
		filename = filepath.Clean(filename)
		if strings.Contains(filename, "..") {
			http.NotFound(w, r)
			return
		}

		imagePath := filepath.Join(cfg.ConfigDir(), profileImagesDir, filename)

		l.Debug().Msgf("GetProfileImageHandler: Serving profile image from %s", imagePath)

		if _, err := os.Stat(imagePath); os.IsNotExist(err) {
			// Serve default avatar
			http.ServeFile(w, r, filepath.Join("assets", "default_avatar.png"))
			return
		}

		http.ServeFile(w, r, imagePath)
	}
}

// UploadProfileImageBase64Handler handles base64 encoded profile image uploads
func UploadProfileImageBase64Handler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Image string `json:"image"` // Base64 data URL
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Parse base64 data URL
		parts := strings.SplitN(req.Image, ",", 2)
		if len(parts) != 2 {
			utils.WriteError(w, "invalid image format", http.StatusBadRequest)
			return
		}

		// Determine content type and extension
		contentType := ""
		ext := ".jpg"
		if strings.Contains(parts[0], "image/png") {
			contentType = "image/png"
			ext = ".png"
		} else if strings.Contains(parts[0], "image/jpeg") {
			contentType = "image/jpeg"
			ext = ".jpg"
		} else if strings.Contains(parts[0], "image/webp") {
			contentType = "image/webp"
			ext = ".webp"
		} else if strings.Contains(parts[0], "image/gif") {
			contentType = "image/gif"
			ext = ".gif"
		}

		if contentType == "" {
			utils.WriteError(w, "unsupported image format", http.StatusBadRequest)
			return
		}

		// Decode base64
		data, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			utils.WriteError(w, "invalid base64 data", http.StatusBadRequest)
			return
		}

		// Check size
		if len(data) > maxProfileImageSize {
			utils.WriteError(w, "file too large (max 5MB)", http.StatusBadRequest)
			return
		}

		// Create profile images directory
		imageDir := filepath.Join(cfg.ConfigDir(), profileImagesDir)
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			l.Error().Err(err).Msg("UploadProfileImageBase64Handler: Failed to create directory")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Save file
		filename := fmt.Sprintf("%d%s", user.ID, ext)
		destPath := filepath.Join(imageDir, filename)

		if err := os.WriteFile(destPath, data, 0644); err != nil {
			l.Error().Err(err).Msg("UploadProfileImageBase64Handler: Failed to save file")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Store image path in preferences
		prefs := map[string]interface{}{}
		prefsData, _ := store.GetUserPreferences(ctx, user.ID)
		if prefsData != nil {
			json.Unmarshal(prefsData, &prefs)
		}
		prefs["profile_image"] = fmt.Sprintf("/profile-images/%s?v=%d", filename, time.Now().Unix())
		newPrefsData, _ := json.Marshal(prefs)
		store.SaveUserPreferences(ctx, user.ID, newPrefsData)

		l.Info().Msgf("UploadProfileImageBase64Handler: Profile image saved for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"path":    fmt.Sprintf("/profile-images/%s?v=%d", filename, time.Now().Unix()),
		})
	}
}

const backgroundImagesDir = "background_images"

// UploadBackgroundImageBase64Handler handles base64 encoded background image uploads
func UploadBackgroundImageBase64Handler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Image string `json:"image"` // Base64 data URL
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Parse base64 data URL
		parts := strings.SplitN(req.Image, ",", 2)
		if len(parts) != 2 {
			utils.WriteError(w, "invalid image format", http.StatusBadRequest)
			return
		}

		// Determine content type and extension
		contentType := ""
		ext := ".jpg"
		if strings.Contains(parts[0], "image/png") {
			contentType = "image/png"
			ext = ".png"
		} else if strings.Contains(parts[0], "image/jpeg") {
			contentType = "image/jpeg"
			ext = ".jpg"
		} else if strings.Contains(parts[0], "image/webp") {
			contentType = "image/webp"
			ext = ".webp"
		} else if strings.Contains(parts[0], "image/gif") {
			contentType = "image/gif"
			ext = ".gif"
		}

		if contentType == "" {
			utils.WriteError(w, "unsupported image format", http.StatusBadRequest)
			return
		}

		// Decode base64
		data, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			utils.WriteError(w, "invalid base64 data", http.StatusBadRequest)
			return
		}

		// Check size (allow larger for background, e.g. 10MB)
		if len(data) > 10*1024*1024 {
			utils.WriteError(w, "file too large (max 10MB)", http.StatusBadRequest)
			return
		}

		// Create background images directory
		imageDir := filepath.Join(cfg.ConfigDir(), backgroundImagesDir)
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			l.Error().Err(err).Msg("UploadBackgroundImageBase64Handler: Failed to create directory")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Save file
		filename := fmt.Sprintf("%d%s", user.ID, ext)
		destPath := filepath.Join(imageDir, filename)

		if err := os.WriteFile(destPath, data, 0644); err != nil {
			l.Error().Err(err).Msg("UploadBackgroundImageBase64Handler: Failed to save file")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		// Store image path in preferences
		prefs := map[string]interface{}{}
		prefsData, _ := store.GetUserPreferences(ctx, user.ID)
		if prefsData != nil {
			json.Unmarshal(prefsData, &prefs)
		}
		prefs["background_image"] = fmt.Sprintf("/background-images/%s?v=%d", filename, time.Now().Unix())
		newPrefsData, _ := json.Marshal(prefs)
		store.SaveUserPreferences(ctx, user.ID, newPrefsData)

		l.Info().Msgf("UploadBackgroundImageBase64Handler: Background image saved for user %d", user.ID)
		utils.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"path":    fmt.Sprintf("/background-images/%s?v=%d", filename, time.Now().Unix()),
		})
	}
}

// GetBackgroundImageHandler serves background images
func GetBackgroundImageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logger.FromContext(r.Context())
		filename := chi.URLParam(r, "filename")

		if filename == "" {
			http.NotFound(w, r)
			return
		}

		// Clean the filename to prevent directory traversal
		filename = filepath.Clean(filename)
		if strings.Contains(filename, "..") {
			http.NotFound(w, r)
			return
		}

		imagePath := filepath.Join(cfg.ConfigDir(), backgroundImagesDir, filename)

		l.Debug().Msgf("GetBackgroundImageHandler: Serving background image from %s", imagePath)

		if _, err := os.Stat(imagePath); os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}

		http.ServeFile(w, r, imagePath)
	}
}
