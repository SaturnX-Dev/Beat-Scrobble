package handlers

// [BEAT SCROBBLE EXCLUSIVE]
// This file is part of the Beat Scrobble project.
// Copyright (c) 2025 SaturnX-Dev

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

type AIPlaylistRequest struct {
	Type string `json:"type"` // mood_mix, genre_dive, discover_weekly, etc.
}

type AIPlaylistResponse struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Tracks      []AIPlaylistTrack `json:"tracks"`
}

type AIPlaylistTrack struct {
	ID     int64  `json:"id,omitempty"`
	Name   string `json:"name"`
	Artist string `json:"artist"`
	Album  string `json:"album,omitempty"`
	Image  string `json:"image,omitempty"`
}

var playlistTypes = map[string]struct {
	Name        string
	Description string
	Prompt      string
}{
	"mood_mix": {
		Name:        "Mood Mix",
		Description: "Tracks matching your current vibe",
		Prompt:      "Based on the user's recent listening history, create a playlist of 15 tracks that match their current mood and emotional state.",
	},
	"genre_dive": {
		Name:        "Genre Dive",
		Description: "Deep dive into your top genres",
		Prompt:      "Based on the user's listening history, identify their top genre and create a playlist of 15 tracks that go deep into that genre, including some hidden gems.",
	},
	"discover_weekly": {
		Name:        "Discover Weekly",
		Description: "New artists based on your taste",
		Prompt:      "Based on the user's listening history, suggest 15 tracks from artists they haven't listened to yet but would likely enjoy based on their taste.",
	},
	"time_capsule": {
		Name:        "Time Capsule",
		Description: "Your most played from the past",
		Prompt:      "Create a nostalgic playlist of 15 tracks similar to the user's most played songs, focusing on classic vibes from their taste.",
	},
	"artist_radio": {
		Name:        "Artist Radio",
		Description: "Mix from your favorite artists",
		Prompt:      "Based on the user's top artists, create a radio-style playlist of 15 tracks mixing their favorites with similar artists.",
	},
	"decade_mix": {
		Name:        "Decade Mix",
		Description: "Best of each decade you love",
		Prompt:      "Based on the user's listening patterns, create a playlist of 15 tracks spanning different decades that match their taste.",
	},
	"hidden_gems": {
		Name:        "Hidden Gems",
		Description: "Tracks you might have missed",
		Prompt:      "Based on the user's listening history, find 15 lesser-known tracks that match their taste but they might have missed.",
	},
}

func GenerateAIPlaylistHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil {
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse request
		var req AIPlaylistRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		playlistType, exists := playlistTypes[req.Type]
		if !exists {
			utils.WriteError(w, "invalid playlist type", http.StatusBadRequest)
			return
		}

		l.Debug().Msgf("GenerateAIPlaylistHandler: Generating %s playlist", req.Type)

		// Get user preferences
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
		enabled, _ := prefs["ai_playlists_enabled"].(bool)
		customPrompt, _ := prefs["ai_playlists_prompt"].(string)
		aiModel, _ := prefs["ai_model"].(string)

		if !enabled {
			utils.WriteError(w, "AI playlists are disabled", http.StatusForbidden)
			return
		}

		if apiKey == "" {
			utils.WriteError(w, "OpenRouter API key not configured", http.StatusBadRequest)
			return
		}

		if aiModel == "" {
			aiModel = "google/gemini-2.0-flash-001"
		}

		// Get user's listening context using paginated methods
		topArtistsResp, _ := store.GetTopArtistsPaginated(ctx, db.GetItemsOpts{
			Limit:  10,
			Page:   1,
			Period: db.PeriodMonth,
		})
		topTracksResp, _ := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{
			Limit:  10,
			Page:   1,
			Period: db.PeriodMonth,
		})

		artistNames := make([]string, 0)
		if topArtistsResp != nil {
			for _, a := range topArtistsResp.Items {
				artistNames = append(artistNames, a.Name)
			}
		}

		trackInfo := make([]string, 0)
		if topTracksResp != nil {
			for _, t := range topTracksResp.Items {
				artistName := ""
				if len(t.Artists) > 0 {
					artistName = t.Artists[0].Name
				}
				trackInfo = append(trackInfo, fmt.Sprintf("%s by %s", t.Title, artistName))
			}
		}

		// Build AI prompt
		basePrompt := playlistType.Prompt
		if customPrompt != "" {
			basePrompt = customPrompt
		}

		systemPrompt := `You are a music recommendation AI. Generate playlists based on user listening history.
IMPORTANT: Respond ONLY with a valid JSON array of track objects. No markdown, no explanation.
Each track object must have: "name" (string), "artist" (string), "album" (string optional).
Example: [{"name": "Song Title", "artist": "Artist Name", "album": "Album Name"}]`

		userMessage := fmt.Sprintf(`%s

User's top artists this month: %v
User's top tracks this month: %v

Generate exactly 15 tracks. Return ONLY the JSON array.`, basePrompt, artistNames, trackInfo)

		// Call OpenRouter API
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
			utils.WriteError(w, "no playlist generated", http.StatusInternalServerError)
			return
		}

		// Parse AI response into tracks
		aiContent := openRouterResp.Choices[0].Message.Content
		var tracks []AIPlaylistTrack
		if err := json.Unmarshal([]byte(aiContent), &tracks); err != nil {
			l.Warn().Err(err).Str("content", aiContent).Msg("Failed to parse AI tracks, attempting cleanup")
			// Try to extract JSON from response
			start := 0
			end := len(aiContent)
			for i, c := range aiContent {
				if c == '[' {
					start = i
					break
				}
			}
			for i := len(aiContent) - 1; i >= 0; i-- {
				if aiContent[i] == ']' {
					end = i + 1
					break
				}
			}
			if start < end {
				if err := json.Unmarshal([]byte(aiContent[start:end]), &tracks); err != nil {
					l.Error().Err(err).Msg("Failed to parse cleaned AI tracks")
					utils.WriteError(w, "failed to parse AI response", http.StatusInternalServerError)
					return
				}
			}
		}

		response := AIPlaylistResponse{
			ID:          req.Type,
			Name:        playlistType.Name,
			Description: playlistType.Description,
			Tracks:      tracks,
		}

		l.Debug().Msgf("GenerateAIPlaylistHandler: Successfully generated %s playlist with %d tracks", req.Type, len(tracks))
		utils.WriteJSON(w, http.StatusOK, response)
	}
}
