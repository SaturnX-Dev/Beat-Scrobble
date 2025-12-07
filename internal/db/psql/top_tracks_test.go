package psql_test

import (
	"context"
	"testing"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetTopTracksPaginated(t *testing.T) {
	testDataForTopItems(t)
	ctx := context.Background()

	// Test valid
	resp, err := store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodAllTime, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 4)
	assert.Equal(t, int64(4), resp.TotalCount)
	// ensure tracks are in the right order (count, desc)
	// track 4 (1 listen)
	// track 3 (2 listens)
	// track 2 (3 listens)
	// track 1 (4 listens)
	assert.Equal(t, "Track One", resp.Items[0].Title)
	assert.Equal(t, "Track Two", resp.Items[1].Title)
	assert.Equal(t, "Track Three", resp.Items[2].Title)
	assert.Equal(t, "Track Four", resp.Items[3].Title)
	// ensure artists are populated
	require.Len(t, resp.Items[0].Artists, 1)
	assert.Equal(t, "Artist One", resp.Items[0].Artists[0].Name)

	// Test pagination
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Limit: 1, Page: 2, Period: db.PeriodAllTime, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, true, resp.HasNextPage)
	assert.EqualValues(t, 2, resp.CurrentPage)
	assert.EqualValues(t, 1, resp.ItemsPerPage)
	assert.EqualValues(t, 4, resp.TotalCount)
	assert.Equal(t, "Track Two", resp.Items[0].Title)

	// Test page out of range
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Limit: 1, Page: 10, Period: db.PeriodAllTime, UserID: 1})
	require.NoError(t, err)
	assert.Empty(t, resp.Items)
	assert.False(t, resp.HasNextPage)

	// Test invalid inputs
	_, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Limit: -1, Page: 0, UserID: 1})
	assert.Error(t, err)

	_, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Limit: 1, Page: -1, UserID: 1})
	assert.Error(t, err)

	// Test specify period
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodDay, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 0) // empty
	assert.Equal(t, int64(0), resp.TotalCount)
	// should default to PeriodDay
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 0) // empty
	assert.Equal(t, int64(0), resp.TotalCount)

	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodWeek, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, int64(1), resp.TotalCount)
	assert.Equal(t, "Track Four", resp.Items[0].Title)

	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodMonth, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 2)
	assert.Equal(t, int64(2), resp.TotalCount)
	assert.Equal(t, "Track Three", resp.Items[0].Title)
	assert.Equal(t, "Track Four", resp.Items[1].Title)

	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodYear, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 3)
	assert.Equal(t, int64(3), resp.TotalCount)
	assert.Equal(t, "Track Two", resp.Items[0].Title)
	assert.Equal(t, "Track Three", resp.Items[1].Title)
	assert.Equal(t, "Track Four", resp.Items[2].Title)

	// Test filter by artist
	// artist 1 -> track 1
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodAllTime, ArtistID: 1, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, "Track One", resp.Items[0].Title)
	assert.Equal(t, int64(1), resp.TotalCount)

	// Test filter by release
	// release 2 -> track 2
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodAllTime, AlbumID: 2, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, "Track Two", resp.Items[0].Title)
	assert.Equal(t, int64(1), resp.TotalCount)
	// when both are specified, artist is ignored
	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Period: db.PeriodAllTime, AlbumID: 2, ArtistID: 1, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, "Track Two", resp.Items[0].Title)
	assert.Equal(t, int64(1), resp.TotalCount)

	// Test specify dates

	testDataAbsoluteListenTimes(t)

	// 2023: Track 1 (4)
	// 2024: Track 2 (3), Track 3 (2)
	// 2025: Track 4 (1)

	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Year: 2023, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, int64(1), resp.TotalCount)
	assert.Equal(t, "Track One", resp.Items[0].Title)

	resp, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Month: 6, Year: 2024, UserID: 1})
	require.NoError(t, err)
	require.Len(t, resp.Items, 1)
	assert.Equal(t, int64(1), resp.TotalCount)
	assert.Equal(t, "Track Two", resp.Items[0].Title)

	// invalid, year required with month
	_, err = store.GetTopTracksPaginated(ctx, db.GetItemsOpts{Month: 10, UserID: 1})
	require.Error(t, err)
}
