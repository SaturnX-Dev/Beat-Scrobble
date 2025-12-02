package db_test

import (
	"testing"
	"time"
)

func TestListenActivityOptsToTimes(t *testing.T) {

	// default range
	// opts := db.ListenActivityOpts{}
	// t1, t2 := db.ListenActivityOptsToTimes(opts)
	// t.Logf("%s to %s", t1, t2)
	// assert.WithinDuration(t, bod(time.Now().Add(-11*24*time.Hour)), t1, 5*time.Second)
	// assert.WithinDuration(t, eod(time.Now()), t2, 5*time.Second)
}

func eod(t time.Time) time.Time {
	year, month, day := t.Date()
	loc := t.Location()
	return time.Date(year, month, day, 23, 59, 59, 0, loc)
}

func bod(t time.Time) time.Time {
	year, month, day := t.Date()
	loc := t.Location()
	return time.Date(year, month, day, 0, 0, 0, 0, loc)
}
