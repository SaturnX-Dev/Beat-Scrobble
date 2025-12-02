-- name: InsertSession :one 
INSERT INTO sessions (id, user_id, expires_at, persistent)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSession :one
SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW();

-- name: UpdateSessionExpiry :exec 
UPDATE sessions SET expires_at = $2 WHERE id = $1;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE id = $1;

-- name: GetUserBySession :one
SELECT * 
FROM users u
JOIN sessions s ON u.id = s.user_id 
WHERE s.id = $1;
