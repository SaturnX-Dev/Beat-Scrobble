-- +goose Up
-- Add metadata fields to artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS followers INT;

-- Add metadata fields to releases (albums)
ALTER TABLE releases ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS release_date_precision TEXT;

-- Add metadata fields to tracks (audio features)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS danceability FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS energy FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS key INT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS loudness FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS mode INT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS speechiness FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS acousticness FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS instrumentalness FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS liveness FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS valence FLOAT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS tempo FLOAT;

-- Drop views to update them
DROP VIEW IF EXISTS artists_with_name;
DROP VIEW IF EXISTS releases_with_title;
DROP VIEW IF EXISTS tracks_with_title;

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
        a.followers,
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
        r.label,
        r.release_date_precision,
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
        t.danceability,
        t.energy,
        t.key,
        t.loudness,
        t.mode,
        t.speechiness,
        t.acousticness,
        t.instrumentalness,
        t.liveness,
        t.valence,
        t.tempo,
        ta.alias AS title
    FROM (tracks t
        JOIN track_aliases ta ON ((ta.track_id = t.id)))
    WHERE (ta.is_primary = true);

-- +goose Down
DROP VIEW IF EXISTS artists_with_name;
DROP VIEW IF EXISTS releases_with_title;
DROP VIEW IF EXISTS tracks_with_title;

ALTER TABLE artists DROP COLUMN IF EXISTS followers;

ALTER TABLE releases DROP COLUMN IF EXISTS label;
ALTER TABLE releases DROP COLUMN IF EXISTS release_date_precision;

ALTER TABLE tracks DROP COLUMN IF EXISTS danceability;
ALTER TABLE tracks DROP COLUMN IF EXISTS energy;
ALTER TABLE tracks DROP COLUMN IF EXISTS key;
ALTER TABLE tracks DROP COLUMN IF EXISTS loudness;
ALTER TABLE tracks DROP COLUMN IF EXISTS mode;
ALTER TABLE tracks DROP COLUMN IF EXISTS speechiness;
ALTER TABLE tracks DROP COLUMN IF EXISTS acousticness;
ALTER TABLE tracks DROP COLUMN IF EXISTS instrumentalness;
ALTER TABLE tracks DROP COLUMN IF EXISTS liveness;
ALTER TABLE tracks DROP COLUMN IF EXISTS valence;
ALTER TABLE tracks DROP COLUMN IF EXISTS tempo;

-- Recreate previous views (from 000007)
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
