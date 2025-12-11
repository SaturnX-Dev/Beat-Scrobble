-- name: UpsertClientSource :exec
INSERT INTO client_sources (user_id, name, token, last_seen)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, token) DO UPDATE
SET last_seen = NOW(), name = EXCLUDED.name;

-- name: GetClientSources :many
SELECT * FROM client_sources WHERE user_id = $1 ORDER BY last_seen DESC;
