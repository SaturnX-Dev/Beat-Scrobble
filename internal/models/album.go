package models

import "github.com/google/uuid"

type Album struct {
	ID             int32          `json:"id"`
	MbzID          *uuid.UUID     `json:"musicbrainz_id"`
	Title          string         `json:"title"`
	Image          *uuid.UUID     `json:"image"`
	Artists        []SimpleArtist `json:"artists"`
	VariousArtists bool           `json:"is_various_artists"`
	ListenCount    int64          `json:"listen_count"`
	TimeListened   int64          `json:"time_listened"`
	FirstListen    int64          `json:"first_listen"`
	// Spotify metadata
	Genres      []string `json:"genres,omitempty"`
	ReleaseDate string   `json:"release_date,omitempty"`
	Popularity  int      `json:"popularity,omitempty"`
	SpotifyID   string   `json:"spotify_id,omitempty"`
}
