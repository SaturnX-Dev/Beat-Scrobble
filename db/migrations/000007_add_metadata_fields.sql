-- +goose Up
-- Drop views first
DROP VIEW IF EXISTS artists_with_name;
DROP VIEW IF EXISTS releases_with_title;
DROP VIEW IF EXISTS tracks_with_title;

-- Add metadata fields to artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS genres TEXT[];
ALTER TABLE artists ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS popularity INT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS spotify_id TEXT;

-- Add metadata fields to releases (albums)
ALTER TABLE releases ADD COLUMN IF NOT EXISTS genres TEXT[];
ALTER TABLE releases ADD COLUMN IF NOT EXISTS release_date TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS popularity INT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS spotify_id TEXT;

-- Add metadata fields to tracks
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS popularity INT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS spotify_id TEXT;

-- Recreate views with new columns
CREATE VIEW artists_with_name AS
    SELECT a.id,
        a.musicbrainz_id,
        a.image,
        a.image_source,
        a.genres,
        a.bio,
        a.popularity,
        a.spotify_id,
        aa.alias AS name
    FROM (artists a
        JOIN artist_aliases aa ON ((aa.artist_id = a.id)))
    WHERE (aa.is_primary = true);

CREATE VIEW releases_with_title AS
    SELECT r.id,
        r.musicbrainz_id,
        r.image,
        r.various_artists,
        r.image_source,
        r.genres,
        r.release_date,
        r.popularity,
        r.spotify_id,
        ra.alias AS title
    FROM (releases r
        JOIN release_aliases ra ON ((ra.release_id = r.id)))
    WHERE (ra.is_primary = true);

CREATE VIEW tracks_with_title AS
    SELECT t.id,
        t.musicbrainz_id,
        t.duration,
        t.release_id,
        t.popularity,
        t.spotify_id,
        ta.alias AS title
    FROM (tracks t
        JOIN track_aliases ta ON ((ta.track_id = t.id)))
    WHERE (ta.is_primary = true);

-- +goose Down
DROP VIEW IF EXISTS artists_with_name;
DROP VIEW IF EXISTS releases_with_title;
DROP VIEW IF EXISTS tracks_with_title;

ALTER TABLE artists DROP COLUMN IF EXISTS genres;
ALTER TABLE artists DROP COLUMN IF EXISTS bio;
ALTER TABLE artists DROP COLUMN IF EXISTS popularity;
ALTER TABLE artists DROP COLUMN IF EXISTS spotify_id;

ALTER TABLE releases DROP COLUMN IF EXISTS genres;
ALTER TABLE releases DROP COLUMN IF EXISTS release_date;
ALTER TABLE releases DROP COLUMN IF EXISTS popularity;
ALTER TABLE releases DROP COLUMN IF EXISTS spotify_id;

ALTER TABLE tracks DROP COLUMN IF EXISTS popularity;
ALTER TABLE tracks DROP COLUMN IF EXISTS spotify_id;

-- Recreate original views
CREATE VIEW artists_with_name AS
    SELECT a.id,
        a.musicbrainz_id,
        a.image,
        a.image_source,
        aa.alias AS name
    FROM (artists a
        JOIN artist_aliases aa ON ((aa.artist_id = a.id)))
    WHERE (aa.is_primary = true);

CREATE VIEW releases_with_title AS
    SELECT r.id,
        r.musicbrainz_id,
        r.image,
        r.various_artists,
        r.image_source,
        ra.alias AS title
    FROM (releases r
        JOIN release_aliases ra ON ((ra.release_id = r.id)))
    WHERE (ra.is_primary = true);

CREATE VIEW tracks_with_title AS
    SELECT t.id,
        t.musicbrainz_id,
        t.duration,
        t.release_id,
        ta.alias AS title
    FROM (tracks t
        JOIN track_aliases ta ON ((ta.track_id = t.id)))
    WHERE (ta.is_primary = true);
