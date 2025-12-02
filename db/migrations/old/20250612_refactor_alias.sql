-- +goose Up
-- +goose StatementBegin

-- Step 1: Add the column as nullable initially
ALTER TABLE artist_aliases
ADD COLUMN is_primary boolean;

-- Step 2: Set it to true if alias matches artist name, false otherwise
UPDATE artist_aliases aa
SET is_primary = (aa.alias = a.name)
FROM artists a
WHERE aa.artist_id = a.id;

-- Step 3: Make the column NOT NULL
ALTER TABLE artist_aliases
ALTER COLUMN is_primary SET NOT NULL;

-- Step 1: Add the column as nullable initially
ALTER TABLE release_aliases
ADD COLUMN is_primary boolean;

-- Step 2: Set is_primary to true if alias matches release title, false otherwise
UPDATE release_aliases ra
SET is_primary = (ra.alias = r.title)
FROM releases r
WHERE ra.release_id = r.id;

-- Step 3: Make the column NOT NULL
ALTER TABLE release_aliases
ALTER COLUMN is_primary SET NOT NULL;

-- Step 1: Create the table
CREATE TABLE track_aliases (
    track_id    INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    alias       TEXT    NOT NULL,
    is_primary  BOOLEAN NOT NULL,
    source      TEXT    NOT NULL,
    PRIMARY KEY (track_id, alias)
);

-- Step 2: Insert canonical titles from the tracks table
INSERT INTO track_aliases (track_id, alias, is_primary, source)
SELECT
    id,
    title,
    TRUE,
    'Canonical'
FROM tracks;

ALTER TABLE artists DROP COLUMN IF EXISTS name;
ALTER TABLE tracks DROP COLUMN IF EXISTS title;
ALTER TABLE releases DROP COLUMN IF EXISTS title;

CREATE VIEW IF NOT EXISTS artists_with_name AS
SELECT
    a.*,
    aa.alias AS name
FROM artists a
JOIN artist_aliases aa ON aa.artist_id = a.id
WHERE aa.is_primary = TRUE;

CREATE VIEW IF NOT EXISTS releases_with_title AS
SELECT
    r.*,
    ra.alias AS title
FROM releases r
JOIN release_aliases ra ON ra.release_id = r.id
WHERE ra.is_primary = TRUE;

CREATE VIEW IF NOT EXISTS tracks_with_title AS
SELECT
    t.*,
    ta.alias AS title
FROM tracks t
JOIN track_aliases ta ON ta.track_id = t.id
WHERE ta.is_primary = TRUE;

CREATE INDEX ON release_aliases (release_id) WHERE is_primary = TRUE;
CREATE INDEX ON track_aliases (track_id) WHERE is_primary = TRUE;

-- +goose StatementEnd