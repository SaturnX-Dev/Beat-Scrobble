package psql

import (
	"context"
	"database/sql"
)


// SaveUserTheme saves or updates a user's theme
func (s *Psql) SaveUserTheme(ctx context.Context, userId int32, themeData []byte) error {
	query := `
		INSERT INTO user_themes (user_id, theme_data)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET theme_data = EXCLUDED.theme_data, updated_at = now()
	`
	_, err := s.conn.Exec(ctx, query, userId, themeData)
	return err
}

// GetUserTheme retrieves a user's saved theme
func (s *Psql) GetUserTheme(ctx context.Context, userId int32) ([]byte, error) {
	query := `SELECT theme_data FROM user_themes WHERE user_id = $1`
	
	var themeData []byte
	err := s.conn.QueryRow(ctx, query, userId).Scan(&themeData)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return themeData, nil
}
