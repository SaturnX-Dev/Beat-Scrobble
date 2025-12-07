import { useState, useMemo, useEffect } from "react";
import { imageUrl } from "api/api"; // Assuming this helper exists
import type { Album } from "api/api"; // Import Album type

interface MusicDecadesProps {
    items: Album[];
}

interface DecadeData {
    label: string;
    range: [number, number]; // [start, end] inclusive
    count: number;
    topAlbum: Album | null;
}

export default function MusicDecades({ items }: MusicDecadesProps) {
    const [focusedDecade, setFocusedDecade] = useState<string | null>(null);

    const data = useMemo(() => {
        const decades: Record<string, DecadeData> = {
            "Pre-1960": { label: "Pre-1960", range: [0, 1959], count: 0, topAlbum: null },
            "1960s": { label: "1960s", range: [1960, 1969], count: 0, topAlbum: null },
            "1970s": { label: "1970s", range: [1970, 1979], count: 0, topAlbum: null },
            "1980s": { label: "1980s", range: [1980, 1989], count: 0, topAlbum: null },
            "1990s": { label: "1990s", range: [1990, 1999], count: 0, topAlbum: null },
            "2000s": { label: "2000s", range: [2000, 2009], count: 0, topAlbum: null },
            "2010s": { label: "2010s", range: [2010, 2019], count: 0, topAlbum: null },
            "2020s": { label: "2020s", range: [2020, 2029], count: 0, topAlbum: null },
        };

        const topAlbumMap: Record<string, { maxCount: number, album: Album | null }> = {
            "Pre-1960": { maxCount: 0, album: null },
            "1960s": { maxCount: 0, album: null },
            "1970s": { maxCount: 0, album: null },
            "1980s": { maxCount: 0, album: null },
            "1990s": { maxCount: 0, album: null },
            "2000s": { maxCount: 0, album: null },
            "2010s": { maxCount: 0, album: null },
            "2020s": { maxCount: 0, album: null },
        };

        items.forEach(album => {
            if (!album.release_date) return;
            const year = parseInt(album.release_date.split("-")[0]);
            if (isNaN(year)) return;

            let key = "";
            if (year < 1960) key = "Pre-1960";
            else if (year >= 1960 && year < 1970) key = "1960s";
            else if (year >= 1970 && year < 1980) key = "1970s";
            else if (year >= 1980 && year < 1990) key = "1980s";
            else if (year >= 1990 && year < 2000) key = "1990s";
            else if (year >= 2000 && year < 2010) key = "2000s";
            else if (year >= 2010 && year < 2020) key = "2010s";
            else if (year >= 2020) key = "2020s";

            if (key) {
                decades[key].count += album.listen_count;

                // Track top album for *this specific bucket*
                if (album.listen_count > topAlbumMap[key].maxCount) {
                    topAlbumMap[key].maxCount = album.listen_count;
                    topAlbumMap[key].album = album;
                }
            }
        });

        // Assign top albums
        Object.keys(decades).forEach(key => {
            decades[key].topAlbum = topAlbumMap[key].album;
        });

        // Filter out empty decades or check raw numbers? 
        // Let's keep all for the full chart look unless perfectly empty
        return Object.values(decades);
    }, [items]);

    const maxCount = Math.max(...data.map(d => d.count), 1);

    // Determine which album to show
    const displayAlbum = useMemo(() => {
        if (focusedDecade) {
            return data.find(d => d.label === focusedDecade)?.topAlbum;
        }
        // Default to the decade with highest plays
        const topDecade = [...data].sort((a, b) => b.count - a.count)[0];
        return topDecade?.topAlbum;
    }, [focusedDecade, data]);

    const displayDecadeString = useMemo(() => {
        if (focusedDecade) return focusedDecade;
        const topDecade = [...data].sort((a, b) => b.count - a.count)[0];
        return topDecade?.label;
    }, [focusedDecade, data]);

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="flex flex-col gap-2 w-full">
                {data.map((decade) => {
                    const widthPercent = (decade.count / maxCount) * 100;
                    const isFocused = focusedDecade === decade.label;

                    return (
                        <div
                            key={decade.label}
                            className="flex items-center gap-4 group cursor-pointer"
                            onMouseEnter={() => setFocusedDecade(decade.label)}
                            onMouseLeave={() => setFocusedDecade(null)}
                        >
                            <div className="w-16 text-right text-xs font-medium text-[var(--color-fg-secondary)] group-hover:text-[var(--color-fg)] transition-colors">
                                {decade.label}
                            </div>

                            <div className="flex-1 h-6 bg-[var(--color-bg-tertiary)]/20 rounded-sm relative overflow-hidden">
                                {/* Bar */}
                                <div
                                    className="h-full relative transition-all duration-500 ease-out flex items-center"
                                    style={{ width: `${Math.max(widthPercent, 0.5)}%` }} // Ensure at least a tiny sliver
                                >
                                    {/* Striped Pattern Background */}
                                    {decade.count > 0 && (
                                        <div
                                            className={`absolute inset-0 w-full h-full ${decade.label === '2020s' || isFocused ? 'brightness-110' : 'opacity-60 grayscale'}`}
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(
                                                    90deg,
                                                    ${isFocused || decade.label === '2020s' ? 'var(--color-primary)' : 'var(--color-fg-tertiary)'} 0px,
                                                    ${isFocused || decade.label === '2020s' ? 'var(--color-primary)' : 'var(--color-fg-tertiary)'} 2px,
                                                    transparent 2px,
                                                    transparent 4px
                                                )`
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected Album Detail */}
            {displayAlbum && (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-12 h-12 rounded bg-[var(--color-bg-tertiary)] flex-shrink-0 overflow-hidden shadow-lg border border-[var(--color-bg-tertiary)]">
                        <img
                            src={imageUrl(displayAlbum.image, "small")}
                            alt={displayAlbum.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-[var(--color-fg)] uppercase tracking-wide mb-1">
                            Top Album • {displayDecadeString}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-[var(--color-fg-secondary)]">
                            <span className="font-bold border-b border-[var(--color-fg-secondary)] pb-0.5">{displayAlbum.title}</span>
                            <span className="opacity-50">by</span>
                            <span className="font-medium text-[var(--color-fg-tertiary)]">{displayAlbum.artists[0]?.name}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Fallback if no album found for decade */}
            {!displayAlbum && displayDecadeString && (
                <div className="h-12 flex items-center text-xs text-[var(--color-fg-tertiary)]">
                    No top album for {displayDecadeString}
                </div>
            )}
        </div>
    );
}
