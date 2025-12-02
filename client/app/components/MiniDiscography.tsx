import { useQuery } from "@tanstack/react-query";
import { getTopAlbums, imageUrl } from "api/api";
import { Link } from "react-router";

interface Props {
    artistId: number;
}

export default function MiniDiscography({ artistId }: Props) {
    const { data } = useQuery({
        queryKey: ["top-albums", { limit: 10, artistId, page: 1 }],
        queryFn: () => getTopAlbums({ limit: 10, period: "all", artist_id: artistId, page: 1 }),
    });

    if (!data || !data.items || data.items.length === 0) return null;

    const totalPlays = data.items.reduce((acc, album) => acc + album.listen_count, 0);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-secondary)] font-bold mb-1">Album Distribution</h3>
            <div className="flex w-full h-4 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)]">
                {data.items.slice(0, 5).map((album, idx) => {
                    const width = (album.listen_count / totalPlays) * 100;
                    // Generate varied colors based on index using theme variables with opacity
                    const opacities = [
                        "opacity-100", "opacity-80", "opacity-60", "opacity-40", "opacity-20"
                    ];
                    const opacityClass = opacities[idx % opacities.length];

                    return (
                        <div
                            key={album.id}
                            style={{ width: `${width}%` }}
                            className={`bg-[var(--color-primary)] ${opacityClass} hover:opacity-90 transition-opacity relative group`}
                        >
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap z-10">
                                {album.title}: {Math.round(width)}%
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                {data.items.slice(0, 3).map((album, idx) => (
                    <div key={album.id} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full bg-[var(--color-primary)] ${["opacity-100", "opacity-80", "opacity-60"][idx]}`}></div>
                        <Link to={`/album/${album.id}`} className="text-xs text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] truncate max-w-[100px]">
                            {album.title}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
