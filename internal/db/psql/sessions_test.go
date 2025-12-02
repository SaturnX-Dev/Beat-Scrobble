package psql_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func truncateTestDataForSessions(t *testing.T) {
	err := store.Exec(context.Background(),
		`TRUNCATE
			sessions
			RESTART IDENTITY CASCADE`,
	)
	require.NoError(t, err)
}
func TestSaveSession(t *testing.T) {
	ctx := context.Background()

	// Save a session for the user
	expiresAt := time.Now().Add(24 * time.Hour).UTC()
	session, err := store.SaveSession(ctx, 1, expiresAt, true)
	require.NoError(t, err)
	require.NotNil(t, session)
	assert.Equal(t, int32(1), session.UserID)
	assert.Equal(t, true, session.Persistent)
	assert.WithinDuration(t, expiresAt, session.ExpiresAt, time.Second)

	truncateTestDataForSessions(t)
}

func TestRefreshSession(t *testing.T) {
	ctx := context.Background()

	// Save a session first
	expiresAt := time.Now().Add(-1 * time.Minute)
	session, err := store.SaveSession(ctx, 1, expiresAt, true)
	require.NoError(t, err)

	// Refresh the session expiry
	newExpiresAt := time.Now().Add(48 * time.Hour)
	err = store.RefreshSession(ctx, session.ID, newExpiresAt)
	require.NoError(t, err)

	// Can only retrieve a session with an expiresAt > time.Now()
	_, err = store.GetUserBySession(ctx, session.ID)
	require.NoError(t, err)

	truncateTestDataForSessions(t)
}

func TestDeleteSession(t *testing.T) {
	ctx := context.Background()

	// Save a session first
	expiresAt := time.Now().Add(24 * time.Hour)
	session, err := store.SaveSession(ctx, 1, expiresAt, true)
	require.NoError(t, err)

	// Delete the session
	err = store.DeleteSession(ctx, session.ID)
	require.NoError(t, err)

	// Verify the session was deleted
	var count int
	count, err = store.Count(ctx, `SELECT COUNT(*) FROM sessions WHERE id = $1`, session.ID)
	require.NoError(t, err)
	assert.Equal(t, 0, count)

	truncateTestDataForSessions(t)
}

func TestGetUserBySession(t *testing.T) {
	ctx := context.Background()

	// Save a session first
	expiresAt := time.Now().Add(24 * time.Hour)
	session, err := store.SaveSession(ctx, 1, expiresAt, true)
	require.NoError(t, err)

	// Get the user by session
	user, err := store.GetUserBySession(ctx, session.ID)
	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, int32(1), user.ID)
	assert.Equal(t, "test", user.Username)
	assert.Equal(t, []uint8([]byte{0xab, 0xc1, 0x23}), user.Password)
	assert.Equal(t, "user", string(user.Role))

	// Test for a non-existent session
	nonExistentSessionID := uuid.New()
	user, err = store.GetUserBySession(ctx, nonExistentSessionID)
	require.NoError(t, err)
	assert.Nil(t, user)

	truncateTestDataForSessions(t)
}
