import { Link } from "react-router";

interface TheWallProps {
    items: any[];
}

export default function TheWall({ items }: TheWallProps) {
    // Top 50 items (Last.fm The Wall usually shows Top 50)
    const displayItems = items.slice(0, 50);

    return (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-0.5 bg-[var(--color-bg)] rounded-xl overflow-hidden border border-[var(--color-bg-tertiary)]">
            {displayItems.map((item, index) => {
                // Size logic: Top items could be bigger, but standard Wall is uniform grid
                // To make it distinct from AlbumQuilt (which has varying sizes), we'll keep this strict uniform grid
                // but maybe create a "mosaic" feel by varying opacity or saturation based on rank?

                return (
                    <Link
                        key={item.id}
                        to={`/artist/${item.id}`}
                        className="group relative aspect-square overflow-hidden bg-[var(--color-bg-secondary)]"
                    >
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-tertiary)] text-[var(--color-fg-tertiary)] font-bold text-xs uppercase p-2 text-center">
                                {item.name.substring(0, 2)}
                            </div>
                        )}

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-center">
                            <span className="text-white font-bold text-xs sm:text-sm line-clamp-2">
                                {item.name}
                            </span>
                            <span className="text-white/80 text-[10px] sm:text-xs mt-1">
                                #{index + 1}
                            </span>
                            <span className="text-[var(--color-primary)] text-[10px] font-medium mt-1">
                                {item.listen_count} plays
                            </span>
                        </div>

                        {/* Rank Badge (Always visible, subtle) */}
                        <div className="absolute top-1 left-1 bg-black/40 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-0 transition-opacity">
                            #{index + 1}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
