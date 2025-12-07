package models

type LbzListenType string

const (
	ListenTypeSingle     LbzListenType = "single"
	ListenTypePlayingNow LbzListenType = "playing_now"
	ListenTypeImport     LbzListenType = "import"
)

type LbzSubmitListenRequest struct {
	ListenType LbzListenType            `json:"listen_type,omitempty"`
	Payload    []LbzSubmitListenPayload `json:"payload,omitempty"`
}

type LbzSubmitListenPayload struct {
	ListenedAt int64        `json:"listened_at,omitempty"`
	TrackMeta  LbzTrackMeta `json:"track_metadata"`
}

type LbzTrackMeta struct {
	ArtistName     string            `json:"artist_name"` // required
	TrackName      string            `json:"track_name"`  // required
	ReleaseName    string            `json:"release_name,omitempty"`
	MBIDMapping    LbzMBIDMapping    `json:"mbid_mapping"`
	AdditionalInfo LbzAdditionalInfo `json:"additional_info,omitempty"`
}
type LbzArtist struct {
	ArtistMBID string `json:"artist_mbid"`
	ArtistName string `json:"artist_credit_name"`
}
type LbzMBIDMapping struct {
	ReleaseMBID   string      `json:"release_mbid"`
	RecordingMBID string      `json:"recording_mbid"`
	ArtistMBIDs   []string    `json:"artist_mbids"`
	Artists       []LbzArtist `json:"artists"`
}

type LbzAdditionalInfo struct {
	MediaPlayer             string   `json:"media_player,omitempty"`
	SubmissionClient        string   `json:"submission_client,omitempty"`
	SubmissionClientVersion string   `json:"submission_client_version,omitempty"`
	ReleaseMBID             string   `json:"release_mbid,omitempty"`
	ReleaseGroupMBID        string   `json:"release_group_mbid,omitempty"`
	ArtistMBIDs             []string `json:"artist_mbids,omitempty"`
	ArtistNames             []string `json:"artist_names,omitempty"`
	RecordingMBID           string   `json:"recording_mbid,omitempty"`
	DurationMs              int32    `json:"duration_ms,omitempty"`
	Duration                int32    `json:"duration,omitempty"`
	Tags                    []string `json:"tags,omitempty"`
	AlbumArtist             string   `json:"albumartist,omitempty"`
}
