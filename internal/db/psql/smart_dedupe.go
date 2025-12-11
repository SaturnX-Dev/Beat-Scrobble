package psql

import (
	"context"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/repository"
)

func (d *Psql) ExistsListenFuzzy(ctx context.Context, arg repository.ExistsListenFuzzyParams) (bool, error) {
	return d.q.ExistsListenFuzzy(ctx, arg)
}
