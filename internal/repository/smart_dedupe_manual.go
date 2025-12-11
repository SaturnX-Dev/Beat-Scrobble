package repository

import (
	"context"
	"time"
)

const existsListenFuzzy = `-- name: ExistsListenFuzzy :one
SELECT EXISTS(
    SELECT 1 FROM listens
    WHERE user_id = $1
      AND track_id = $2
      AND listened_at >= ($3::timestamptz - interval '60 seconds')
      AND listened_at <= ($3::timestamptz + interval '60 seconds')
)
`

type ExistsListenFuzzyParams struct {
	UserID     int32
	TrackID    int32
	ListenedAt time.Time
}

func (q *Queries) ExistsListenFuzzy(ctx context.Context, arg ExistsListenFuzzyParams) (bool, error) {
	row := q.db.QueryRow(ctx, existsListenFuzzy, arg.UserID, arg.TrackID, arg.ListenedAt)
	var exists bool
	err := row.Scan(&exists)
	return exists, err
}
