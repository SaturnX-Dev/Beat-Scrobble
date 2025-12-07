import { useMemo } from "react";
import { Disc, Music, User } from "lucide-react";

interface MusicRatioProps {
    trackCount: number;
    albumCount: number;
    artistCount: number;
    yearTrackCount?: number;
    yearAlbumCount?: number;
    yearArtistCount?: number;
}

export default function MusicRatio({
    trackCount,
    albumCount,
    artistCount,
    yearTrackCount = 0,
    yearAlbumCount = 0,
    yearArtistCount = 0
}: MusicRatioProps) {

    // Calculate percentages relative to the max value to scale the bars
    // But typically "Ratio" means composition. 
    // However, the screenshot shows concentric rings. 
    // Let's normalize against a "max capacity" or against each other.
    // In many "music ratio" designs, it's just relative scale.
    // Let's assume the outer ring (biggest count) is 100% (or close to it) 
    // OR we arbitrarily scale based on some "expected" max or just max of the set.

    const maxVal = Math.max(trackCount, albumCount * 2, artistCount * 3, 100); // giving some weight

    // Let's just use the raw max of the counts for scaling to fill the chart
    const scaleRef = Math.max(trackCount, albumCount, artistCount, 1);

    const rings = useMemo(() => [
        {
            label: "Tracks",
            value: trackCount,
            prev: yearTrackCount,
            color: "var(--color-primary)",
            icon: Music,
            radius: 90,
            percent: (trackCount / scaleRef) * 100
        },
        {
            label: "Albums",
            value: albumCount,
            prev: yearAlbumCount,
            color: "var(--color-success)",
            icon: Disc,
            radius: 70,
            percent: (albumCount / scaleRef) * 100
        },
        {
            label: "Artists",
            value: artistCount,
            prev: yearArtistCount,
            color: "var(--color-accent)",
            icon: User,
            radius: 50,
            percent: (artistCount / scaleRef) * 100
        }
    ], [trackCount, albumCount, artistCount, yearTrackCount, yearAlbumCount, yearArtistCount, scaleRef]);

    const circumference = (r: number) => 2 * Math.PI * r;

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="relative w-64 h-64 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                    {/* Background Tracks */}
                    {rings.map((ring, i) => (
                        <circle
                            key={`bg-${i}`}
                            cx="110"
                            cy="110"
                            r={ring.radius}
                            fill="none"
                            stroke="var(--color-bg-tertiary)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.3"
                        />
                    ))}

                    {/* Value Tracks */}
                    {rings.map((ring, i) => {
                        const c = circumference(ring.radius);
                        // clamp percentage 
                        const p = Math.min(Math.max(ring.percent, 5), 100);
                        const offset = c - (p / 100) * c;

                        return (
                            <circle
                                key={`val-${i}`}
                                cx="110"
                                cy="110"
                                r={ring.radius}
                                fill="none"
                                stroke={ring.color}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={c}
                                strokeDashoffset={offset}
                                className="transition-all duration-1000 ease-out"
                            />
                        );
                    })}
                </svg>

                {/* Center Hole/Label? Optional, maybe icons */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Could put something here */}
                </div>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-xs">
                {rings.map((ring) => (
                    <div key={ring.label} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] group-hover:bg-[var(--color-bg-secondary)] transition-colors"
                                style={{ color: ring.color }}
                            >
                                <ring.icon size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-fg-secondary)] font-medium uppercase tracking-wider">
                                    {ring.label}
                                </p>
                                <p className="text-2xl font-bold text-[var(--color-fg)]">
                                    {ring.value.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {ring.prev > 0 && (
                            <div className="text-right">
                                <p className="text-[10px] text-[var(--color-fg-tertiary)]">vs previous</p>
                                <p className="text-xs font-medium text-[var(--color-fg-secondary)]">
                                    {ring.prev.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
