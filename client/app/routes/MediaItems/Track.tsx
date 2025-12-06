import { useState } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { mergeTracks, type Album, type Track } from "api/api";
import LastPlays from "~/components/LastPlays";
import PeriodSelector from "~/components/PeriodSelector";
import MediaLayout from "./MediaLayout";
import ActivityGrid from "~/components/ActivityGrid";
import { timeListenedString } from "~/utils/utils";

export async function clientLoader({ params }: LoaderFunctionArgs) {
  let res = await fetch(`/apis/web/v1/track?id=${params.id}`);
  if (!res.ok) {
    throw new Response("Failed to load track", { status: res.status });
  }
  const track: Track = await res.json();
  res = await fetch(`/apis/web/v1/album?id=${track.album_id}`);
  if (!res.ok) {
    throw new Response("Failed to load album for track", {
      status: res.status,
    });
  }
  const album: Album = await res.json();
  return { track: track, album: album };
}

export default function Track() {
  const { track, album } = useLoaderData();
  const [period, setPeriod] = useState("week");

  return (
    <MediaLayout
      type="Track"
      title={track.title}
      img={track.image}
      id={track.id}
      musicbrainzId={album.musicbrainz_id}
      imgItemId={track.album_id}
      spotifyId={track.spotify_id}
      mergeFunc={mergeTracks}
      mergeCleanerFunc={(r, id) => {
        r.albums = [];
        r.artists = [];
        for (let i = 0; i < r.tracks.length; i++) {
          if (r.tracks[i].id === id) {
            delete r.tracks[i];
          }
        }
        return r;
      }}
      subContent={
        <div className="flex flex-col gap-4 items-start">
          <Link to={`/album/${track.album_id}`}>appears on {album.title}</Link>
          {track.listen_count && (
            <p>
              {track.listen_count} play{track.listen_count > 1 ? "s" : ""}
            </p>
          )}
          {
            <p title={Math.floor(track.time_listened / 60 / 60) + " hours"}>
              {timeListenedString(track.time_listened)}
            </p>
          }
          {
            <p title={new Date(track.first_listen * 1000).toLocaleString()}>
              Listening since{" "}
              {new Date(track.first_listen * 1000).toLocaleDateString()}
            </p>
          }

          {/* Spotify Audio Features */}
          {track.tempo > 0 && (
            <div className="w-full mt-4 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
              <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="text-green-500">♫</span> Audio Features
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-[var(--color-primary)]">{Math.round(track.tempo)}</div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">BPM</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-[var(--color-accent)]">
                    {["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][track.key] || "?"}
                    {track.mode === 1 ? "" : "m"}
                  </div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">Key</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-yellow-500">{Math.round(track.energy * 100)}%</div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">Energy</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-pink-500">{Math.round(track.danceability * 100)}%</div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">Danceability</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-blue-500">{Math.round(track.valence * 100)}%</div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">Mood</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--color-bg)]/50">
                  <div className="text-lg font-bold text-orange-500">{Math.round(track.acousticness * 100)}%</div>
                  <div className="text-[10px] text-[var(--color-fg-secondary)]">Acoustic</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            {track.artists && track.artists.length > 0 && (
              <Link
                to={`/artist/${track.artists[0].id}`}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dim)] transition-smooth text-sm font-medium"
              >
                View Artist
              </Link>
            )}
            <Link
              to={`/album/${track.album_id}`}
              className="px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-smooth text-sm font-medium"
            >
              View Album
            </Link>
          </div>
        </div>
      }

    >
      <div className="mt-10">
        <PeriodSelector setter={setPeriod} current={period} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8 mt-10">
        <div className="flex-1">
          <ActivityGrid trackId={track.id} configurable />
        </div>
        <div className="lg:w-1/3">
          <LastPlays limit={20} trackId={track.id} />
        </div>
      </div>
    </MediaLayout>
  );
}
