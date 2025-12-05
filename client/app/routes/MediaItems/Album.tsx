import { useState } from "react";
import { useLoaderData, Link, type LoaderFunctionArgs } from "react-router";
import TopTracks from "~/components/TopTracks";
import { mergeAlbums, type Album, fetchSpotifyMetadata } from "api/api";
import LastPlays from "~/components/LastPlays";
import PeriodSelector from "~/components/PeriodSelector";
import MediaLayout from "./MediaLayout";
import ActivityGrid from "~/components/ActivityGrid";
import { timeListenedString } from "~/utils/utils";
import { usePreferences } from "~/hooks/usePreferences";

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/apis/web/v1/album?id=${params.id}`);
  if (!res.ok) {
    throw new Response("Failed to load album", { status: 500 });
  }
  const album: Album = await res.json();
  return album;
}

export default function Album() {
  const album = useLoaderData() as Album;
  const [period, setPeriod] = useState("week");
  const [refreshing, setRefreshing] = useState(false);
  const { preferences } = usePreferences();

  // Check if metadata should be displayed (default true)
  const showMetadata = preferences?.spotify_show_metadata !== false;

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    try {
      await fetchSpotifyMetadata(album.id, "album", album.spotify_id);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to refresh metadata. Ensure Spotify is configured.");
    } finally {
      setRefreshing(false);
    }
  };

  console.log(album);

  return (
    <MediaLayout
      type="Album"
      title={album.title}
      img={album.image}
      id={album.id}
      musicbrainzId={album.musicbrainz_id}
      imgItemId={album.id}
      mergeFunc={mergeAlbums}
      mergeCleanerFunc={(r, id) => {
        r.artists = [];
        r.tracks = [];
        for (let i = 0; i < r.albums.length; i++) {
          if (r.albums[i].id === id) {
            delete r.albums[i];
          }
        }
        return r;
      }}
      onRefreshMetadata={handleRefreshMetadata}
      refreshing={refreshing}
      subContent={
        <div className="flex flex-col gap-2 items-start">
          {album.listen_count && (
            <p>
              {album.listen_count} play{album.listen_count > 1 ? "s" : ""}
            </p>
          )}
          {
            <p title={Math.floor(album.time_listened / 60 / 60) + " hours"}>
              {timeListenedString(album.time_listened)}
            </p>
          }
          {
            <p title={new Date(album.first_listen * 1000).toLocaleString()}>
              Listening since{" "}
              {new Date(album.first_listen * 1000).toLocaleDateString()}
            </p>
          }
          {album.artists && album.artists.length > 0 && (
            <Link
              to={`/artist/${album.artists[0].id}`}
              className="mt-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white text-sm font-medium shadow-md transition-smooth"
            >
              View Artist
            </Link>
          )}
          {showMetadata && album.genres && album.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {album.genres.map(g => (
                <span key={g} className="px-2 py-1 text-[10px] uppercase tracking-wider bg-[var(--color-bg)]/50 rounded-full text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]">
                  {g}
                </span>
              ))}
            </div>
          )}
          {showMetadata && album.release_date && (
            <p className="text-xs text-[var(--color-fg-secondary)]">
              Released: {album.release_date}
            </p>
          )}
          {showMetadata && album.popularity !== undefined && (
            <p className="text-xs text-[var(--color-fg-tertiary)]">
              Popularity: {album.popularity}%
            </p>
          )}
        </div>
      }
    >
      <div className="mt-10">
        <PeriodSelector setter={setPeriod} current={period} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8 mt-10">
        <div className="flex-1 space-y-8">
          <TopTracks limit={12} period={period} albumId={album.id} />
          <ActivityGrid configurable albumId={album.id} />
        </div>
        <div className="lg:w-1/3">
          <LastPlays limit={30} albumId={album.id} />
        </div>
      </div>
    </MediaLayout>
  );
}
