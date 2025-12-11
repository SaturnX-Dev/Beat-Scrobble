package psql

import (
	"context"
	"fmt"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/repository"
)

func (d *Psql) UpsertClientSource(ctx context.Context, userID int32, name, token string) error {
	return d.q.UpsertClientSource(ctx, repository.UpsertClientSourceParams{
		UserID: userID,
		Name:   name,
		Token:  token,
	})
}

func (d *Psql) GetClientSources(ctx context.Context, userID int32) ([]models.ClientSource, error) {
	rows, err := d.q.GetClientSources(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("GetClientSources: %w", err)
	}

	sources := make([]models.ClientSource, len(rows))
	for i, r := range rows {
		sources[i] = models.ClientSource{
			ID:        r.ID,
			UserID:    r.UserID,
			Name:      r.Name,
			Token:     r.Token,
			LastSeen:  r.LastSeen.Time,
			Config:    r.Config,
			CreatedAt: r.CreatedAt.Time,
		}
	}
	return sources, nil
}
