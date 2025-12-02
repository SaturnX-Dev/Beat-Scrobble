-- name: InsertArtistAlias :exec
INSERT INTO artist_aliases (artist_id, alias, source, is_primary)
VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: GetAllArtistAliases :many
SELECT * FROM artist_aliases
WHERE artist_id = $1 ORDER BY is_primary DESC;

-- name: GetArtistAlias :one 
SELECT * FROM artist_aliases
WHERE alias = $1 LIMIT 1;

-- name: SetArtistAliasPrimaryStatus :exec
UPDATE artist_aliases SET is_primary = $1 WHERE artist_id = $2 AND alias = $3;

-- name: DeleteArtistAlias :exec
DELETE FROM artist_aliases 
WHERE artist_id = $1
AND alias = $2
AND is_primary = false;

-- name: InsertReleaseAlias :exec
INSERT INTO release_aliases (release_id, alias, source, is_primary)
VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: GetAllReleaseAliases :many
SELECT * FROM release_aliases
WHERE release_id = $1 ORDER BY is_primary DESC;

-- name: GetReleaseAlias :one 
SELECT * FROM release_aliases
WHERE alias = $1 LIMIT 1;

-- name: SetReleaseAliasPrimaryStatus :exec
UPDATE release_aliases SET is_primary = $1 WHERE release_id = $2 AND alias = $3;

-- name: DeleteReleaseAlias :exec
DELETE FROM release_aliases 
WHERE release_id = $1
AND alias = $2
AND is_primary = false;

-- name: InsertTrackAlias :exec
INSERT INTO track_aliases (track_id, alias, source, is_primary)
VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: GetAllTrackAliases :many
SELECT * FROM track_aliases
WHERE track_id = $1 ORDER BY is_primary DESC;

-- name: GetTrackAlias :one 
SELECT * FROM track_aliases
WHERE alias = $1 LIMIT 1;

-- name: SetTrackAliasPrimaryStatus :exec
UPDATE track_aliases SET is_primary = $1 WHERE track_id = $2 AND alias = $3;

-- name: DeleteTrackAlias :exec
DELETE FROM track_aliases 
WHERE track_id = $1
AND alias = $2
AND is_primary = false;