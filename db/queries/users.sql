-- name: InsertUser :one
INSERT INTO users (username, password, role)
VALUES ($1, $2, $3)
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1;

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: InsertApiKey :one
INSERT INTO api_keys (user_id, key, label)
VALUES ($1, $2, $3)
RETURNING *;

-- name: DeleteApiKey :exec
DELETE FROM api_keys WHERE id = $1;

-- name: CountApiKeys :one
SELECT COUNT(*) FROM api_keys WHERE user_id = $1;

-- name: GetUserByApiKey :one 
SELECT u.* 
FROM users u
JOIN api_keys ak ON u.id = ak.user_id 
WHERE ak.key = $1;

-- name: GetAllApiKeysByUserID :many
SELECT ak.*
FROM api_keys ak 
JOIN users u ON ak.user_id = u.id 
WHERE u.id = $1;

-- name: UpdateUserUsername :exec
UPDATE users SET username = $2 WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users SET password = $2 WHERE id = $1;

-- name: UpdateApiKeyLabel :exec
UPDATE api_keys SET label = $3 WHERE id = $1 AND user_id = $2;
