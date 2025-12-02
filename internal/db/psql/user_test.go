package psql_test

import (
	"context"
	"testing"

	"github.com/gabehf/koito/internal/db"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func setupTestDataForUsers(t *testing.T) {
	truncateTestDataForUsers(t)
	// Insert additional test users
	err := store.Exec(context.Background(),
		`INSERT INTO users (username, password, role) 
            VALUES ('test_user', $1, 'user'),
                   ('admin_user', $1, 'admin')`, []byte("hashed_password"))
	require.NoError(t, err)
}

func truncateTestDataForUsers(t *testing.T) {
	err := store.Exec(context.Background(),
		`DELETE FROM users WHERE id NOT IN (1)`,
	)
	require.NoError(t, err)
	err = store.Exec(context.Background(),
		`ALTER SEQUENCE users_id_seq RESTART WITH 2`,
	)
	require.NoError(t, err)
	err = store.Exec(context.Background(),
		`TRUNCATE api_keys RESTART IDENTITY CASCADE`,
	)
	require.NoError(t, err)
}

func TestGetUserByUsername(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Test fetching an existing user
	user, err := store.GetUserByUsername(ctx, "test_user")
	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, "test_user", user.Username)
	assert.Equal(t, "user", string(user.Role))

	// Test fetching a non-existent user
	user, err = store.GetUserByUsername(ctx, "nonexistent_user")
	require.NoError(t, err)
	assert.Nil(t, user)
}

func TestGetUserByApiKey(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Insert an API key for the test user
	err := store.Exec(ctx, `INSERT INTO api_keys (key, label, user_id) VALUES ('test_key', 'Test Key', 2)`)
	require.NoError(t, err)

	// Test fetching a user by API key
	user, err := store.GetUserByApiKey(ctx, "test_key")
	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, int32(2), user.ID)
	assert.Equal(t, "test_user", user.Username)

	// Test fetching a user with a non-existent API key
	user, err = store.GetUserByApiKey(ctx, "nonexistent_key")
	require.NoError(t, err)
	assert.Nil(t, user)
}

func TestSaveUser(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Save a new user
	opts := db.SaveUserOpts{
		Username: "new_user",
		Password: "secure_password",
		Role:     "user",
	}
	user, err := store.SaveUser(ctx, opts)
	require.NoError(t, err)
	require.NotNil(t, user)
	assert.Equal(t, "new_user", user.Username)
	assert.Equal(t, "user", string(user.Role))

	// Verify the password was hashed
	var hashedPassword []byte
	err = store.QueryRow(ctx, `SELECT password FROM users WHERE username = $1`, "new_user").Scan(&hashedPassword)
	require.NoError(t, err)
	assert.NoError(t, bcrypt.CompareHashAndPassword(hashedPassword, []byte(opts.Password)))

	// Test validation failures
	_, err = store.SaveUser(ctx, db.SaveUserOpts{
		Username: "Q!@JH(F_H@#!*HF#*)&@",
		Password: "testpassword12345",
	})
	assert.Error(t, err)
	_, err = store.SaveUser(ctx, db.SaveUserOpts{
		Username: "test_user",
		Password: "<3",
	})
	assert.Error(t, err)
}

func TestSaveApiKey(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Save an API key for the test user
	label := "New API Key"
	opts := db.SaveApiKeyOpts{
		Key:    "new_api_key",
		Label:  label,
		UserID: 2,
	}
	_, err := store.SaveApiKey(ctx, opts)
	require.NoError(t, err)

	// Verify the API key was saved
	count, err := store.Count(ctx, `SELECT COUNT(*) FROM api_keys WHERE key = $1 AND user_id = $2`, opts.Key, opts.UserID)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestGetApiKeysByUserID(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Insert API keys for the test user
	err := store.Exec(ctx, `INSERT INTO api_keys (key, label, user_id) VALUES 
        ('key1', 'Key 1', 2), 
        ('key2', 'Key 2', 2)`)
	require.NoError(t, err)

	// Fetch API keys for the test user
	keys, err := store.GetApiKeysByUserID(ctx, 2)
	require.NoError(t, err)
	require.Len(t, keys, 2)
	assert.Equal(t, "key1", keys[0].Key)
	assert.Equal(t, "key2", keys[1].Key)
}

func TestUpdateApiKeyLabel(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Insert an API key for the test user
	err := store.Exec(ctx, `INSERT INTO api_keys (key, label, user_id) VALUES ('key_to_update', 'Old Label', 2)`)
	require.NoError(t, err)

	// Update the API key label
	opts := db.UpdateApiKeyLabelOpts{
		ID:     1,
		Label:  "Updated Label",
		UserID: 2,
	}
	err = store.UpdateApiKeyLabel(ctx, opts)
	require.NoError(t, err)

	// Verify the label was updated
	var label string
	err = store.QueryRow(ctx, `SELECT label FROM api_keys WHERE id = $1`, opts.ID).Scan(&label)
	require.NoError(t, err)
	assert.Equal(t, "Updated Label", label)
}

func TestDeleteApiKey(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Insert an API key for the test user
	err := store.Exec(ctx, `INSERT INTO api_keys (key, label, user_id) VALUES ('key_to_delete', 'Label', 2)`)
	require.NoError(t, err)

	// Delete the API key
	err = store.DeleteApiKey(ctx, 1) // Assuming the ID is auto-generated and starts from 1
	require.NoError(t, err)

	// Verify the API key was deleted
	count, err := store.Count(ctx, `SELECT COUNT(*) FROM api_keys WHERE id = $1`, 1)
	require.NoError(t, err)
	assert.Equal(t, 0, count)
}

func TestCountUsers(t *testing.T) {
	ctx := context.Background()
	setupTestDataForUsers(t)

	// Count the number of users
	count, err := store.Count(ctx, `SELECT COUNT(*) FROM users`)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, count, 3) // Special user + test users
}
