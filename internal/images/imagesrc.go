// package imagesrc defines interfaces for album and artist image providers
package images

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/spotify"
	"github.com/google/uuid"
)

type ImageSource struct {
	deezerEnabled   bool
	deezerC         *DeezerClient
	subsonicEnabled bool
	subsonicC       *SubsonicClient
	spotifyEnabled  bool
	spotifyP        *SpotifyProvider
	caaEnabled      bool
}
type ImageSourceOpts struct {
	UserAgent      string
	EnableCAA      bool
	EnableDeezer   bool
	EnableSubsonic bool
	EnableSpotify  bool
	DB             db.DB
}

var once sync.Once
var imgsrc ImageSource

type ArtistImageOpts struct {
	Aliases []string
}

type AlbumImageOpts struct {
	Artists           []string
	Album             string
	ReleaseMbzID      *uuid.UUID
	ReleaseGroupMbzID *uuid.UUID
}

const caaBaseUrl = "https://coverartarchive.org"

// all functions are no-op if no providers are enabled
func Initialize(opts ImageSourceOpts) {
	once.Do(func() {
		if opts.EnableCAA {
			imgsrc.caaEnabled = true
		}
		if opts.EnableDeezer {
			imgsrc.deezerEnabled = true
			imgsrc.deezerC = NewDeezerClient()
		}
		if opts.EnableSubsonic {
			imgsrc.subsonicEnabled = true
			imgsrc.subsonicC = NewSubsonicClient()
		}
		if opts.EnableSpotify && opts.DB != nil {
			imgsrc.spotifyEnabled = true
			// assuming user ID 1 for now, or we could pass it in opts if needed
			client := spotify.NewClient(opts.DB, 1)
			imgsrc.spotifyP = NewSpotifyProvider(client)
		}
	})
}

func Shutdown() {
	if imgsrc.deezerC != nil {
		imgsrc.deezerC.Shutdown()
	}
}

func GetArtistImage(ctx context.Context, opts ArtistImageOpts) (string, error) {
	l := logger.FromContext(ctx)

	// 1. Try Spotify first (User Preference)
	if imgsrc.spotifyEnabled {
		// Use the first alias (usually the main artist name)
		if len(opts.Aliases) > 0 {
			img, err := imgsrc.spotifyP.GetArtistImage(ctx, opts.Aliases[0])
			if err != nil {
				l.Debug().Err(err).Msg("Spotify artist image fetch failed, falling back")
			} else if img != "" {
				return img, nil
			}
		}
	}

	// 2. Try Subsonic
	if imgsrc.subsonicEnabled {
		img, err := imgsrc.subsonicC.GetArtistImage(ctx, opts.Aliases[0])
		if err != nil {
			return "", err
		}
		if img != "" {
			return img, nil
		}
		l.Debug().Msg("Could not find artist image from Subsonic")
	}

	// 3. Try Deezer
	if imgsrc.deezerC != nil {
		img, err := imgsrc.deezerC.GetArtistImages(ctx, opts.Aliases)
		if err != nil {
			return "", err
		}
		return img, nil
	}
	l.Warn().Msg("GetArtistImage: No image providers are enabled or found image")
	return "", nil
}

func GetAlbumImage(ctx context.Context, opts AlbumImageOpts) (string, error) {
	l := logger.FromContext(ctx)

	// 1. Try Spotify first
	if imgsrc.spotifyEnabled && len(opts.Artists) > 0 {
		img, err := imgsrc.spotifyP.GetAlbumImage(ctx, opts.Artists[0], opts.Album)
		if err != nil {
			l.Debug().Err(err).Msg("Spotify album image fetch failed, falling back")
		} else if img != "" {
			return img, nil
		}
	}

	// 2. Try Subsonic
	if imgsrc.subsonicEnabled {
		img, err := imgsrc.subsonicC.GetAlbumImage(ctx, opts.Artists[0], opts.Album)
		if err != nil {
			return "", err
		}
		if img != "" {
			return img, nil
		}
		l.Debug().Msg("Could not find album cover from Subsonic")
	}

	// 3. Try CAA (Cover Art Archive)
	if imgsrc.caaEnabled {
		l.Debug().Msg("Attempting to find album image from CoverArtArchive")
		if opts.ReleaseMbzID != nil && *opts.ReleaseMbzID != uuid.Nil {
			url := fmt.Sprintf(caaBaseUrl+"/release/%s/front", opts.ReleaseMbzID.String())
			resp, err := http.DefaultClient.Head(url)
			if err != nil {
				l.Debug().Err(err).Msg("CAA HEAD request failed")
			} else {
				if resp.StatusCode == 200 {
					return url, nil
				}
			}
		}
		if opts.ReleaseGroupMbzID != nil && *opts.ReleaseGroupMbzID != uuid.Nil {
			url := fmt.Sprintf(caaBaseUrl+"/release-group/%s/front", opts.ReleaseGroupMbzID.String())
			resp, err := http.DefaultClient.Head(url)
			if err != nil {
				l.Debug().Err(err).Msg("CAA HEAD request failed")
			} else {
				if resp.StatusCode == 200 {
					return url, nil
				}
			}
		}
	}

	// 4. Try Deezer
	if imgsrc.deezerEnabled {
		l.Debug().Msg("Attempting to find album image from Deezer")
		img, err := imgsrc.deezerC.GetAlbumImages(ctx, opts.Artists, opts.Album)
		if err != nil {
			return "", err
		}
		return img, nil
	}

	l.Warn().Msg("GetAlbumImage: No image providers are enabled or found image")
	return "", nil
}
