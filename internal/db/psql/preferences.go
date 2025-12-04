package psql

import (
	"context"
	"database/sql"
)

// SaveUserPreferences saves or updates a user's preferences
func (s *Psql) SaveUserPreferences(ctx context.Context, userId int32, preferencesData []byte) error {
	query := `
		INSERT INTO user_preferences (user_id, preferences_data)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET
			preferences_data = EXCLUDED.preferences_data,
			updated_at = now()
	`
	_, err := s.conn.Exec(ctx, query, userId, preferencesData)
	return err
}

// GetUserPreferences retrieves a user's preferences
func (s *Psql) GetUserPreferences(ctx context.Context, userId int32) ([]byte, error) {
	query := `SELECT preferences_data FROM user_preferences WHERE user_id = $1`

	var preferencesData []byte
	err := s.conn.QueryRow(ctx, query, userId).Scan(&preferencesData)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return preferencesData, nil
}
