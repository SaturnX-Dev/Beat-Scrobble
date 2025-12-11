package handlers

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sync"

	"github.com/SaturnX-Dev/Beat-Scrobble/internal/catalog"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/cfg"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/images"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func ImageHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := logger.FromContext(r.Context())
		size := chi.URLParam(r, "size")
		filename := chi.URLParam(r, "filename")

		l.Debug().Msgf("ImageHandler: Received request to retrieve image with size '%s' and filename '%s'", size, filename)

		imageSize, err := catalog.ParseImageSize(size)
		if err != nil {
			l.Debug().Msg("ImageHandler: Invalid image size parameter")
			w.WriteHeader(http.StatusNotFound)
			return
		}

		imgid, err := uuid.Parse(filename)
		if err != nil {
			l.Debug().Msg("ImageHandler: Invalid image filename, serving default image")
			serveDefaultImage(w, r, imageSize)
			return
		}

		desiredImgPath := filepath.Join(cfg.ConfigDir(), catalog.ImageCacheDir, size, filepath.Clean(filename))

		if _, err := os.Stat(desiredImgPath); os.IsNotExist(err) {
			l.Debug().Msg("ImageHandler: Image not found in desired size, attempting to retrieve source image")

			fullSizePath := filepath.Join(cfg.ConfigDir(), catalog.ImageCacheDir, string(catalog.ImageSizeFull), filepath.Clean(filename))
			largeSizePath := filepath.Join(cfg.ConfigDir(), catalog.ImageCacheDir, string(catalog.ImageSizeLarge), filepath.Clean(filename))

			// this if statement flow is terrible but whatever
			var sourcePath string
			if _, err = os.Stat(fullSizePath); os.IsNotExist(err) {
				if _, err = os.Stat(largeSizePath); os.IsNotExist(err) {
					l.Warn().Msgf("ImageHandler: Could not find requested image %s. Attempting to download from source", imgid.String())
					sourcePath, err = downloadMissingImage(r.Context(), store, imgid)
					if err != nil {
						l.Warn().Err(err).Msg("ImageHandler: Failed to redownload missing image, serving default")
						serveDefaultImage(w, r, imageSize)
						return
					}
				} else if err != nil {
					l.Err(err).Msg("ImageHandler: Failed to access source image file at large size")
					w.WriteHeader(http.StatusInternalServerError)
					return
				} else {
					sourcePath = largeSizePath
				}
			} else if err != nil {
				l.Err(err).Msg("ImageHandler: Failed to access source image file at full size")
				w.WriteHeader(http.StatusInternalServerError)
				return
			} else {
				sourcePath = fullSizePath
			}

			l.Debug().Msgf("ImageHandler: Found source image file at path '%s'", sourcePath)

			imageBuf, err := os.ReadFile(sourcePath)
			if err != nil {
				l.Err(err).Msg("ImageHandler: Failed to read source image file")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}

			err = catalog.CompressAndSaveImage(r.Context(), imgid.String(), imageSize, bytes.NewReader(imageBuf))
			if err != nil {
				l.Err(err).Msg("ImageHandler: Failed to save compressed image to cache")
			}
		} else if err != nil {
			l.Err(err).Msg("ImageHandler: Failed to access desired image file")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		l.Debug().Msgf("ImageHandler: Serving image from path '%s'", desiredImgPath)
		http.ServeFile(w, r, desiredImgPath)
	}
}

func serveDefaultImage(w http.ResponseWriter, r *http.Request, size catalog.ImageSize) {
	var lock sync.Mutex
	l := logger.FromContext(r.Context())

	l.Debug().Msgf("serveDefaultImage: Serving default image at size '%s'", size)

	defaultImagePath := filepath.Join(cfg.ConfigDir(), catalog.ImageCacheDir, string(size), "default_img")
	if _, err := os.Stat(defaultImagePath); os.IsNotExist(err) {
		l.Debug().Msg("serveDefaultImage: Default image does not exist in cache at desired size")
		defaultImagePath := filepath.Join(catalog.SourceImageDir(), "default_img")
		if _, err = os.Stat(defaultImagePath); os.IsNotExist(err) {
			l.Debug().Msg("serveDefaultImage: Default image does not exist in source directory, attempting to move...")
			err = os.MkdirAll(filepath.Dir(defaultImagePath), 0744)
			if err != nil {
				l.Err(err).Msg("serveDefaultImage: Error when attempting to create image_cache/full directory")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			lock.Lock()
			err = utils.CopyFile(path.Join("assets", "default_img"), defaultImagePath)
			if err != nil {
				l.Err(err).Msg("serveDefaultImage: Error when copying default image from assets")
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			lock.Unlock()
		} else if err != nil {
			l.Err(err).Msg("serveDefaultImage: Error when attempting to read default image in cache")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		file, err := os.Open(path.Join(catalog.SourceImageDir(), "default_img"))
		if err != nil {
			l.Err(err).Msg("serveDefaultImage: Error when reading default image from source directory")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		err = catalog.CompressAndSaveImage(r.Context(), "default_img", size, file)
		if err != nil {
			l.Err(err).Msg("serveDefaultImage: Error when caching default image at desired size")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		l.Err(err).Msg("serveDefaultImage: Error when attempting to read default image in cache")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	l.Debug().Msgf("serveDefaultImage: Successfully serving default image at size '%s'", size)
	http.ServeFile(w, r, path.Join(cfg.ConfigDir(), catalog.ImageCacheDir, string(size), "default_img"))
}

// finds the item associated with the image id, downloads it, and saves it in the source path, returning the path to the image
func downloadMissingImage(ctx context.Context, store db.DB, id uuid.UUID) (string, error) {
	l := logger.FromContext(ctx)

	src, err := store.GetImageSource(ctx, id)
	if err != nil {
		return "", fmt.Errorf("downloadMissingImage: GetImageSource: %w", err)
	}

	var size catalog.ImageSize
	if cfg.FullImageCacheEnabled() {
		size = catalog.ImageSizeFull
	} else {
		size = catalog.ImageSizeLarge
	}

	// If we have a valid URL, try downloading it
	if src != "" && catalog.ValidateImageURL(src) == nil {
		err = catalog.DownloadAndCacheImage(ctx, id, src, size)
		if err == nil {
			return path.Join(catalog.SourceImageDir(), id.String()), nil
		}
		l.Debug().Err(err).Msg("downloadMissingImage: Download from stored URL failed, trying external search")
	} else {
		l.Debug().Msgf("downloadMissingImage: No valid URL stored (got: %q), trying external search", src)
	}

	// URL is empty or invalid, try to find image from external providers
	newSrc, entityID, entityType, err := findImageFromExternalProviders(ctx, store, id)
	if err != nil {
		return "", fmt.Errorf("downloadMissingImage: %w", err)
	}

	if newSrc == "" {
		return "", fmt.Errorf("downloadMissingImage: no image found from external providers")
	}

	// Download the image
	err = catalog.DownloadAndCacheImage(ctx, id, newSrc, size)
	if err != nil {
		return "", fmt.Errorf("downloadMissingImage: DownloadAndCacheImage: %w", err)
	}

	// Update database with the new image source
	if entityType == "album" && entityID > 0 {
		err = store.UpdateAlbum(ctx, db.UpdateAlbumOpts{
			ID:       entityID,
			Image:    id,
			ImageSrc: newSrc,
		})
		if err != nil {
			l.Warn().Err(err).Msg("downloadMissingImage: Failed to update album image source in DB")
		} else {
			l.Info().Msgf("downloadMissingImage: Updated album %d image source to %s", entityID, newSrc)
		}
	} else if entityType == "artist" && entityID > 0 {
		err = store.UpdateArtist(ctx, db.UpdateArtistOpts{
			ID:       entityID,
			Image:    id,
			ImageSrc: newSrc,
		})
		if err != nil {
			l.Warn().Err(err).Msg("downloadMissingImage: Failed to update artist image source in DB")
		} else {
			l.Info().Msgf("downloadMissingImage: Updated artist %d image source to %s", entityID, newSrc)
		}
	}

	return path.Join(catalog.SourceImageDir(), id.String()), nil
}

// findImageFromExternalProviders searches for image URL from external providers (Spotify, Deezer, CAA, Subsonic)
// Returns: image URL, entity ID, entity type ("album" or "artist"), error
func findImageFromExternalProviders(ctx context.Context, store db.DB, imageID uuid.UUID) (string, int32, string, error) {
	l := logger.FromContext(ctx)

	// First, try to find if this image belongs to an album
	albumByImg, err := store.GetAlbumByImage(ctx, imageID)
	if err == nil && albumByImg != nil {
		// Get full album data with GetAlbum to get the title
		album, err := store.GetAlbum(ctx, db.GetAlbumOpts{ID: albumByImg.ID})
		if err != nil {
			l.Debug().Err(err).Msg("findImageFromExternalProviders: Failed to get album details")
		} else if album != nil {
			l.Debug().Msgf("findImageFromExternalProviders: Image belongs to album '%s' (ID: %d)", album.Title, album.ID)

			// Get artists for the album
			artists, err := store.GetArtistsForAlbum(ctx, album.ID)
			if err != nil {
				l.Debug().Err(err).Msg("findImageFromExternalProviders: Failed to get artists for album")
			}

			var artistNames []string
			for _, a := range artists {
				artistNames = append(artistNames, a.Name)
			}

			// Search for album image using external providers
			imgURL, err := images.GetAlbumImage(ctx, images.AlbumImageOpts{
				Artists:      artistNames,
				Album:        album.Title,
				ReleaseMbzID: album.MbzID,
			})
			if err != nil {
				l.Debug().Err(err).Msg("findImageFromExternalProviders: GetAlbumImage failed")
			}
			if imgURL != "" {
				return imgURL, album.ID, "album", nil
			}
		}
	}

	// Try to find if this image belongs to an artist
	artistByImg, err := store.GetArtistByImage(ctx, imageID)
	if err == nil && artistByImg != nil {
		// Get full artist data with GetArtist to get name and aliases
		artist, err := store.GetArtist(ctx, db.GetArtistOpts{ID: artistByImg.ID})
		if err != nil {
			l.Debug().Err(err).Msg("findImageFromExternalProviders: Failed to get artist details")
		} else if artist != nil {
			l.Debug().Msgf("findImageFromExternalProviders: Image belongs to artist '%s' (ID: %d)", artist.Name, artist.ID)

			// Use artist name and aliases for search
			aliases := []string{artist.Name}
			aliases = append(aliases, artist.Aliases...)

			// Search for artist image using external providers
			imgURL, err := images.GetArtistImage(ctx, images.ArtistImageOpts{
				Aliases: aliases,
			})
			if err != nil {
				l.Debug().Err(err).Msg("findImageFromExternalProviders: GetArtistImage failed")
			}
			if imgURL != "" {
				return imgURL, artist.ID, "artist", nil
			}
		}
	}

	return "", 0, "", nil
}
