package importer

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/catalog"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/mbz"
)

type SpotifyExportItem struct {
	Timestamp  time.Time `json:"ts"`
	TrackName  string    `json:"master_metadata_track_name"`
	ArtistName string    `json:"master_metadata_album_artist_name"`
	AlbumName  string    `json:"master_metadata_album_album_name"`
	ReasonEnd  string    `json:"reason_end"`
	MsPlayed   int32     `json:"ms_played"`
}

func ImportSpotifyFile(ctx context.Context, store db.DB, filename string, userID int32) error {
	l := logger.FromContext(ctx)
	l.Info().Msgf("Beginning spotify import on file: %s for user: %d", filename, userID)
	// Files are now stored in user-specific subdirectories or passed via valid path
	// The filename passed here should probably be the full path or relative path from config
	// But let's assume the caller handles the pathing or we check both?
	// For now, let's update the signature first.
	// Since we are moving to <config>/import/<username>/<file>, the caller will likely pass the full path or we construct it.
	// Let's assume filename is the path relative to config/import or full path.
	// To minimize breakage, let's assume the caller resolves the path for now,
	// OR we assume standard `import/username/file` structure.

	// Existing code used: path.Join(cfg.ConfigDir(), "import", filename)
	// We should probably just iterate on the arguments.
	// Let's change the function to accept the FULL PATH or relative path.
	// Actually, let's keep it simple: The caller (RunImporter/Worker) constructs the path.
	// So we should remove the hardcoded path join here?
	// Wait, existing code: os.Open(path.Join(cfg.ConfigDir(), "import", filename))
	// I should probably change this to accept `filePath string` instead of filename+join.

	// Implementation:
	filePath := path.Join(cfg.ConfigDir(), "import", filename)
	// If the file is in a subdirectory, 'filename' coming from the walker might be "user/file.json".
	// path.Join handles that correctly.

	file, err := os.Open(filePath)
	if err != nil {
		l.Err(err).Msgf("Failed to read import file: %s", filePath)
		return fmt.Errorf("ImportSpotifyFile: %w", err)
	}
	defer file.Close()
	var throttleFunc = func() {}
	if ms := cfg.ThrottleImportMs(); ms > 0 {
		throttleFunc = func() {
			time.Sleep(time.Duration(ms) * time.Millisecond)
		}
	}
	export := make([]SpotifyExportItem, 0)
	err = json.NewDecoder(file).Decode(&export)
	if err != nil {
		return fmt.Errorf("ImportSpotifyFile: %w", err)
	}

	for _, item := range export {
		if item.ReasonEnd != "trackdone" {
			continue
		}
		if !inImportTimeWindow(item.Timestamp) {
			l.Debug().Msgf("Skipping import due to import time rules")
			continue
		}
		dur := item.MsPlayed
		if item.TrackName == "" || item.ArtistName == "" {
			l.Debug().Msg("Skipping non-track item")
			continue
		}
		opts := catalog.SubmitListenOpts{
			MbzCaller:        &mbz.MusicBrainzClient{},
			Artist:           item.ArtistName,
			TrackTitle:       item.TrackName,
			ReleaseTitle:     item.AlbumName,
			Duration:         dur / 1000,
			Time:             item.Timestamp,
			Client:           "spotify",
			UserID:           userID,
			SkipCacheImage:   !cfg.FetchImagesDuringImport(),
			DeduplicateFuzzy: true,
		}
		err = catalog.SubmitListen(ctx, store, opts)
		if err != nil {
			l.Err(err).Msg("Failed to import spotify playback item")
			return fmt.Errorf("ImportSpotifyFile: %w", err)
		}
		throttleFunc()
	}
	return finishImport(ctx, filename, len(export))
}
