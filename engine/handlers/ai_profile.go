package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

type AIProfileCritiqueRequest struct {
	Period string `json:"period"`
}

type CachedCritique struct {
	Critique  string    `json:"critique"`
	Timestamp time.Time `json:"timestamp"`
}

type ProfileCritiquesCache map[string]CachedCritique

func GetAIProfileCritiqueHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// 1. Parse Request
		var req AIProfileCritiqueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		periodStr := strings.ToLower(req.Period)
		var period db.Period
		switch periodStr {
		case "day":
			period = db.PeriodDay
		case "week":
			period = db.PeriodWeek
		case "month":
			period = db.PeriodMonth
		case "year":
			period = db.PeriodYear
		case "all_time":
			period = db.PeriodAllTime
		default:
			utils.WriteError(w, "invalid period", http.StatusBadRequest)
			return
		}

		// 2. Get User Preferences
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
		} else {
			prefs = make(map[string]interface{})
		}

		apiKey, _ := prefs["openrouter_api_key"].(string)
		enabled, _ := prefs["profile_critique_enabled"].(bool)
		aiModel, _ := prefs["ai_model"].(string)

		if !enabled {
			utils.WriteError(w, "profile critique is disabled", http.StatusForbidden)
			return
		}

		if apiKey == "" {
			utils.WriteError(w, "openrouter api key not configured", http.StatusBadRequest)
			return
		}

		if aiModel == "" {
			utils.WriteError(w, "AI Model not configured in Settings", http.StatusBadRequest)
			return
		}

		// 3. Check Cache
		var cache ProfileCritiquesCache
		if cacheInterface, ok := prefs["profile_critiques"]; ok {
			cacheBytes, _ := json.Marshal(cacheInterface)
			json.Unmarshal(cacheBytes, &cache)
		}
		if cache == nil {
			cache = make(ProfileCritiquesCache)
		}

		if cached, ok := cache[periodStr]; ok {
			// Cache "day" for 1 hour, others for 7 days
			maxAge := 7 * 24 * time.Hour
			if periodStr == "day" {
				maxAge = 1 * time.Hour
			}

			if time.Since(cached.Timestamp) < maxAge {
				l.Debug().Msg("Returning cached profile critique")
				utils.WriteJSON(w, http.StatusOK, map[string]string{
					"critique": cached.Critique,
				})
				return
			}
		}

		// 4. Fetch Stats & Top Artists
		listens, _ := store.CountListens(ctx, period)
		artistCount, _ := store.CountArtists(ctx, period)
		albumCount, _ := store.CountAlbums(ctx, period)
		trackCount, _ := store.CountTracks(ctx, period)

		topArtistsResp, err := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
			Limit:  5,
			Page:   1,
			Period: period,
		})

		var topArtistsNames []string
		if err == nil && topArtistsResp != nil {
			for _, a := range topArtistsResp.Items {
				topArtistsNames = append(topArtistsNames, a.Name)
			}
		}

		// 5. Call OpenRouter
		statsSummary := fmt.Sprintf("Listens: %d, Unique Artists: %d, Unique Albums: %d, Unique Tracks: %d", listens, artistCount, albumCount, trackCount)
		topArtistsStr := strings.Join(topArtistsNames, ", ")

		aiModel = strings.TrimSpace(aiModel)
		systemPrompt, ok := prefs["profile_critique_prompt"].(string)
		if !ok || systemPrompt == "" {
			systemPrompt = "You are a music critic. Give a short, witty, and slightly judgmental assessment of this user's listening habits based on their stats and top artists. Keep it under 60 words."
		}
		userMessage := fmt.Sprintf("Stats for %s: %s. Top Artists: %s.", periodStr, statsSummary, topArtistsStr)

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
		apiReq.Header.Set("HTTP-Referer", "https://beatscrobble.app")
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

			// Try to parse as JSON to see if it's a structured error
			var errResp map[string]interface{}
			if jsonErr := json.Unmarshal(bodyBytes, &errResp); jsonErr == nil {
				// It is JSON, forward it safely
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(resp.StatusCode)
				w.Write(bodyBytes)
			} else {
				// It is NOT JSON (likely 502 HTML), return a safe JSON error
				utils.WriteError(w, fmt.Sprintf("Upstream AI service error: %d", resp.StatusCode), http.StatusBadGateway)
			}
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

		// 6. Update Cache & Save Preferences
		cache[periodStr] = CachedCritique{
			Critique:  critiqueText,
			Timestamp: time.Now(),
		}
		prefs["profile_critiques"] = cache

		newPrefBytes, err := json.Marshal(prefs)
		if err != nil {
			l.Error().Err(err).Msg("Failed to marshal updated preferences")
		} else {
			if err := store.SaveUserPreferences(ctx, user.ID, newPrefBytes); err != nil {
				l.Error().Err(err).Msg("Failed to save updated preferences")
			}
		}

		// 7. Return Result
		utils.WriteJSON(w, http.StatusOK, map[string]string{
			"critique": critiqueText,
		})
	}
}
