-- name: GetUserPreferences :one
SELECT preferences_data
FROM user_preferences
WHERE user_id = $1;

-- name: SaveUserPreferences :exec
INSERT INTO user_preferences (user_id, preferences_data)
VALUES ($1, $2)
ON CONFLICT (user_id)
DO UPDATE SET
    preferences_data = EXCLUDED.preferences_data,
    updated_at = now();
