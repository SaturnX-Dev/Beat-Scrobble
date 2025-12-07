import { useQueries } from "@tanstack/react-query";
import { getActivity, type ListenActivityItem } from "api/api";
import { useMemo } from "react";

interface StreamGraphProps {
    items: any[]; // Top artists
    period: string; // "week", "month", etc.
}

export default function StreamGraph({ items, period }: StreamGraphProps) {
    // Increase to Top 10 as requested
    const topArtists = items.slice(0, 10);

    // Prepare queries for each artist's activity
    const artistQueries = useQueries({
        queries: topArtists.map(artist => ({
            queryKey: ['activity', artist.id, period],
            queryFn: () => getActivity({
                step: 'day', // Granularity
                range: period === 'year' ? 365 : (period === 'month' ? 30 : 90),
                month: 0,
                year: 0,
                artist_id: artist.id,
                album_id: 0,
                track_id: 0
            }),
            staleTime: 1000 * 60 * 60, // 1 hour
        }))
    });

    const isLoading = artistQueries.some(q => q.isLoading);

    const chartData = useMemo(() => {
        if (isLoading || artistQueries.some(q => !q.data)) return null;

        const allData = artistQueries.map(q => q.data || []);
        if (allData.length === 0 || allData[0].length === 0) return null;

        const timestamps = allData[0].map(d => new Date(d.start_time).getTime());

        // Stacked Logic
        const stackedPoints = timestamps.map((ts, i) => {
            let currentY = 0;
            const point: any = { time: ts };

            allData.forEach((artistData, artistIndex) => {
                const dayData = artistData[i];
                // Smooth slightly if needed, or raw
                const value = dayData ? dayData.listens : 0;

                point[`y0_${artistIndex}`] = currentY;
                point[`y1_${artistIndex}`] = currentY + value;
                currentY += value;
            });
            point.total = currentY;
            return point;
        });

        // Normalize if needed, or find max for scaling
        const maxVal = Math.max(...stackedPoints.map(p => p.total)) || 1; // avoid /0

        return { points: stackedPoints, maxVal };
    }, [artistQueries, isLoading]);

    if (isLoading) return <div className="animate-pulse h-[300px] w-full bg-[var(--color-bg-secondary)] rounded-xl opacity-20" />;

    // Empty state
    if (!chartData || !chartData.points.length) {
        return <div className="h-[300px] flex items-center justify-center text-[var(--color-fg-tertiary)]">Insufficient activity data for StreamGraph</div>;
    }

    const { points, maxVal } = chartData;

    // Use viewBox 0 0 100 100 for purely responsive SVG
    const width = 1000;
    const height = 400;

    // Generate paths for each artist (layer)
    const layers = topArtists.map((artist, artistIdx) => {
        // Start bottom left
        let path = `M 0 ${height} `; // Default start

        if (points.length > 0) {
            path = `M 0 ${height - (points[0][`y0_${artistIdx}`] / maxVal) * height} `;
        }

        // Top line L to R
        points.forEach((p, i) => {
            const x = (i / (points.length - 1)) * width;
            const y1 = height - (p[`y1_${artistIdx}`] / maxVal) * height;
            path += `L ${x.toFixed(1)} ${y1.toFixed(1)} `;
        });

        // Bottom line R to L (reverse)
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            const x = (i / (points.length - 1)) * width;
            const y0 = height - (p[`y0_${artistIdx}`] / maxVal) * height;
            path += `L ${x.toFixed(1)} ${y0.toFixed(1)} `;
        }

        path += "Z";
        return { path, artist };
    });

    // Enhanced Palette for 10 items
    const colors = [
        "#3b82f6", // Blue
        "#ec4899", // Pink
        "#eab308", // Yellow
        "#22c55e", // Green
        "#ef4444", // Red
        "#8b5cf6", // Violet
        "#06b6d4", // Cyan
        "#f97316", // Orange
        "#14b8a6", // Teal
        "#6366f1"  // Indigo
    ];

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            <div className="flex-1 relative w-full h-full min-h-[250px]">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full block">
                    {layers.map((layer, i) => (
                        <g key={layer.artist.id} className="group">
                            <path
                                d={layer.path}
                                fill={colors[i % colors.length]}
                                className="opacity-70 group-hover:opacity-100 transition-all duration-300 stroke-[var(--color-bg)] stroke-1"
                            />
                            <title>{layer.artist.name}</title>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Scrollable Legend for Mobile responsiveness */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-[60px] overflow-y-auto px-2">
                {topArtists.map((artist, i) => (
                    <div key={artist.id} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-bg-secondary)] rounded-full text-[10px] sm:text-xs text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="truncate max-w-[80px] sm:max-w-none">{artist.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
