import { useQuery } from "@tanstack/react-query";
import { getTopTracks, type getItemsArgs } from "api/api";
import { Link } from "react-router";
import RankedTrackRow from "./RankedTrackRow";
import RankedTrackRowSkeleton from "./skeletons/RankedTrackRowSkeleton";
import EmptyState from "./EmptyState";

interface Props {
  limit: number;
  period: string;
  artistId?: Number;
  albumId?: Number;
}

const TopTracks = (props: Props) => {
  const { isPending, isError, data, error } = useQuery({
    queryKey: [
      "top-tracks",
      {
        limit: props.limit,
        period: props.period,
        artist_id: props.artistId,
        album_id: props.albumId,
        page: 0,
      },
    ],
    queryFn: ({ queryKey }) => getTopTracks(queryKey[1] as getItemsArgs),
  });

  if (isPending) {
    return (
      <div className="w-full space-y-2">
        <h2 className="mb-4">Top Tracks</h2>
        {Array.from({ length: 5 }).map((_, i) => (
          <RankedTrackRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full">
        <h2 className="mb-4">Top Tracks</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!data?.items) return null;

  let params = "";
  params += props.artistId ? `&artist_id=${props.artistId}` : "";
  params += props.albumId ? `&album_id=${props.albumId}` : "";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="hover:underline mb-0">
          <Link to={`/chart/top-tracks?period=${props.period}${params}`}>Top Tracks</Link>
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        {data.items.length === 0 ? (
          <EmptyState
            title="No top tracks"
            description="Keep listening to see your favorites here."
          />
        ) : (
          data.items.map((track, i) => (
            <RankedTrackRow
              key={track.id}
              track={track}
              rank={i + 1}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TopTracks;
