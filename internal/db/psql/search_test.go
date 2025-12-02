package psql_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDataForSearch(t *testing.T) {
	truncateTestData(t)

	// Insert artists
	err := store.Exec(context.Background(),
		`INSERT INTO artists (musicbrainz_id) 
			VALUES ('00000000-0000-0000-0000-000000000001'),
				   ('00000000-0000-0000-0000-000000000002')`)
	require.NoError(t, err)
	err = store.Exec(context.Background(),
		`INSERT INTO artist_aliases (artist_id, alias, source, is_primary) 
			VALUES (1, 'Artist One With A Really Long Name', 'Testing', true),
				   (2, 'Artist Two', 'Testing', true)`)
	require.NoError(t, err)

	// Insert albums
	err = store.Exec(context.Background(),
		`INSERT INTO releases (musicbrainz_id, various_artists) 
			VALUES ('11111111-1111-1111-1111-111111111111', false),
				   ('22222222-2222-2222-2222-222222222222', true)`)
	require.NoError(t, err)
	err = store.Exec(context.Background(),
		`INSERT INTO release_aliases (release_id, alias, source, is_primary) 
			VALUES (1, 'Album One With A Long Name', 'Testing', true),
				   (2, 'Album Two', 'Testing', true)`)
	require.NoError(t, err)

	// Insert tracks
	err = store.Exec(context.Background(),
		`INSERT INTO tracks (musicbrainz_id, release_id) 
			VALUES ('33333333-3333-3333-3333-333333333333', 1),
				   ('44444444-4444-4444-4444-444444444444', 2)`)
	require.NoError(t, err)
	err = store.Exec(context.Background(),
		`INSERT INTO track_aliases (track_id, alias, source, is_primary) 
			VALUES (1, 'Track One With A Long Name', 'Testing', true),
				   (2, 'Track Two', 'Testing', true)`)
	require.NoError(t, err)

	// Associate artists with albums and tracks
	err = store.Exec(context.Background(),
		`INSERT INTO artist_releases (artist_id, release_id) 
			VALUES (1, 1), (2, 2)`)
	require.NoError(t, err)

	err = store.Exec(context.Background(),
		`INSERT INTO artist_tracks (artist_id, track_id) 
			VALUES (1, 1), (2, 2)`)
	require.NoError(t, err)
}

func TestSearchArtists(t *testing.T) {
	ctx := context.Background()
	setupTestDataForSearch(t)

	// Search for "Artist One With A Long Name"
	results, err := store.SearchArtists(ctx, "Artist One With A Really Long Name")
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "Artist One With A Really Long Name", results[0].Name)

	// Search for substring "Artist"
	results, err = store.SearchArtists(ctx, "Arti")
	require.NoError(t, err)
	require.Len(t, results, 2)

	truncateTestData(t)
}

func TestSearchAlbums(t *testing.T) {
	ctx := context.Background()
	setupTestDataForSearch(t)

	// Search for "Album One With A Long Name"
	results, err := store.SearchAlbums(ctx, "Album One With A Long Name")
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "Album One With A Long Name", results[0].Title)

	// Search for substring "Album"
	results, err = store.SearchAlbums(ctx, "Albu")
	require.NoError(t, err)
	require.Len(t, results, 2)
	assert.NotNil(t, results[0].Artists)

	truncateTestData(t)
}

func TestSearchTracks(t *testing.T) {
	ctx := context.Background()
	setupTestDataForSearch(t)

	// Search for "Track One With A Long Name"
	results, err := store.SearchTracks(ctx, "Track One With A Long Name")
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, "Track One With A Long Name", results[0].Title)

	// Search for substring "Track"
	results, err = store.SearchTracks(ctx, "Trac")
	require.NoError(t, err)
	require.Len(t, results, 2)
	assert.NotNil(t, results[0].Artists)

	truncateTestData(t)
}
