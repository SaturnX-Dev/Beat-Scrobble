package worker

import (
	"strings"
	"sync"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/importer"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	mbz "github.com/SaturnX-Dev/Beat-Scrobble/internal/mbz"
	"github.com/rs/zerolog"
)

type Worker struct {
	ImportQueue chan string
	DB          db.DB
	MBZ         mbz.MusicBrainzCaller
	Logger      *zerolog.Logger
	wg          sync.WaitGroup
	quit        chan struct{}
}

func New(db db.DB, mbz mbz.MusicBrainzCaller, l *zerolog.Logger) *Worker {
	return &Worker{
		ImportQueue: make(chan string, 100), // Buffer up to 100 files
		DB:          db,
		MBZ:         mbz,
		Logger:      l,
		quit:        make(chan struct{}),
	}
}

func (w *Worker) Start() {
	w.wg.Add(1)
	go w.processLoop()
}

func (w *Worker) Stop() {
	close(w.quit)
	w.wg.Wait()
}

func (w *Worker) processLoop() {
	defer w.wg.Done()
	w.Logger.Info().Msg("Worker: Background processor started")

	for {
		select {
		case filename := <-w.ImportQueue:
			w.Logger.Info().Str("file", filename).Msg("Worker: Received import job")
			w.processImport(filename)
		case <-w.quit:
			w.Logger.Info().Msg("Worker: Shutting down background processor")
			return
		}
	}
}

func (w *Worker) processImport(filename string) {
	// Re-use logic from engine.go's RunImporter but for single file
	l := w.Logger.With().Str("component", "worker").Str("file", filename).Logger()
	ctx := logger.NewContext(&l)

	// Determine type based on name (legacy logic)
	var err error
	if strings.Contains(filename, "Streaming_History_Audio") {
		err = importer.ImportSpotifyFile(ctx, w.DB, filename)
	} else if strings.Contains(filename, "maloja") {
		err = importer.ImportMalojaFile(ctx, w.DB, filename)
	} else if strings.Contains(filename, "recenttracks") {
		err = importer.ImportLastFMFile(ctx, w.DB, w.MBZ, filename)
	} else if strings.Contains(filename, "listenbrainz") {
		err = importer.ImportListenBrainzExport(ctx, w.DB, w.MBZ, filename)
	} else if strings.Contains(filename, "beat_scrobble") || strings.Contains(filename, "beat-scrobble") || strings.Contains(filename, "koito") {
		err = importer.ImportBeatScrobbleFile(ctx, w.DB, filename)
	} else {
		l.Warn().Msg("Worker: Unknown file type")
		return
	}

	if err != nil {
		l.Error().Err(err).Msg("Worker: Import failed")
	} else {
		l.Info().Msg("Worker: Import completed successfully")
		// Optional: Delete file after success? Legacy code kept it, so we keep it.
	}
}

// EnqueueImport adds a file to the processing queue
func (w *Worker) EnqueueImport(filename string) {
	select {
	case w.ImportQueue <- filename:
		w.Logger.Info().Str("file", filename).Msg("Worker: Enqueued for processing")
	default:
		w.Logger.Warn().Str("file", filename).Msg("Worker: Queue full, dropped import")
	}
}
