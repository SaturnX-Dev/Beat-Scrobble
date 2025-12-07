-- Migration: pgvector for Semantic Search
-- Enables AI-powered "vibe-based" recommendations

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Track Embeddings Table
-- ============================================
CREATE TABLE IF NOT EXISTS track_embeddings (
    track_id INT PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
    embedding vector(1536),  -- OpenAI ada-002 dimension
    model TEXT DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_track_embeddings_vector 
ON track_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- Artist Embeddings Table
-- ============================================
CREATE TABLE IF NOT EXISTS artist_embeddings (
    artist_id INT PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_embeddings_vector 
ON artist_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- Album Embeddings Table
-- ============================================
CREATE TABLE IF NOT EXISTS release_embeddings (
    release_id INT PRIMARY KEY REFERENCES releases(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_embeddings_vector 
ON release_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- User Taste Profile Embeddings
-- ============================================
CREATE TABLE IF NOT EXISTS user_taste_embeddings (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding vector(1536),
    model TEXT DEFAULT 'text-embedding-ada-002',
    last_computed TIMESTAMPTZ DEFAULT NOW(),
    listen_count_at_compute INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_taste_embeddings_vector 
ON user_taste_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);

-- ============================================
-- Semantic Search Functions
-- ============================================

-- Find similar tracks by embedding
CREATE OR REPLACE FUNCTION find_similar_tracks(
    query_embedding vector(1536),
    limit_count INT DEFAULT 20,
    exclude_track_ids INT[] DEFAULT '{}'::INT[]
)
RETURNS TABLE(track_id INT, similarity FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.track_id,
        1 - (te.embedding <=> query_embedding) AS similarity
    FROM track_embeddings te
    WHERE NOT te.track_id = ANY(exclude_track_ids)
    ORDER BY te.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Find similar artists by embedding
CREATE OR REPLACE FUNCTION find_similar_artists(
    query_embedding vector(1536),
    limit_count INT DEFAULT 10
)
RETURNS TABLE(artist_id INT, similarity FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.artist_id,
        1 - (ae.embedding <=> query_embedding) AS similarity
    FROM artist_embeddings ae
    ORDER BY ae.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Find users with similar taste
CREATE OR REPLACE FUNCTION find_similar_users(
    user_id_param INT,
    limit_count INT DEFAULT 10
)
RETURNS TABLE(similar_user_id INT, similarity FLOAT) AS $$
DECLARE
    user_embedding vector(1536);
BEGIN
    SELECT embedding INTO user_embedding
    FROM user_taste_embeddings
    WHERE user_id = user_id_param;
    
    IF user_embedding IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        ute.user_id AS similar_user_id,
        1 - (ute.embedding <=> user_embedding) AS similarity
    FROM user_taste_embeddings ute
    WHERE ute.user_id != user_id_param
    ORDER BY ute.embedding <=> user_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE track_embeddings IS 'Vector embeddings for tracks enabling semantic search';
COMMENT ON TABLE artist_embeddings IS 'Vector embeddings for artists enabling similarity discovery';
COMMENT ON TABLE release_embeddings IS 'Vector embeddings for albums enabling semantic search';
COMMENT ON TABLE user_taste_embeddings IS 'Aggregated taste profile embeddings per user';
COMMENT ON FUNCTION find_similar_tracks IS 'Find tracks similar to a given embedding vector';
COMMENT ON FUNCTION find_similar_artists IS 'Find artists similar to a given embedding vector';
COMMENT ON FUNCTION find_similar_users IS 'Find users with similar music taste based on embeddings';
