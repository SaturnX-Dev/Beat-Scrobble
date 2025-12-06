package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

type AICritiqueRequest struct {
	TrackName  string `json:"track_name"`
	ArtistName string `json:"artist_name"`
	AlbumName  string `json:"album_name"`
}

type OpenRouterRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func GetAICritiqueHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// 1. Parse Request
		var req AICritiqueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// 2. Get User Preferences (OpenRouter Key & Prompt)
		prefBytes, err := store.GetUserPreferences(ctx, user.ID)
		if err != nil {
			l.Error().Err(err).Msg("Failed to get user preferences")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}

		var prefs map[string]interface{}
		if prefBytes != nil {
			if err := json.Unmarshal(prefBytes, &prefs); err != nil {
				l.Error().Err(err).Msg("Failed to unmarshal preferences")
				utils.WriteError(w, "internal server error", http.StatusInternalServerError)
				return
			}
		}

		apiKey, _ := prefs["openrouter_api_key"].(string)
		customPrompt, _ := prefs["ai_critique_prompt"].(string)
		enabled, _ := prefs["ai_critique_enabled"].(bool)
		aiModel, _ := prefs["ai_model"].(string)

		if !enabled {
			utils.WriteError(w, "ai critique is disabled", http.StatusForbidden)
			return
		}

		if apiKey == "" {
			utils.WriteError(w, "openrouter api key not configured", http.StatusBadRequest)
			return
		}

		if customPrompt == "" {
			customPrompt = "Give a short, witty, and slightly pretentious music critique of this song. Keep it under 50 words."
		}

		if aiModel == "" {
			aiModel = "google/gemini-2.0-flash-exp:free"
		}

		// 3. Check Cache
		// Create a unique key for the track: "Artist - Track (Album)"
		cacheKey := fmt.Sprintf("%s - %s (%s)", req.ArtistName, req.TrackName, req.AlbumName)

		var cache map[string]string
		if cacheInterface, ok := prefs["track_critiques"]; ok {
			cacheBytes, _ := json.Marshal(cacheInterface)
			json.Unmarshal(cacheBytes, &cache)
		}
		if cache == nil {
			cache = make(map[string]string)
		}

		if critique, ok := cache[cacheKey]; ok && critique != "" {
			l.Debug().Str("key", cacheKey).Msg("Returning cached track critique")
			utils.WriteJSON(w, http.StatusOK, map[string]string{
				"critique": critique,
			})
			return
		}

		// 4. Call OpenRouter API
		systemPrompt := fmt.Sprintf("You are a music critic. %s", customPrompt)
		userMessage := fmt.Sprintf("Critique the song '%s' by '%s' from the album '%s'.", req.TrackName, req.ArtistName, req.AlbumName)

		openRouterReq := OpenRouterRequest{
			Model: aiModel,
			Messages: []Message{
				{Role: "system", Content: systemPrompt},
				{Role: "user", Content: userMessage},
			},
		}

		reqBody, err := json.Marshal(openRouterReq)
		if err != nil {
			utils.WriteError(w, "failed to create request", http.StatusInternalServerError)
			return
		}

		apiReq, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(reqBody))
		if err != nil {
			utils.WriteError(w, "failed to create request", http.StatusInternalServerError)
			return
		}

		apiReq.Header.Set("Authorization", "Bearer "+apiKey)
		apiReq.Header.Set("Content-Type", "application/json")
		apiReq.Header.Set("HTTP-Referer", "https://beatscrobble.app") // Required by OpenRouter
		apiReq.Header.Set("X-Title", "Beat Scrobble Music Analytics")

		client := &http.Client{
			Timeout: 30 * time.Second,
		}
		resp, err := client.Do(apiReq)
		if err != nil {
			l.Error().Err(err).Msg("OpenRouter API call failed")
			utils.WriteError(w, fmt.Sprintf("failed to call AI service: %v", err), http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		bodyBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			l.Error().Int("status", resp.StatusCode).Str("body", string(bodyBytes)).Msg("OpenRouter API error")
			// Forward the status code and body
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(resp.StatusCode)
			w.Write(bodyBytes)
			return
		}

		var openRouterResp OpenRouterResponse
		if err := json.Unmarshal(bodyBytes, &openRouterResp); err != nil {
			l.Error().Err(err).Msg("Failed to parse OpenRouter response")
			utils.WriteError(w, "invalid response from AI service", http.StatusBadGateway)
			return
		}

		if len(openRouterResp.Choices) == 0 {
			utils.WriteError(w, "no critique generated", http.StatusInternalServerError)
			return
		}

		critiqueText := openRouterResp.Choices[0].Message.Content

		// 5. Update Cache & Save Preferences
		cache[cacheKey] = critiqueText
		prefs["track_critiques"] = cache

		newPrefBytes, err := json.Marshal(prefs)
		if err != nil {
			l.Error().Err(err).Msg("Failed to marshal updated preferences")
		} else {
			if err := store.SaveUserPreferences(ctx, user.ID, newPrefBytes); err != nil {
				l.Error().Err(err).Msg("Failed to save updated preferences")
			}
		}

		// 6. Return Result
		utils.WriteJSON(w, http.StatusOK, map[string]string{
			"critique": critiqueText,
		})
	}
}
