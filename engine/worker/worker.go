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

type ImportJob struct {
	Filename string
	UserID   int32
}

type Worker struct {
	ImportQueue chan ImportJob
	DB          db.DB
	MBZ         mbz.MusicBrainzCaller
	Logger      *zerolog.Logger
	wg          sync.WaitGroup
	quit        chan struct{}
}

func New(db db.DB, mbz mbz.MusicBrainzCaller, l *zerolog.Logger) *Worker {
	return &Worker{
		ImportQueue: make(chan ImportJob, 100), // Buffer up to 100 files
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
		case job := <-w.ImportQueue:
			w.Logger.Info().Str("file", job.Filename).Int("user_id", int(job.UserID)).Msg("Worker: Received import job")
			w.processImport(job)
		case <-w.quit:
			w.Logger.Info().Msg("Worker: Shutting down background processor")
			return
		}
	}
}

func (w *Worker) processImport(job ImportJob) {
	// Re-use logic from engine.go's RunImporter but for single file
	l := w.Logger.With().Str("component", "worker").Str("file", job.Filename).Int("user_id", int(job.UserID)).Logger()
	ctx := logger.NewContext(&l)

	// Determine type based on name (legacy logic)
	var err error
	if strings.Contains(job.Filename, "Streaming_History_Audio") {
		err = importer.ImportSpotifyFile(ctx, w.DB, job.Filename, job.UserID)
	} else if strings.Contains(job.Filename, "maloja") {
		err = importer.ImportMalojaFile(ctx, w.DB, job.Filename, job.UserID)
	} else if strings.Contains(job.Filename, "recenttracks") {
		err = importer.ImportLastFMFile(ctx, w.DB, w.MBZ, job.Filename, job.UserID)
	} else if strings.Contains(job.Filename, "listenbrainz") {
		err = importer.ImportListenBrainzExport(ctx, w.DB, w.MBZ, job.Filename, job.UserID)
	} else if strings.Contains(job.Filename, "beat_scrobble") || strings.Contains(job.Filename, "beat-scrobble") {
		err = importer.ImportBeatScrobbleFile(ctx, w.DB, job.Filename, job.UserID)
	} else if strings.Contains(job.Filename, "koito") {
		err = importer.ImportKoitoFile(ctx, w.DB, job.Filename, job.UserID)
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

// EnqueueImport adds a file to the processing queue. Returns true if enqueued, false if dropped.
func (w *Worker) EnqueueImport(filename string, userID int32) bool {
	job := ImportJob{
		Filename: filename,
		UserID:   userID,
	}
	select {
	case w.ImportQueue <- job:
		w.Logger.Info().Str("file", filename).Int("user_id", int(userID)).Msg("Worker: Enqueued for processing")
		return true
	default:
		w.Logger.Warn().Str("file", filename).Msg("Worker: Queue full, dropped import")
		return false
	}
}
