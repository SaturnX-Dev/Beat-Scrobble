package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gabehf/koito/engine/middleware"
	"github.com/gabehf/koito/internal/db"
	"github.com/gabehf/koito/internal/logger"
	"github.com/gabehf/koito/internal/utils"
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
			aiModel = "google/gemini-2.0-flash-001"
		}

		// 3. Call OpenRouter API
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
		apiReq.Header.Set("HTTP-Referer", "https://koito.app") // Required by OpenRouter
		apiReq.Header.Set("X-Title", "Koito Music Analytics")

		client := &http.Client{}
		resp, err := client.Do(apiReq)
		if err != nil {
			l.Error().Err(err).Msg("OpenRouter API call failed")
			utils.WriteError(w, "failed to call AI service", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		bodyBytes, _ := io.ReadAll(resp.Body)

		if resp.StatusCode != http.StatusOK {
			l.Error().Int("status", resp.StatusCode).Str("body", string(bodyBytes)).Msg("OpenRouter API error")
			utils.WriteError(w, "AI service returned error", http.StatusBadGateway)
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

		// 4. Return Result
		utils.WriteJSON(w, http.StatusOK, map[string]string{
			"critique": openRouterResp.Choices[0].Message.Content,
		})
	}
}
