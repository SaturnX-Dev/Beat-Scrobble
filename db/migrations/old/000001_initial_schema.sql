-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

CREATE TABLE IF NOT EXISTS artists (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY,
    PRIMARY KEY(id),
    musicbrainz_id UUID UNIQUE,
    name TEXT NOT NULL,
    image UUID,
    image_source TEXT
);

CREATE TABLE IF NOT EXISTS artist_aliases (
    artist_id INT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (artist_id, alias),
    source TEXT NOT NULL
);

-- CREATE TABLE IF NOT EXISTS release_groups (
--     id INT NOT NULL GENERATED ALWAYS AS IDENTITY,
--     PRIMARY KEY(id),
--     musicbrainz_id UUID UNIQUE,
--     title TEXT NOT NULL,
--     various_artists BOOLEAN NOT NULL DEFAULT FALSE,
--     image TEXT
-- );

CREATE TABLE IF NOT EXISTS releases (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY,
    PRIMARY KEY(id),
    musicbrainz_id UUID UNIQUE,
    -- release_group_id INT REFERENCES release_groups(id) ON DELETE SET NULL,
    image UUID,
    image_source TEXT,
    various_artists BOOLEAN NOT NULL DEFAULT FALSE,
    title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_aliases (
    release_id INT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    PRIMARY KEY (release_id, alias),
    source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artist_releases (
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    release_id INT REFERENCES releases(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, release_id)
);

CREATE TABLE IF NOT EXISTS tracks (
    id INT NOT NULL GENERATED ALWAYS AS IDENTITY,
    PRIMARY KEY(id),
    musicbrainz_id UUID UNIQUE,
    title TEXT NOT NULL,
    duration INT NOT NULL DEFAULT 0,
    release_id INT NOT NULL REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS artist_tracks (
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    track_id INT REFERENCES tracks(id) ON DELETE CASCADE,
    PRIMARY KEY (artist_id, track_id)
);

CREATE TABLE IF NOT EXISTS listens (
    track_id INT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(track_id, listened_at)
);

-- Indexes
CREATE INDEX idx_artist_aliases_artist_id ON artist_aliases(artist_id);
CREATE INDEX idx_artist_releases ON artist_releases(artist_id, release_id);
CREATE INDEX idx_tracks_release_id ON tracks(release_id);
CREATE INDEX listens_listened_at_idx ON listens(listened_at);
CREATE INDEX listens_track_id_listened_at_idx ON listens(track_id, listened_at);

-- Trigram search support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_tracks_title_trgm ON tracks USING gin (title gin_trgm_ops);

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd

DROP INDEX idx_artist_aliases_artist_id;
DROP INDEX idx_artist_releases;
DROP INDEX idx_tracks_release_id;
DROP INDEX listens_listened_at_idx;
DROP INDEX listens_track_id_listened_at_idx;
DROP INDEX idx_tracks_title_trgm;

DROP TABLE listens;
DROP TABLE artist_aliases;
DROP TABLE artist_releases;
DROP TABLE artist_tracks;
DROP TABLE tracks;
DROP TABLE releases;
DROP TABLE release_groups;
DROP TABLE artists;
