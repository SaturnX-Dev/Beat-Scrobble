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

type AICritiqueRequest struct {
	TrackID    int32  `json:"track_id"`
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
			utils.WriteError(w, "AI Model not configured in Settings", http.StatusBadRequest)
			return
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

		// 4. Fetch Metadata (if track ID provided)
		var trackDetails map[string]interface{}

		shareMeta, _ := prefs["ai_share_meta"].(bool)
		if val, ok := prefs["ai_share_meta"]; ok {
			shareMeta = val.(bool)
		} else {
			shareMeta = true
		}

		shareContext, _ := prefs["ai_share_context"].(bool)
		if val, ok := prefs["ai_share_context"]; ok {
			shareContext = val.(bool)
		} else {
			shareContext = true
		}

		shareStats, _ := prefs["ai_share_stats"].(bool)
		if val, ok := prefs["ai_share_stats"]; ok {
			shareStats = val.(bool)
		} else {
			shareStats = true
		}

		if req.TrackID > 0 {
			// A. Detailed Track Metadata
			track, err := store.GetTrack(ctx, db.GetTrackOpts{ID: req.TrackID})
			if err == nil && track != nil {
				trackDetails = map[string]interface{}{
					"track_name": track.Title,
					"artist":     req.ArtistName, // Keep request artist name as it might be what user sees
					"album":      req.AlbumName,
				}

				if shareMeta {
					trackDetails["bpm"] = track.Tempo
					trackDetails["key"] = track.Key
					trackDetails["mode"] = track.Mode
					trackDetails["energy"] = track.Energy
					trackDetails["valence"] = track.Valence
					trackDetails["danceability"] = track.Danceability
					trackDetails["loudness"] = track.Loudness
					trackDetails["duration"] = track.Duration
					trackDetails["popularity"] = track.Popularity
				}

				// B. Enriched User Listening Stats
				if shareStats {
					// 1. Total Listens for this track
					totalListensResp, err := store.GetListensPaginated(ctx, db.GetItemsOpts{
						UserID:  int(user.ID),
						TrackID: int(req.TrackID),
						Period:  db.PeriodAllTime,
						Limit:   1, // Only need count
					})
					if err == nil {
						trackDetails["user_total_plays"] = totalListensResp.TotalCount
					}

					// 2. Listens this week
					weekListensResp, err := store.GetListensPaginated(ctx, db.GetItemsOpts{
						UserID:  int(user.ID),
						TrackID: int(req.TrackID),
						Period:  db.PeriodWeek,
						Limit:   1, // Only need count
					})
					if err == nil {
						trackDetails["user_plays_this_week"] = weekListensResp.TotalCount
					}
				}

				// 3. Current Context
				if shareContext {
					currentTime := time.Now()
					trackDetails["context"] = map[string]string{
						"time_of_day": currentTime.Format("15:04"),
						"day_of_week": currentTime.Weekday().String(),
					}
				}
			}
		}

		// 5. Call OpenRouter API
		aiModel = strings.TrimSpace(aiModel)
		systemPrompt := fmt.Sprintf("You are a music critic. %s", customPrompt)

		var userMessage string
		if trackDetails != nil {
			// Rich metadata prompt
			jsonBytes, _ := json.MarshalIndent(trackDetails, "", "  ")
			userMessage = fmt.Sprintf("Critique this track based on its metadata:\n%s", string(jsonBytes))
		} else {
			// Fallback text prompt
			userMessage = fmt.Sprintf("Critique the song '%s' by '%s' from the album '%s'.", req.TrackName, req.ArtistName, req.AlbumName)
		}

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
