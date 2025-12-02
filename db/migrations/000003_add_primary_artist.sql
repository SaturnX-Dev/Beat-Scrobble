-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd
ALTER TABLE artist_tracks
ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

ALTER TABLE artist_releases
ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- +goose StatementBegin
CREATE FUNCTION get_artists_for_release(release_id INTEGER)
RETURNS JSONB AS $$
    SELECT json_agg(
        jsonb_build_object('id', a.id, 'name', a.name)
        ORDER BY ar.is_primary DESC, a.name
    )
    FROM artist_releases ar
    JOIN artists_with_name a ON a.id = ar.artist_id
    WHERE ar.release_id = $1;
$$ LANGUAGE sql STABLE;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION get_artists_for_track(track_id INTEGER)
RETURNS JSONB AS $$
    SELECT json_agg(
        jsonb_build_object('id', a.id, 'name', a.name)
        ORDER BY at.is_primary DESC, a.name
    )
    FROM artist_tracks at
    JOIN artists_with_name a ON a.id = at.artist_id
    WHERE at.track_id = $1;
$$ LANGUAGE sql STABLE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
ALTER TABLE artist_tracks
DROP COLUMN is_primary;

ALTER TABLE artist_releases
DROP COLUMN is_primary;

DROP FUNCTION IF EXISTS get_artists_for_release(INTEGER);
DROP FUNCTION IF EXISTS get_artists_for_track(INTEGER);