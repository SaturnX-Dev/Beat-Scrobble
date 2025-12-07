package ai

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PresenceManager tracks active user sessions
type PresenceManager struct {
	pool *pgxpool.Pool
}

// NewPresenceManager creates a new presence manager
func NewPresenceManager(pool *pgxpool.Pool) *PresenceManager {
	return &PresenceManager{pool: pool}
}

// Ping updates the user's last activity timestamp
func (p *PresenceManager) Ping(ctx context.Context, userID int32) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO user_presence (user_id, last_ping)
		VALUES ($1, NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET last_ping = NOW()
	`, userID)
	return err
}

// IsOnline checks if a user has pinged within the last 30 seconds
func (p *PresenceManager) IsOnline(ctx context.Context, userID int32) (bool, error) {
	var online bool
	err := p.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM user_presence
			WHERE user_id = $1 AND last_ping > NOW() - INTERVAL '30 seconds'
		)
	`, userID).Scan(&online)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	return online, err
}

// GetLastPing returns when the user was last active
func (p *PresenceManager) GetLastPing(ctx context.Context, userID int32) (*time.Time, error) {
	var lastPing time.Time
	err := p.pool.QueryRow(ctx, `
		SELECT last_ping FROM user_presence WHERE user_id = $1
	`, userID).Scan(&lastPing)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &lastPing, nil
}

// Cleanup removes old presence records (older than 5 minutes)
func (p *PresenceManager) Cleanup(ctx context.Context) error {
	_, err := p.pool.Exec(ctx, `
		DELETE FROM user_presence WHERE last_ping < NOW() - INTERVAL '5 minutes'
	`)
	return err
}
