import { useQuery } from "@tanstack/react-query";
import { getTopAlbums, imageUrl } from "api/api";
import { Link } from "react-router";

interface Props {
    artistId: number;
    period?: string;
}

// Distinct complementary colors for album distribution
const ALBUM_COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#ec4899", // Pink
];

export default function MiniDiscography({ artistId, period = "all_time" }: Props) {
    const { data } = useQuery({
        queryKey: ["top-albums", { limit: 10, artistId, page: 1, period }],
        queryFn: () => getTopAlbums({ limit: 10, period, artist_id: artistId, page: 1 }),
    });

    if (!data || !data.items || data.items.length === 0) return null;

    const totalPlays = data.items.reduce((acc, album) => acc + album.listen_count, 0);

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wide text-[var(--color-fg-secondary)] font-bold">Album Distribution</h3>

            {/* Distribution Bar */}
            <div className="flex w-full h-5 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)]">
                {data.items.slice(0, 6).map((album, idx) => {
                    const width = (album.listen_count / totalPlays) * 100;
                    return (
                        <div
                            key={album.id}
                            style={{
                                width: `${width}%`,
                                backgroundColor: ALBUM_COLORS[idx % ALBUM_COLORS.length]
                            }}
                            className="hover:opacity-80 transition-opacity relative group cursor-pointer"
                        >
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/90 text-white text-xs p-2 rounded-lg whitespace-nowrap z-20 shadow-lg">
                                <p className="font-bold">{album.title}</p>
                                <p className="text-[var(--color-fg-secondary)]">{album.listen_count} plays ({Math.round(width)}%)</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {data.items.slice(0, 6).map((album, idx) => {
                    const width = (album.listen_count / totalPlays) * 100;
                    return (
                        <div key={album.id} className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ALBUM_COLORS[idx % ALBUM_COLORS.length] }}
                            />
                            <Link
                                to={`/album/${album.id}`}
                                className="text-xs text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] truncate flex-1"
                                title={album.title}
                            >
                                {album.title}
                            </Link>
                            <span className="text-[10px] text-[var(--color-fg-tertiary)] flex-shrink-0">
                                {Math.round(width)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

