package handlers

// [LEGACY CORE]
// This file is part of the original Koito core.
// Maintained by Beat Scrobble for backward compatibility.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/catalog"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/mbz"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"golang.org/x/sync/singleflight"
)

// Structs moved to internal/models/lbz.go

const (
	maxListensPerRequest = 1000
)

var sfGroup singleflight.Group

func LbzSubmitListenHandler(store db.DB, mbzc mbz.MusicBrainzCaller) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logger.FromContext(r.Context())

		l.Debug().Msg("LbzSubmitListenHandler: Received request to submit listens")

		var req models.LbzSubmitListenRequest
		requestBytes, err := io.ReadAll(r.Body)
		if err != nil {
			l.Err(err).Msg("LbzSubmitListenHandler: Failed to read request body")
			utils.WriteError(w, "failed to read request body", http.StatusBadRequest)
			return
		}
		if err := json.NewDecoder(bytes.NewBuffer(requestBytes)).Decode(&req); err != nil {
			l.Err(err).Msg("LbzSubmitListenHandler: Failed to decode request")
			utils.WriteError(w, "failed to decode request", http.StatusBadRequest)
			return
		}

		u := middleware.GetUserFromContext(r.Context())
		if u == nil {
			l.Debug().Msg("LbzSubmitListenHandler: Unauthorized request (user context is nil)")
			utils.WriteError(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		l.Debug().Any("request_body", req).Msg("LbzSubmitListenHandler: Parsed request body")

		if len(req.Payload) < 1 {
			l.Debug().Msg("LbzSubmitListenHandler: Payload is empty")
			utils.WriteError(w, "payload is nil", http.StatusBadRequest)
			return
		}

		if len(req.Payload) > maxListensPerRequest {
			l.Debug().Msgf("LbzSubmitListenHandler: Payload exceeds max listens per request (%d > %d)", len(req.Payload), maxListensPerRequest)
			utils.WriteError(w, "payload exceeds max listens per request", http.StatusBadRequest)
			return
		}

		if len(req.Payload) != 1 && req.ListenType != "import" {
			l.Debug().Msg("LbzSubmitListenHandler: Payload must only contain one listen for non-import requests")
			utils.WriteError(w, "payload must only contain one listen for non-import requests", http.StatusBadRequest)
			return
		}

		// Capture client name from the first payloaditem for auto-registration
		// Note: req.Payload cannot be empty here due to check above
		var payloadOneClient string
		if len(req.Payload) > 0 {
			if req.Payload[0].TrackMeta.AdditionalInfo.MediaPlayer != "" {
				payloadOneClient = req.Payload[0].TrackMeta.AdditionalInfo.MediaPlayer
			} else if req.Payload[0].TrackMeta.AdditionalInfo.SubmissionClient != "" {
				payloadOneClient = req.Payload[0].TrackMeta.AdditionalInfo.SubmissionClient
			}
		}

		for _, payload := range req.Payload {
			if payload.TrackMeta.ArtistName == "" || payload.TrackMeta.TrackName == "" {
				l.Debug().Msg("LbzSubmitListenHandler: Artist name or track name are missing")
				utils.WriteError(w, "Artist name or track name are missing", http.StatusBadRequest)
				return
			}

			if req.ListenType != models.ListenTypePlayingNow && req.ListenType != models.ListenTypeSingle && req.ListenType != models.ListenTypeImport {
				l.Debug().Msg("LbzSubmitListenHandler: No listen type provided, assuming 'single'")
				req.ListenType = "single"
			}

			artistMbzIDs, err := utils.ParseUUIDSlice(payload.TrackMeta.AdditionalInfo.ArtistMBIDs)
			if err != nil {
				l.Debug().AnErr("error", err).Msg("LbzSubmitListenHandler: Failed to parse one or more UUIDs")
			}
			if len(artistMbzIDs) < 1 {
				l.Debug().AnErr("error", err).Msg("LbzSubmitListenHandler: Attempting to parse artist UUIDs from mbid_mapping")
				utils.ParseUUIDSlice(payload.TrackMeta.MBIDMapping.ArtistMBIDs)
				if err != nil {
					l.Debug().AnErr("error", err).Msg("LbzSubmitListenHandler: Failed to parse one or more UUIDs")
				}
			}
			rgMbzID, err := uuid.Parse(payload.TrackMeta.AdditionalInfo.ReleaseGroupMBID)
			if err != nil {
				rgMbzID = uuid.Nil
			}
			releaseMbzID, err := uuid.Parse(payload.TrackMeta.AdditionalInfo.ReleaseMBID)
			if err != nil {
				releaseMbzID, err = uuid.Parse(payload.TrackMeta.MBIDMapping.ReleaseMBID)
				if err != nil {
					releaseMbzID = uuid.Nil
				}
			}
			recordingMbzID, err := uuid.Parse(payload.TrackMeta.AdditionalInfo.RecordingMBID)
			if err != nil {
				recordingMbzID, err = uuid.Parse(payload.TrackMeta.MBIDMapping.RecordingMBID)
				if err != nil {
					recordingMbzID = uuid.Nil
				}
			}

			var client string
			if payload.TrackMeta.AdditionalInfo.MediaPlayer != "" {
				client = payload.TrackMeta.AdditionalInfo.MediaPlayer
			} else if payload.TrackMeta.AdditionalInfo.SubmissionClient != "" {
				client = payload.TrackMeta.AdditionalInfo.SubmissionClient
			}

			var duration int32
			if payload.TrackMeta.AdditionalInfo.Duration != 0 {
				duration = payload.TrackMeta.AdditionalInfo.Duration
			} else if payload.TrackMeta.AdditionalInfo.DurationMs != 0 {
				duration = payload.TrackMeta.AdditionalInfo.DurationMs / 1000
			}

			var listenedAt = time.Now()
			if payload.ListenedAt != 0 {
				listenedAt = time.Unix(payload.ListenedAt, 0)
			}

			var artistMbidMap []catalog.ArtistMbidMap
			for _, a := range payload.TrackMeta.MBIDMapping.Artists {
				if a.ArtistMBID == "" || a.ArtistName == "" {
					continue
				}
				mbid, err := uuid.Parse(a.ArtistMBID)
				if err != nil {
					l.Debug().AnErr("error", err).Msgf("LbzSubmitListenHandler: Failed to parse UUID for artist '%s'", a.ArtistName)
				}
				artistMbidMap = append(artistMbidMap, catalog.ArtistMbidMap{Artist: a.ArtistName, Mbid: mbid})
			}

			opts := catalog.SubmitListenOpts{
				MbzCaller:          mbzc,
				ArtistNames:        payload.TrackMeta.AdditionalInfo.ArtistNames,
				Artist:             payload.TrackMeta.ArtistName,
				ArtistMbzIDs:       artistMbzIDs,
				TrackTitle:         payload.TrackMeta.TrackName,
				RecordingMbzID:     recordingMbzID,
				ReleaseTitle:       payload.TrackMeta.ReleaseName,
				ReleaseMbzID:       releaseMbzID,
				ReleaseGroupMbzID:  rgMbzID,
				ArtistMbidMappings: artistMbidMap,
				Duration:           duration,
				Time:               listenedAt,
				UserID:             u.ID,
				Client:             client,
				IsNowPlaying:       req.ListenType == models.ListenTypePlayingNow,
				SkipSaveListen:     req.ListenType == models.ListenTypePlayingNow,
			}

			_, err, shared := sfGroup.Do(buildCaolescingKey(payload), func() (interface{}, error) {
				return 0, catalog.SubmitListen(r.Context(), store, opts)
			})
			if shared {
				l.Info().Msg("LbzSubmitListenHandler: Duplicate requests detected; results were coalesced")
			}
			if err != nil {
				l.Err(err).Msg("LbzSubmitListenHandler: Failed to submit listen")
				w.WriteHeader(http.StatusInternalServerError)
				w.Header().Set("Content-Type", "application/json")
				w.Write([]byte("{\"status\": \"internal server error\"}"))
				return
			}
		}

		l.Debug().Msg("LbzSubmitListenHandler: Successfully processed listens")
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("{\"status\": \"ok\"}"))

		// Check User Preferences for Relay overrides
		// Default to global config
		relayEnabled := cfg.LbzRelayEnabled()
		relayUrl := cfg.LbzRelayUrl()
		relayToken := cfg.LbzRelayToken()

		// Try to fetch user overrides
		if prefsBytes, err := store.GetUserPreferences(r.Context(), u.ID); err == nil && len(prefsBytes) > 0 {
			var prefs map[string]interface{}
			if err := json.Unmarshal(prefsBytes, &prefs); err == nil {
				if val, ok := prefs["relay_enabled"].(bool); ok {
					relayEnabled = val
				}
				if val, ok := prefs["relay_url"].(string); ok && val != "" {
					relayUrl = val
				}
				if val, ok := prefs["relay_token"].(string); ok && val != "" {
					relayToken = val
				}
			}
		}

		// Auto-register client source
		authHeader := r.Header.Get("Authorization")
		var token string
		if strings.HasPrefix(strings.ToLower(authHeader), "token ") {
			token = strings.TrimSpace(authHeader[6:])
		}

		if token != "" {
			sourceName := payloadOneClient
			if sourceName == "" {
				sourceName = r.UserAgent()
			}
			if sourceName == "" {
				sourceName = "Unknown Client"
			}

			// Upsert asynchronously
			go func(uid int32, name, tok string) {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if err := store.UpsertClientSource(ctx, uid, name, tok); err != nil {
					l.Debug().Err(err).Msg("Failed to upsert client source")
				}
			}(u.ID, sourceName, token)
		}

		if relayEnabled {
			go doLbzRelay(requestBytes, l, relayUrl, relayToken)
		}
	}
}

func doLbzRelay(requestBytes []byte, l *zerolog.Logger, relayUrl, relayToken string) {
	defer func() {
		if r := recover(); r != nil {
			l.Error().Interface("recover", r).Msg("doLbzRelay: Panic occurred")
		}
	}()
	const (
		maxRetryDuration = 3 * time.Minute
		initialBackoff   = 5 * time.Second
		maxBackoff       = 40 * time.Second
	)

	// Normalize URL
	targetUrl := relayUrl
	if !strings.HasSuffix(targetUrl, "/submit-listens") {
		// handle base url vs full endpoint url
		// if user put "api.listenbrainz.org", we assume he means base
		// but if he puts "api.listenbrainz.org/1/submit-listens", we use that
		// simplest heuristic: append /submit-listens if not present?
		// But LBZ API is /1/submit-listens usually.
		// Let's assume the user inputs the BASE API URL if standard, or full if custom?
		// cfg.LbzRelayUrl() usually expects base.
		// Let's stick to appending /submit-listens to be consistent with original code
		// original was: cfg.LbzRelayUrl()+"/submit-listens"
		// If user provides "https://api.listenbrainz.org/1", we append.
		targetUrl = fmt.Sprintf("%s/submit-listens", strings.TrimRight(relayUrl, "/"))
	}

	l.Debug().Str("url", targetUrl).Msg("doLbzRelay: Building ListenBrainz relay request")
	req, err := http.NewRequest("POST", targetUrl, bytes.NewBuffer(requestBytes))
	if err != nil {
		l.Err(err).Msg("doLbzRelay: Failed to build ListenBrainz relay request")
		return
	}
	req.Header.Add("Authorization", "Token "+relayToken)
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	var resp *http.Response
	var body []byte
	start := time.Now()
	backoff := initialBackoff

	for {
		l.Debug().Msg("doLbzRelay: Sending ListenBrainz relay request")
		resp, err = client.Do(req)
		if err != nil {
			l.Err(err).Msg("doLbzRelay: Failed to send ListenBrainz relay request")
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			l.Info().Msg("doLbzRelay: Successfully relayed ListenBrainz submission")
			return
		}

		body, _ = io.ReadAll(resp.Body)

		if resp.StatusCode >= 500 && time.Since(start)+backoff <= maxRetryDuration {
			l.Warn().
				Int("status", resp.StatusCode).
				Str("response", string(body)).
				Msg("doLbzRelay: Retryable server error from ListenBrainz relay, retrying...")
			time.Sleep(backoff)
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			continue
		}

		l.Warn().
			Int("status", resp.StatusCode).
			Str("response", string(body)).
			Msg("doLbzRelay: Non-2XX response from ListenBrainz relay")
		return
	}
}

func buildCaolescingKey(p models.LbzSubmitListenPayload) string {
	// the key not including the listen_type introduces the very rare possibility of a playing_now
	// request taking precedence over a single, meaning that a listen will not be logged when it
	// should, however that would require a playing_now request to fire a few seconds before a 'single'
	// of the same track, which should never happen outside of misbehaving clients
	//
	// this could be fixed by restructuring the database inserts for idempotency, which would
	// eliminate the need to coalesce responses, however i'm not gonna do that right now
	return fmt.Sprintf("%s:%s:%s", p.TrackMeta.ArtistName, p.TrackMeta.TrackName, p.TrackMeta.ReleaseName)
}
