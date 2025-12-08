-- +goose Up
-- Migration: Materialized Views for Dashboard Performance
-- Creates pre-aggregated stats tables for instant dashboard loading

-- ============================================
-- Daily User Stats Materialized View
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_user_stats AS
SELECT 
    l.user_id,
    DATE(l.listened_at) AS stat_date,
    COUNT(*) AS listen_count,
    COUNT(DISTINCT l.track_id) AS unique_tracks,
    COUNT(DISTINCT t.release_id) AS unique_albums,
    COUNT(DISTINCT at.artist_id) AS unique_artists,
    COALESCE(SUM(t.duration), 0) AS seconds_listened
FROM listens l
JOIN tracks t ON l.track_id = t.id
JOIN artist_tracks at ON t.id = at.track_id
GROUP BY l.user_id, DATE(l.listened_at);

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_user_stats_user_date 
ON daily_user_stats(user_id, stat_date);

CREATE INDEX IF NOT EXISTS idx_daily_user_stats_date 
ON daily_user_stats(stat_date);

-- ============================================
-- Monthly User Stats Materialized View  
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_user_stats AS
SELECT 
    l.user_id,
    DATE_TRUNC('month', l.listened_at)::DATE AS stat_month,
    COUNT(*) AS listen_count,
    COUNT(DISTINCT l.track_id) AS unique_tracks,
    COUNT(DISTINCT t.release_id) AS unique_albums,
    COUNT(DISTINCT at.artist_id) AS unique_artists,
    COALESCE(SUM(t.duration), 0) AS seconds_listened
FROM listens l
JOIN tracks t ON l.track_id = t.id
JOIN artist_tracks at ON t.id = at.track_id
GROUP BY l.user_id, DATE_TRUNC('month', l.listened_at);

-- Index for fast lookups  
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_user_stats_user_month
ON monthly_user_stats(user_id, stat_month);

CREATE INDEX IF NOT EXISTS idx_monthly_user_stats_month
ON monthly_user_stats(stat_month);

-- ============================================
-- Yearly User Stats Materialized View
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS yearly_user_stats AS
SELECT 
    l.user_id,
    EXTRACT(YEAR FROM l.listened_at)::INT AS stat_year,
    COUNT(*) AS listen_count,
    COUNT(DISTINCT l.track_id) AS unique_tracks,
    COUNT(DISTINCT t.release_id) AS unique_albums,
    COUNT(DISTINCT at.artist_id) AS unique_artists,
    COALESCE(SUM(t.duration), 0) AS seconds_listened
FROM listens l
JOIN tracks t ON l.track_id = t.id
JOIN artist_tracks at ON t.id = at.track_id
GROUP BY l.user_id, EXTRACT(YEAR FROM l.listened_at);

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_yearly_user_stats_user_year
ON yearly_user_stats(user_id, stat_year);

-- ============================================
-- All-Time User Stats Materialized View
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS alltime_user_stats AS
SELECT 
    l.user_id,
    COUNT(*) AS listen_count,
    COUNT(DISTINCT l.track_id) AS unique_tracks,
    COUNT(DISTINCT t.release_id) AS unique_albums,
    COUNT(DISTINCT at.artist_id) AS unique_artists,
    COALESCE(SUM(t.duration), 0) AS seconds_listened,
    MIN(l.listened_at) AS first_listen,
    MAX(l.listened_at) AS last_listen
FROM listens l
JOIN tracks t ON l.track_id = t.id
JOIN artist_tracks at ON t.id = at.track_id
GROUP BY l.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alltime_user_stats_user
ON alltime_user_stats(user_id);

-- ============================================
-- Function to refresh all stats views
-- ============================================
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION refresh_user_stats() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY yearly_user_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY alltime_user_stats;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- Comment for documentation
COMMENT ON MATERIALIZED VIEW daily_user_stats IS 'Pre-aggregated daily listening stats per user for dashboard performance';
COMMENT ON MATERIALIZED VIEW monthly_user_stats IS 'Pre-aggregated monthly listening stats per user for dashboard performance';
COMMENT ON MATERIALIZED VIEW yearly_user_stats IS 'Pre-aggregated yearly listening stats per user for yearly recap feature';
COMMENT ON MATERIALIZED VIEW alltime_user_stats IS 'Pre-aggregated all-time listening stats per user for profile pages';
