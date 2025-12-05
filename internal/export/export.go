package export

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/google/uuid"
)

type BeatScrobbleExport struct {
	Version     string                 `json:"version"`
	ExportedAt  time.Time              `json:"exported_at"` // RFC3339
	User        string                 `json:"user"`        // username
	Preferences map[string]interface{} `json:"preferences,omitempty"`
	Theme       json.RawMessage        `json:"theme,omitempty"`
	Listens     []BeatScrobbleListen   `json:"listens"`
}
type BeatScrobbleListen struct {
	ListenedAt time.Time            `json:"listened_at"`
	Track      BeatScrobbleTrack    `json:"track"`
	Album      BeatScrobbleAlbum    `json:"album"`
	Artists    []BeatScrobbleArtist `json:"artists"`
}
type BeatScrobbleTrack struct {
	MBID     *uuid.UUID     `json:"mbid"`
	Duration int            `json:"duration"`
	Aliases  []models.Alias `json:"aliases"`
}
type BeatScrobbleAlbum struct {
	ImageUrl       string         `json:"image_url"`
	MBID           *uuid.UUID     `json:"mbid"`
	Aliases        []models.Alias `json:"aliases"`
	VariousArtists bool           `json:"various_artists"`
}
type BeatScrobbleArtist struct {
	ImageUrl  string         `json:"image_url"`
	MBID      *uuid.UUID     `json:"mbid"`
	IsPrimary bool           `json:"is_primary"`
	Aliases   []models.Alias `json:"aliases"`
}

func ExportData(ctx context.Context, user *models.User, store db.DB, out io.Writer) error {
	lastTime := time.Unix(0, 0)
	lastTrackId := int32(0)
	pageSize := int32(1000)

	l := logger.FromContext(ctx)
	l.Info().Msg("ExportData: Generating Beat Scrobble export file...")

	exportedAt := time.Now()

	// Fetch user preferences
	var prefs map[string]interface{}
	prefBytes, err := store.GetUserPreferences(ctx, user.ID)
	if err == nil && prefBytes != nil {
		json.Unmarshal(prefBytes, &prefs)
	}

	// Filter out AI cache data from export (keeps prompts/keys, removes cached responses)
	prefs = filterAICacheFromPrefs(prefs)

	// Fetch user theme
	themeBytes, _ := store.GetUserTheme(ctx, user.ID)
	themeJSON := "{}"
	if themeBytes != nil {
		themeJSON = string(themeBytes)
	}

	// Write the opening of the JSON manually
	prefsJSON := "{}"
	if prefs != nil {
		if b, err := json.Marshal(prefs); err == nil {
			prefsJSON = string(b)
		}
	}

	_, err = fmt.Fprintf(out, "{\n  \"version\": \"2\",\n  \"exported_at\": \"%s\",\n  \"user\": \"%s\",\n  \"preferences\": %s,\n  \"theme\": %s,\n  \"listens\": [\n", exportedAt.UTC().Format(time.RFC3339), user.Username, prefsJSON, themeJSON)
	if err != nil {
		return fmt.Errorf("ExportData: %w", err)
	}

	first := true
	for {
		rows, err := store.GetExportPage(ctx, db.GetExportPageOpts{
			UserID:     user.ID,
			ListenedAt: lastTime,
			TrackID:    lastTrackId,
			Limit:      pageSize,
		})
		if err != nil {
			return fmt.Errorf("ExportData: %w", err)
		}
		if len(rows) == 0 {
			break
		}

		for _, r := range rows {
			// Adds a comma after each listen item
			if !first {
				_, _ = out.Write([]byte(",\n"))
			}
			first = false

			exported := convertToExportFormat(r)

			raw, err := json.MarshalIndent(exported, "    ", "  ")

			// needed to make the listen item start at the right indent level
			out.Write([]byte("    "))

			if err != nil {
				return fmt.Errorf("ExportData: marshal: %w", err)
			}
			_, _ = out.Write(raw)

			if r.TrackID > lastTrackId {
				lastTrackId = r.TrackID
			}
			if r.ListenedAt.After(lastTime) {
				lastTime = r.ListenedAt
			}
		}
	}

	// Write closing of the JSON array and object
	_, err = out.Write([]byte("\n  ]\n}\n"))
	if err != nil {
		return fmt.Errorf("ExportData: f.Write: %w", err)
	}

	l.Info().Msgf("Export successfully created")
	return nil
}

func convertToExportFormat(item *db.ExportItem) *BeatScrobbleListen {
	ret := &BeatScrobbleListen{
		ListenedAt: item.ListenedAt.UTC(),
		Track: BeatScrobbleTrack{
			MBID:     item.TrackMbid,
			Duration: int(item.TrackDuration),
			Aliases:  item.TrackAliases,
		},
		Album: BeatScrobbleAlbum{
			MBID:           item.ReleaseMbid,
			ImageUrl:       item.ReleaseImageSource,
			VariousArtists: item.VariousArtists,
			Aliases:        item.ReleaseAliases,
		},
	}
	for i := range item.Artists {
		ret.Artists = append(ret.Artists, BeatScrobbleArtist{
			IsPrimary: item.Artists[i].IsPrimary,
			MBID:      item.Artists[i].MbzID,
			Aliases:   item.Artists[i].Aliases,
			ImageUrl:  item.Artists[i].ImageSource,
		})
	}
	return ret
}

func filterAICacheFromPrefs(prefs map[string]interface{}) map[string]interface{} {
	if prefs == nil {
		return nil
	}

	newPrefs := make(map[string]interface{})
	for k, v := range prefs {
		// Filter out Profile Critiques Cache
		if k == "profile_critiques" {
			continue
		}
		// Filter out AI Playlists Cache
		if k == "ai_playlists_cache" {
			continue
		}
		// Filter out Track Critiques Cache (starts with comet_ai_track_)
		if len(k) >= 15 && k[:15] == "comet_ai_track_" {
			continue
		}

		newPrefs[k] = v
	}
	return newPrefs
}
