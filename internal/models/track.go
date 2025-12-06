package models

import "github.com/google/uuid"

type Track struct {
	ID           int32          `json:"id"`
	Title        string         `json:"title"`
	Artists      []SimpleArtist `json:"artists"`
	MbzID        *uuid.UUID     `json:"musicbrainz_id"`
	ListenCount  int64          `json:"listen_count"`
	Duration     int32          `json:"duration"`
	Image        *uuid.UUID     `json:"image"`
	AlbumID      int32          `json:"album_id"`
	Album        *string        `json:"album,omitempty"`
	TimeListened int64          `json:"time_listened"`
	FirstListen  int64          `json:"first_listen"`
	// Spotify metadata
	SpotifyID        string  `json:"spotify_id,omitempty"`
	Popularity       int     `json:"popularity,omitempty"`
	Tempo            float64 `json:"tempo,omitempty"`
	Key              int     `json:"key,omitempty"`
	Mode             int     `json:"mode,omitempty"`
	Danceability     float64 `json:"danceability,omitempty"`
	Energy           float64 `json:"energy,omitempty"`
	Loudness         float64 `json:"loudness,omitempty"`
	Speechiness      float64 `json:"speechiness,omitempty"`
	Acousticness     float64 `json:"acousticness,omitempty"`
	Instrumentalness float64 `json:"instrumentalness,omitempty"`
	Liveness         float64 `json:"liveness,omitempty"`
	Valence          float64 `json:"valence,omitempty"`
}
