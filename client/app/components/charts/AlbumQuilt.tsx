import { Link } from "react-router";
import { imageUrl } from "api/api";
import { Disc } from "lucide-react";
import { useState } from "react";

interface QuiltAlbum {
    id: number;
    title: string;
    image?: string;
    listen_count?: number;
    artist?: string;
    artists?: { name: string }[];
}

interface AlbumQuiltProps {
    items: QuiltAlbum[];
    gridSize?: 3 | 4 | 5 | 6;
    showTooltip?: boolean;
}

export default function AlbumQuilt({
    items,
    gridSize = 4,
    showTooltip = true
}: AlbumQuiltProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const maxItems = gridSize * gridSize;
    const displayItems = items?.slice(0, maxItems) || [];

    if (!displayItems.length) {
        return (
            <div className="w-full aspect-square max-w-md mx-auto flex items-center justify-center bg-[var(--color-bg-tertiary)]/20 rounded-xl">
                <span className="text-sm text-[var(--color-fg-tertiary)]">No albums</span>
            </div>
        );
    }

    // Fill remaining slots with empty placeholders
    const filledItems = [...displayItems];
    while (filledItems.length < maxItems) {
        filledItems.push({ id: -filledItems.length, title: '', image: undefined, listen_count: 0 });
    }

    const getArtistName = (album: QuiltAlbum) =>
        album.artist || album.artists?.[0]?.name || 'Unknown';

    const hoveredAlbum = hoveredId !== null ? displayItems.find(a => a.id === hoveredId) : null;

    return (
        <div className="relative w-full">
            {/* Grid */}
            <div
                className="grid gap-1 sm:gap-1.5 w-full max-w-md mx-auto"
                style={{
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                }}
            >
                {filledItems.map((album, index) => {
                    const isReal = album.id > 0;
                    const isHovered = hoveredId === album.id;

                    return (
                        <div
                            key={album.id || `empty-${index}`}
                            className="relative aspect-square"
                            onMouseEnter={() => isReal && setHoveredId(album.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {isReal ? (
                                <Link
                                    to={`/album/${album.id}`}
                                    className={`
                                        block w-full h-full rounded-md sm:rounded-lg overflow-hidden
                                        transition-all duration-200 ease-out
                                        ${isHovered ? 'scale-105 z-20 shadow-xl shadow-black/40' : 'z-10'}
                                        ring-1 ring-white/5
                                    `}
                                    style={{
                                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                    }}
                                >
                                    {album.image ? (
                                        <img
                                            src={imageUrl(album.image, "medium")}
                                            alt={album.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                                            <Disc size={24} className="text-[var(--color-fg-tertiary)]" />
                                        </div>
                                    )}

                                    {/* Rank badge for top 3 */}
                                    {index < 3 && (
                                        <span className={`
                                            absolute top-1 left-1 w-5 h-5 rounded-full 
                                            flex items-center justify-center 
                                            text-[10px] font-bold text-white
                                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'}
                                            shadow-lg
                                        `}>
                                            {index + 1}
                                        </span>
                                    )}

                                    {/* Hover overlay */}
                                    <div className={`
                                        absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent
                                        transition-opacity duration-200
                                        ${isHovered ? 'opacity-100' : 'opacity-0'}
                                    `}>
                                        <div className="absolute bottom-0 left-0 right-0 p-2">
                                            <p className="text-[10px] sm:text-xs font-bold text-white truncate">
                                                {album.title}
                                            </p>
                                            <p className="text-[8px] sm:text-[10px] text-white/70 truncate">
                                                {getArtistName(album)}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <div className="w-full h-full rounded-md sm:rounded-lg bg-[var(--color-bg-tertiary)]/30" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating tooltip for mobile */}
            {showTooltip && hoveredAlbum && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-1.5 shadow-xl z-30 max-w-[80%]">
                    <p className="text-xs font-bold text-[var(--color-fg)] truncate">
                        {hoveredAlbum.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-[var(--color-fg-secondary)] truncate">
                            {getArtistName(hoveredAlbum)}
                        </span>
                        {hoveredAlbum.listen_count && (
                            <>
                                <span className="text-[var(--color-fg-tertiary)]">•</span>
                                <span className="text-[var(--color-primary)]">
                                    {hoveredAlbum.listen_count.toLocaleString()} plays
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
