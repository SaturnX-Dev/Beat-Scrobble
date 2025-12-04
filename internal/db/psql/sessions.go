package psql

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (d *Psql) SaveSession(ctx context.Context, userID int32, expiresAt time.Time, persistent bool) (*models.Session, error) {
	session, err := d.q.InsertSession(ctx, repository.InsertSessionParams{
		ID:         uuid.New(),
		UserID:     userID,
		ExpiresAt:  expiresAt,
		Persistent: persistent,
	})
	if err != nil {
		return nil, fmt.Errorf("SaveSession: InsertSession: %w", err)
	}
	return &models.Session{
		ID:         session.ID,
		UserID:     session.UserID,
		CreatedAt:  session.CreatedAt,
		ExpiresAt:  session.ExpiresAt,
		Persistent: session.Persistent,
	}, nil
}

func (d *Psql) RefreshSession(ctx context.Context, sessionId uuid.UUID, expiresAt time.Time) error {
	return d.q.UpdateSessionExpiry(ctx, repository.UpdateSessionExpiryParams{
		ID:        sessionId,
		ExpiresAt: expiresAt,
	})
}

func (d *Psql) DeleteSession(ctx context.Context, sessionId uuid.UUID) error {
	return d.q.DeleteSession(ctx, sessionId)
}

// Returns nil, nil when no database entries are found
func (d *Psql) GetUserBySession(ctx context.Context, sessionId uuid.UUID) (*models.User, error) {
	row, err := d.q.GetUserBySession(ctx, sessionId)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("SaveSession: GetUserBySession: %w", err)
	}

	return &models.User{
		ID:       row.ID,
		Username: row.Username,
		Password: row.Password,
		Role:     models.UserRole(row.Role),
	}, nil
}
