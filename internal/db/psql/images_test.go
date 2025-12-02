package psql_test

import (
	"context"
	"testing"

	"github.com/gabehf/koito/internal/catalog"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDataForImages(t *testing.T) {
	truncateTestData(t)

	// Insert artists
	err := store.Exec(context.Background(),
		`INSERT INTO artists (musicbrainz_id, image, image_source) 
			VALUES ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'User Upload'),
				   ('00000000-0000-0000-0000-000000000002', NULL, NULL)`)
	require.NoError(t, err)

	// Insert artist aliases
	err = store.Exec(context.Background(),
		`INSERT INTO artist_aliases (artist_id, alias, source, is_primary) 
			VALUES (1, 'Artist One', 'Testing', true),
				   (2, 'Artist Two', 'Testing', true)`)
	require.NoError(t, err)

	// Insert albums
	err = store.Exec(context.Background(),
		`INSERT INTO releases (musicbrainz_id, image, image_source) 
			VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Automatic'),
				   ('44444444-4444-4444-4444-444444444444', NULL, NULL)`)
	require.NoError(t, err)

	// Insert release aliases
	err = store.Exec(context.Background(),
		`INSERT INTO release_aliases (release_id, alias, source, is_primary) 
			VALUES (1, 'Album One', 'Testing', true),
				   (2, 'Album Two', 'Testing', true)`)
	require.NoError(t, err)

	// Associate albums with artists
	err = store.Exec(context.Background(),
		`INSERT INTO artist_releases (artist_id, release_id) 
			VALUES (1, 1), (2, 2)`)
	require.NoError(t, err)
}

func TestImageHasAssociation(t *testing.T) {
	ctx := context.Background()
	setupTestDataForImages(t)

	// Test image with association
	imageID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	hasAssociation, err := store.ImageHasAssociation(ctx, imageID)
	require.NoError(t, err)
	assert.True(t, hasAssociation, "expected image to have an association")

	// Test image without association
	imageID = uuid.MustParse("55555555-5555-5555-5555-555555555555")
	hasAssociation, err = store.ImageHasAssociation(ctx, imageID)
	require.NoError(t, err)
	assert.False(t, hasAssociation, "expected image to have no association")

	truncateTestData(t)
}

func TestGetImageSource(t *testing.T) {
	ctx := context.Background()
	setupTestDataForImages(t)

	// Test image source for an album
	imageID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	source, err := store.GetImageSource(ctx, imageID)
	require.NoError(t, err)
	assert.Equal(t, "Automatic", source, "expected image source to match")

	// Test image source for an artist
	imageID = uuid.MustParse("11111111-1111-1111-1111-111111111111")
	source, err = store.GetImageSource(ctx, imageID)
	require.NoError(t, err)
	assert.Equal(t, catalog.ImageSourceUserUpload, source, "expected image source to match")

	// Test image source for a non-existent image
	imageID = uuid.MustParse("55555555-5555-5555-5555-555555555555")
	source, err = store.GetImageSource(ctx, imageID)
	require.NoError(t, err)
	assert.Equal(t, "", source, "expected no image source for non-existent image")

	truncateTestData(t)
}

func TestAlbumsWithoutImages(t *testing.T) {
	ctx := context.Background()
	setupTestDataForImages(t)

	// Test albums without images
	albums, err := store.AlbumsWithoutImages(ctx, 0)
	require.NoError(t, err)
	require.Len(t, albums, 1, "expected one album without an image")
	assert.Equal(t, "Album Two", albums[0].Title, "expected album title to match")

	truncateTestData(t)
}
