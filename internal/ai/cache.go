package ai

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CacheType defines the type of AI cache
type CacheType string

const (
	CacheTypeProfile    CacheType = "profile"
	CacheTypeNowPlaying CacheType = "nowplaying"
	CacheTypePlaylist   CacheType = "playlist"
)

// RefreshIntervals for different cache types and periods
var RefreshIntervals = map[string]time.Duration{
	"profile_day":      4 * time.Hour,
	"profile_week":     3 * 24 * time.Hour,
	"profile_month":    7 * 24 * time.Hour,
	"profile_year":     7 * 24 * time.Hour,
	"profile_all_time": 7 * 24 * time.Hour,
	"playlist":         7 * 24 * time.Hour,
	"nowplaying":       365 * 24 * time.Hour, // Effectively forever
}

// CacheEntry represents a cached AI response
type CacheEntry struct {
	ID          int32
	UserID      int32
	CacheType   string
	CacheKey    string
	PromptHash  string
	DataHash    string
	Response    string
	CreatedAt   time.Time
	ExpiresAt   time.Time
	ListenCount int32
}

// CacheManager handles AI cache operations
type CacheManager struct {
	pool *pgxpool.Pool
}

// NewCacheManager creates a new cache manager
func NewCacheManager(pool *pgxpool.Pool) *CacheManager {
	return &CacheManager{pool: pool}
}

// HashString creates an MD5 hash of a string
func HashString(s string) string {
	hash := md5.Sum([]byte(s))
	return hex.EncodeToString(hash[:])
}

// Get retrieves a cache entry if valid
func (c *CacheManager) Get(ctx context.Context, userID int32, cacheType CacheType, cacheKey string) (*CacheEntry, error) {
	var entry CacheEntry
	err := c.pool.QueryRow(ctx, `
		SELECT id, user_id, cache_type, cache_key, prompt_hash, data_hash, response, created_at, expires_at, listen_count
		FROM ai_cache
		WHERE user_id = $1 AND cache_type = $2 AND cache_key = $3
	`, userID, string(cacheType), cacheKey).Scan(
		&entry.ID, &entry.UserID, &entry.CacheType, &entry.CacheKey,
		&entry.PromptHash, &entry.DataHash, &entry.Response,
		&entry.CreatedAt, &entry.ExpiresAt, &entry.ListenCount,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

// IsValid checks if cache entry is still valid based on prompt, data, and expiration
func (c *CacheManager) IsValid(entry *CacheEntry, currentPromptHash, currentDataHash string) bool {
	if entry == nil {
		return false
	}
	// Check if expired
	if time.Now().After(entry.ExpiresAt) {
		return false
	}
	// Check if prompt changed
	if entry.PromptHash != currentPromptHash {
		return false
	}
	// Check if data changed (for profile caches)
	if entry.DataHash != currentDataHash {
		return false
	}
	return true
}

// Set stores a cache entry
func (c *CacheManager) Set(ctx context.Context, userID int32, cacheType CacheType, cacheKey, promptHash, dataHash, response string, ttl time.Duration, listenCount int32) error {
	expiresAt := time.Now().Add(ttl)
	_, err := c.pool.Exec(ctx, `
		INSERT INTO ai_cache (user_id, cache_type, cache_key, prompt_hash, data_hash, response, expires_at, listen_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, cache_type, cache_key)
		DO UPDATE SET
			prompt_hash = EXCLUDED.prompt_hash,
			data_hash = EXCLUDED.data_hash,
			response = EXCLUDED.response,
			created_at = NOW(),
			expires_at = EXCLUDED.expires_at,
			listen_count = EXCLUDED.listen_count
	`, userID, string(cacheType), cacheKey, promptHash, dataHash, response, expiresAt, listenCount)
	return err
}

// InvalidateByType clears all caches of a specific type for a user
func (c *CacheManager) InvalidateByType(ctx context.Context, userID int32, cacheType CacheType) error {
	_, err := c.pool.Exec(ctx, `
		DELETE FROM ai_cache WHERE user_id = $1 AND cache_type = $2
	`, userID, string(cacheType))
	return err
}

// InvalidateAll clears all AI caches for a user
func (c *CacheManager) InvalidateAll(ctx context.Context, userID int32) error {
	_, err := c.pool.Exec(ctx, `DELETE FROM ai_cache WHERE user_id = $1`, userID)
	return err
}

// GetTTL returns the appropriate TTL for a cache type and key
func GetTTL(cacheType CacheType, cacheKey string) time.Duration {
	key := string(cacheType) + "_" + cacheKey
	if ttl, ok := RefreshIntervals[key]; ok {
		return ttl
	}
	if ttl, ok := RefreshIntervals[string(cacheType)]; ok {
		return ttl
	}
	return 24 * time.Hour // Default 1 day
}
