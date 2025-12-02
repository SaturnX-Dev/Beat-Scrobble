-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Types
CREATE TYPE role AS ENUM (
    'admin',
    'user'
);

-- Functions

-- +goose StatementBegin
CREATE FUNCTION delete_orphan_releases() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM artist_releases
        WHERE release_id = OLD.release_id
    ) THEN
        DELETE FROM releases WHERE id = OLD.release_id;
    END IF;
    RETURN NULL;
END;
$$;
-- +goose StatementEnd

-- Tables
CREATE TABLE artists (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME artists_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    ),
    musicbrainz_id UUID UNIQUE,
    image UUID,
    image_source text,
    CONSTRAINT artists_pkey PRIMARY KEY (id)
);

CREATE TABLE artist_aliases (
    artist_id integer NOT NULL,
    alias text NOT NULL,
    source text NOT NULL,
    is_primary boolean NOT NULL,
    CONSTRAINT artist_aliases_pkey PRIMARY KEY (artist_id, alias)
);

CREATE TABLE releases (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME releases_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    ),
    musicbrainz_id UUID UNIQUE,
    image UUID,
    various_artists boolean DEFAULT false NOT NULL,
    image_source text,
    CONSTRAINT releases_pkey PRIMARY KEY (id)
);

CREATE TABLE artist_releases (
    artist_id integer NOT NULL,
    release_id integer NOT NULL,
    CONSTRAINT artist_releases_pkey PRIMARY KEY (artist_id, release_id)
);

CREATE TABLE tracks (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME tracks_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    ),
    musicbrainz_id UUID UNIQUE,
    duration integer DEFAULT 0 NOT NULL,
    release_id integer NOT NULL,
    CONSTRAINT tracks_pkey PRIMARY KEY (id)
);

CREATE TABLE artist_tracks (
    artist_id integer NOT NULL,
    track_id integer NOT NULL,
    CONSTRAINT artist_tracks_pkey PRIMARY KEY (artist_id, track_id)
);

CREATE TABLE users (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME users_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    ),
    username text UNIQUE NOT NULL,
    role role DEFAULT 'user'::role NOT NULL,
    password bytea NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE api_keys (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
        SEQUENCE NAME api_keys_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    ),
    key text UNIQUE NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    label text NOT NULL,
    CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

CREATE TABLE release_aliases (
    release_id integer NOT NULL,
    alias text NOT NULL,
    source text NOT NULL,
    is_primary boolean NOT NULL,
    CONSTRAINT release_aliases_pkey PRIMARY KEY (release_id, alias)
);

CREATE TABLE sessions (
    id UUID NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    persistent boolean DEFAULT false NOT NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE track_aliases (
    track_id integer NOT NULL,
    alias text NOT NULL,
    is_primary boolean NOT NULL,
    source text NOT NULL,
    CONSTRAINT track_aliases_pkey PRIMARY KEY (track_id, alias)
);

CREATE TABLE listens (
    track_id integer NOT NULL,
    listened_at timestamptz NOT NULL,
    client text,
    user_id integer NOT NULL,
    CONSTRAINT listens_pkey PRIMARY KEY (track_id, listened_at)
);


-- Views
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

-- Foreign Key Constraints
ALTER TABLE ONLY api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY artist_aliases
    ADD CONSTRAINT artist_aliases_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE ONLY artist_releases
    ADD CONSTRAINT artist_releases_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE ONLY artist_releases
    ADD CONSTRAINT artist_releases_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;

ALTER TABLE ONLY artist_tracks
    ADD CONSTRAINT artist_tracks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

ALTER TABLE ONLY artist_tracks
    ADD CONSTRAINT artist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY listens
    ADD CONSTRAINT listens_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY listens
    ADD CONSTRAINT listens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY release_aliases
    ADD CONSTRAINT release_aliases_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;

ALTER TABLE ONLY sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ONLY track_aliases
    ADD CONSTRAINT track_aliases_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;

ALTER TABLE ONLY tracks
    ADD CONSTRAINT track_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_artist_aliases_alias_trgm ON artist_aliases USING gin (alias gin_trgm_ops);
CREATE INDEX idx_artist_aliases_artist_id ON artist_aliases USING btree (artist_id);
CREATE INDEX idx_artist_releases ON artist_releases USING btree (artist_id, release_id);
CREATE INDEX idx_release_aliases_alias_trgm ON release_aliases USING gin (alias gin_trgm_ops);
CREATE INDEX idx_tracks_release_id ON tracks USING btree (release_id);
CREATE INDEX listens_listened_at_idx ON listens USING btree (listened_at);
CREATE INDEX listens_track_id_listened_at_idx ON listens USING btree (track_id, listened_at);
CREATE INDEX release_aliases_release_id_idx ON release_aliases USING btree (release_id) WHERE (is_primary = true);
CREATE INDEX track_aliases_track_id_idx ON track_aliases USING btree (track_id) WHERE (is_primary = true);
CREATE INDEX idx_track_aliases_alias_trgm ON track_aliases USING gin (alias gin_trgm_ops);

-- Triggers
CREATE TRIGGER trg_delete_orphan_releases AFTER DELETE ON artist_releases FOR EACH ROW EXECUTE FUNCTION delete_orphan_releases();

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_delete_orphan_releases ON artist_releases;

-- Drop Views
DROP VIEW IF EXISTS artists_with_name;
DROP VIEW IF EXISTS releases_with_title;
DROP VIEW IF EXISTS tracks_with_title;

-- Drop Tables (in reverse dependency order)
DROP TABLE IF EXISTS listens CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS artist_tracks CASCADE;
DROP TABLE IF EXISTS artist_releases CASCADE;
DROP TABLE IF EXISTS release_aliases CASCADE;
DROP TABLE IF EXISTS track_aliases CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS artist_aliases CASCADE;

-- Drop Functions
DROP FUNCTION IF EXISTS delete_orphan_releases();

-- Drop Types
DROP TYPE IF EXISTS role;

-- Drop Extensions
DROP EXTENSION IF EXISTS pg_trgm;
