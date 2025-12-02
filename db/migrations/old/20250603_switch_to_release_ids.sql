-- +goose Up
-- +goose StatementBegin

-- Step 1: Create new releases table with surrogate ID
DROP TABLE releases;
CREATE TABLE releases (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    musicbrainz_id UUID UNIQUE,
    release_group_id INT REFERENCES release_groups(id) ON DELETE SET NULL,
    title TEXT NOT NULL
);

-- Step 2: Create artist_releases (replaces artist_release_groups)
CREATE TABLE artist_releases (
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    release_id INT REFERENCES releases(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, release_id)
);

-- Step 3: Populate releases with one release per release_group
INSERT INTO releases (musicbrainz_id, release_group_id, title)
SELECT musicbrainz_id, id AS release_group_id, title
FROM release_groups;

-- Step 4: Add release_id to tracks temporarily
ALTER TABLE tracks ADD COLUMN release_id INT;

-- Step 5: Fill release_id in tracks from the newly inserted releases
UPDATE tracks
SET release_id = releases.id
FROM releases
WHERE tracks.release_group_id = releases.release_group_id;

-- Step 6: Set release_id to NOT NULL now that it's populated
ALTER TABLE tracks ALTER COLUMN release_id SET NOT NULL;

-- Step 7: Drop old FK and column for release_group_id
ALTER TABLE tracks DROP CONSTRAINT tracks_release_group_id_fkey;
ALTER TABLE tracks DROP COLUMN release_group_id;

-- Step 8: Drop old artist_release_groups and migrate to artist_releases
INSERT INTO artist_releases (artist_id, release_id)
SELECT arg.artist_id, r.id
FROM artist_release_groups arg
JOIN releases r ON arg.release_group_id = r.release_group_id;

DROP TABLE artist_release_groups;

-- Step 9: Add indexes for new relations
CREATE INDEX idx_tracks_release_id ON tracks(release_id);
CREATE INDEX idx_artist_releases ON artist_releases(artist_id, release_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Rollback: Recreate artist_release_groups
CREATE TABLE artist_release_groups (
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    release_group_id INT REFERENCES release_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, release_group_id)
);

-- Recreate release_group_id in tracks
ALTER TABLE tracks ADD COLUMN release_group_id INT;

-- Restore release_group_id values
UPDATE tracks
SET release_group_id = r.release_group_id
FROM releases r
WHERE tracks.release_id = r.id;

-- Restore artist_release_groups values
INSERT INTO artist_release_groups (artist_id, release_group_id)
SELECT ar.artist_id, r.release_group_id
FROM artist_releases ar
JOIN releases r ON ar.release_id = r.id;

-- Drop new tables and columns
ALTER TABLE tracks DROP COLUMN release_id;
DROP INDEX IF EXISTS idx_tracks_release_id;
DROP INDEX IF EXISTS idx_artist_releases;
DROP TABLE artist_releases;
DROP TABLE releases;

-- +goose StatementEnd
