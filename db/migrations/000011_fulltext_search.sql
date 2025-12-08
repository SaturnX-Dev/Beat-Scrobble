-- +goose Up
-- Migration: Full-Text Search Optimization
-- Adds tsvector columns for fast fuzzy search on Artists, Albums, and Tracks

-- ============================================
-- Artists Full-Text Search
-- ============================================
ALTER TABLE artists ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing data
UPDATE artists SET search_vector = to_tsvector('simple', COALESCE(
    (SELECT string_agg(alias, ' ') FROM artist_aliases WHERE artist_id = artists.id), ''
));

-- Create GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING GIN(search_vector);

-- Trigger to auto-update on alias changes
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_artist_search_vector() RETURNS trigger AS $$
BEGIN
    UPDATE artists 
    SET search_vector = to_tsvector('simple', COALESCE(
        (SELECT string_agg(alias, ' ') FROM artist_aliases WHERE artist_id = NEW.artist_id), ''
    ))
    WHERE id = NEW.artist_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_artist_alias_search ON artist_aliases;
CREATE TRIGGER trg_artist_alias_search
AFTER INSERT OR UPDATE OR DELETE ON artist_aliases
FOR EACH ROW EXECUTE FUNCTION update_artist_search_vector();

-- ============================================
-- Releases (Albums) Full-Text Search
-- ============================================
ALTER TABLE releases ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing data
UPDATE releases SET search_vector = to_tsvector('simple', COALESCE(
    (SELECT string_agg(alias, ' ') FROM release_aliases WHERE release_id = releases.id), ''
));

-- Create GIN index
CREATE INDEX IF NOT EXISTS idx_releases_search ON releases USING GIN(search_vector);

-- Trigger
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_release_search_vector() RETURNS trigger AS $$
BEGIN
    UPDATE releases 
    SET search_vector = to_tsvector('simple', COALESCE(
        (SELECT string_agg(alias, ' ') FROM release_aliases WHERE release_id = NEW.release_id), ''
    ))
    WHERE id = NEW.release_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_release_alias_search ON release_aliases;
CREATE TRIGGER trg_release_alias_search
AFTER INSERT OR UPDATE OR DELETE ON release_aliases
FOR EACH ROW EXECUTE FUNCTION update_release_search_vector();

-- ============================================
-- Tracks Full-Text Search
-- ============================================
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing data
UPDATE tracks SET search_vector = to_tsvector('simple', COALESCE(
    (SELECT string_agg(alias, ' ') FROM track_aliases WHERE track_id = tracks.id), ''
));

-- Create GIN index
CREATE INDEX IF NOT EXISTS idx_tracks_search ON tracks USING GIN(search_vector);

-- Trigger
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_track_search_vector() RETURNS trigger AS $$
BEGIN
    UPDATE tracks 
    SET search_vector = to_tsvector('simple', COALESCE(
        (SELECT string_agg(alias, ' ') FROM track_aliases WHERE track_id = NEW.track_id), ''
    ))
    WHERE id = NEW.track_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_track_alias_search ON track_aliases;
CREATE TRIGGER trg_track_alias_search
AFTER INSERT OR UPDATE OR DELETE ON track_aliases
FOR EACH ROW EXECUTE FUNCTION update_track_search_vector();

-- +goose Down
ALTER TABLE tracks DROP COLUMN IF EXISTS search_vector;
ALTER TABLE releases DROP COLUMN IF EXISTS search_vector;
ALTER TABLE artists DROP COLUMN IF EXISTS search_vector;

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN artists.search_vector IS 'Full-text search vector for artist names and aliases';
COMMENT ON COLUMN releases.search_vector IS 'Full-text search vector for album titles and aliases';
COMMENT ON COLUMN tracks.search_vector IS 'Full-text search vector for track titles and aliases';
