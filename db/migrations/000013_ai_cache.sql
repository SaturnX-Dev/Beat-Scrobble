-- Migration: AI Cache System
-- Smart caching for AI responses with change detection

-- ============================================
-- AI Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_cache (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cache_type TEXT NOT NULL,  -- 'profile', 'nowplaying', 'playlist'
    cache_key TEXT NOT NULL,   -- e.g., 'day', 'week', track_id, playlist_type
    prompt_hash TEXT NOT NULL, -- MD5 of prompt for change detection
    data_hash TEXT NOT NULL,   -- Hash of input data for change detection
    response TEXT NOT NULL,    -- AI response
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    listen_count INT DEFAULT 0, -- Listen count when cache was created
    UNIQUE(user_id, cache_type, cache_key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_type ON ai_cache(user_id, cache_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_cache(user_id, cache_type, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- ============================================
-- User Presence Table (for Now Playing check)
-- ============================================
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_ping ON user_presence(last_ping);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE ai_cache IS 'Server-side cache for AI responses with smart refresh';
COMMENT ON COLUMN ai_cache.cache_type IS 'Type: profile, nowplaying, playlist';
COMMENT ON COLUMN ai_cache.prompt_hash IS 'MD5 hash of prompt for change detection';
COMMENT ON COLUMN ai_cache.data_hash IS 'Hash of input data (stats, track info) for change detection';
COMMENT ON TABLE user_presence IS 'Tracks active user sessions for Now Playing critique optimization';
