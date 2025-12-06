import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeSince } from "~/utils/utils";
import ArtistLinks from "./ArtistLinks";
import {
  deleteListen,
  getLastListens,
  getNowPlaying,
  type getItemsArgs,
  type Listen,
  type Track,
} from "api/api";
import { Link } from "react-router";
import { useAppContext } from "~/providers/AppProvider";
import TrackRow from "./TrackRow";
import TrackRowSkeleton from "./skeletons/TrackRowSkeleton";
import EmptyState from "./EmptyState";

interface Props {
  limit: number;
  artistId?: Number;
  albumId?: Number;
  trackId?: number;
  hideArtists?: boolean;
  showNowPlaying?: boolean;
}

export default function LastPlays(props: Props) {
  const { user } = useAppContext();
  const { isPending, isError, data, error } = useQuery({
    queryKey: [
      "last-listens",
      {
        limit: props.limit,
        period: "all_time",
        artist_id: props.artistId,
        album_id: props.albumId,
        track_id: props.trackId,
      },
    ],
    queryFn: ({ queryKey }) => getLastListens(queryKey[1] as getItemsArgs),
  });
  const { data: npData } = useQuery({
    queryKey: ["now-playing"],
    queryFn: () => getNowPlaying(),
  });

  const [items, setItems] = useState<Listen[] | null>(null);

  const handleDelete = async (listen: Listen) => {
    if (!data) return;
    try {
      const res = await deleteListen(listen);
      if (res.ok || (res.status >= 200 && res.status < 300)) {
        setItems((prev) =>
          (prev ?? data.items).filter((i) => i.time !== listen.time)
        );
      } else {
        console.error("Failed to delete listen:", res.status);
      }
    } catch (err) {
      console.error("Error deleting listen:", err);
    }
  };

  if (isPending) {
    return (
      <div className="w-full space-y-2">
        <h2 className="mb-4">Last Played</h2>
        {Array.from({ length: 5 }).map((_, i) => (
          <TrackRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full">
        <h2 className="mb-4">Last Played</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
          Error: {error.message}
        </div>
      </div>
    );
  }

  const listens = items ?? data.items;

  let params = "";
  params += props.artistId ? `&artist_id=${props.artistId}` : "";
  params += props.albumId ? `&album_id=${props.albumId}` : "";
  params += props.trackId ? `&track_id=${props.trackId}` : "";

  return (
    <div className="text-xs sm:text-sm w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="hover:underline mb-0">
          <Link to={`/timeline?period=all_time${params}`}>Last Played</Link>
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        {props.showNowPlaying && npData && npData.currently_playing && (
          <div className="mb-2">
            <div className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-2 pl-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]"></span>
              </span>
              Now Playing
            </div>
            <TrackRow
              listen={{
                time: new Date().toISOString(),
                track: npData.track,
              } as Listen}
              showArtist={!props.hideArtists}
            />
          </div>
        )}

        {listens.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Start listening to music to populate your history."
            actionLabel="Explore Music"
            actionLink="/"
          />
        ) : (
          listens.map((item) => (
            <TrackRow
              key={`last_listen_${item.time}`}
              listen={item}
              showArtist={!props.hideArtists}
              canDelete={!!user}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
