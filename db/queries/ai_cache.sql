-- name: GetAICache :one
SELECT * FROM ai_cache
WHERE user_id = $1 AND cache_type = $2 AND cache_key = $3;

-- name: UpsertAICache :exec
INSERT INTO ai_cache (user_id, cache_type, cache_key, prompt_hash, data_hash, response, expires_at, listen_count)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (user_id, cache_type, cache_key)
DO UPDATE SET
    prompt_hash = EXCLUDED.prompt_hash,
    data_hash = EXCLUDED.data_hash,
    response = EXCLUDED.response,
    created_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    listen_count = EXCLUDED.listen_count;

-- name: DeleteAICacheByType :exec
DELETE FROM ai_cache
WHERE user_id = $1 AND cache_type = $2;

-- name: DeleteAICacheByKey :exec
DELETE FROM ai_cache
WHERE user_id = $1 AND cache_type = $2 AND cache_key = $3;

-- name: DeleteAllAICache :exec
DELETE FROM ai_cache
WHERE user_id = $1;

-- name: DeleteExpiredAICache :exec
DELETE FROM ai_cache
WHERE expires_at < NOW();

-- name: UpsertUserPresence :exec
INSERT INTO user_presence (user_id, last_ping)
VALUES ($1, NOW())
ON CONFLICT (user_id)
DO UPDATE SET last_ping = NOW();

-- name: GetUserPresence :one
SELECT * FROM user_presence
WHERE user_id = $1;

-- name: IsUserOnline :one
SELECT EXISTS(
    SELECT 1 FROM user_presence
    WHERE user_id = $1 AND last_ping > NOW() - INTERVAL '30 seconds'
) AS online;

-- name: CleanupOldPresence :exec
DELETE FROM user_presence
WHERE last_ping < NOW() - INTERVAL '5 minutes';
