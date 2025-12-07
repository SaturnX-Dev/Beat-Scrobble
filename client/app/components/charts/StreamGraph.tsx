import { useQueries, useQuery } from "@tanstack/react-query";
import { getActivity, type ListenActivityItem } from "api/api";
import { useMemo } from "react";

interface StreamGraphProps {
    items: any[]; // Top artists
    period: string; // "week", "month", etc.
}

export default function StreamGraph({ items, period }: StreamGraphProps) {
    // Take top 5 artists
    const topArtists = items.slice(0, 5);

    // Prepare queries for each artist's activity
    // We'll use 'day' step for smoothness
    const artistQueries = useQueries({
        queries: topArtists.map(artist => ({
            queryKey: ['activity', artist.id, period],
            queryFn: () => getActivity({
                step: 'day',
                range: period === 'year' ? 365 : 30, // Simplified range logic
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

        // Determine all unique dates/timestamps across all data
        // Assuming all queries return similar time ranges if successful
        const allData = artistQueries.map(q => q.data || []);
        if (allData.length === 0 || allData[0].length === 0) return null;

        const timestamps = allData[0].map(d => new Date(d.start_time).getTime());

        // Construct stacked data
        // For streamgraph, we usually center it, but simple stacked area is safer for now
        // Structure: [{ time, y0_0, y1_0, ... }]

        const stackedPoints = timestamps.map((ts, i) => {
            let currentY = 0;
            const point: any = { time: ts };

            allData.forEach((artistData, artistIndex) => {
                const dayData = artistData[i];
                const value = dayData ? dayData.listens : 0;

                point[`y0_${artistIndex}`] = currentY;
                point[`y1_${artistIndex}`] = currentY + value;
                currentY += value; // Stack up
            });
            point.total = currentY;
            return point;
        });

        // Smooth paths? SVG polygon/path construction
        return { points: stackedPoints, maxVal: Math.max(...stackedPoints.map(p => p.total)) };
    }, [artistQueries, isLoading]);

    if (isLoading) return <div className="animate-pulse h-64 bg-[var(--color-bg-secondary)] rounded-xl opacity-20" />;
    if (!chartData) return <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">Not enough data for streamgraph</div>;

    const { points, maxVal } = chartData;
    const width = 800;
    const height = 300;

    // Generate paths for each artist (layer)
    const layers = topArtists.map((artist, artistIdx) => {
        // Construct SVG path "d" attribute
        // Move to first point bottom
        let path = `M 0 ${height - (points[0][`y0_${artistIdx}`] / maxVal) * height} `;

        // Line top
        points.forEach((p, i) => {
            const x = (i / (points.length - 1)) * width;
            const y1 = height - (p[`y1_${artistIdx}`] / maxVal) * height;
            path += `L ${x} ${y1} `;
        });

        // Line bottom reverse
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            const x = (i / (points.length - 1)) * width;
            const y0 = height - (p[`y0_${artistIdx}`] / maxVal) * height;
            path += `L ${x} ${y0} `;
        }

        path += "Z"; // Close
        return { path, artist };
    });

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]; // Standard vivid palette for distinction

    return (
        <div className="w-full h-full min-h-[300px] relative">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
                {layers.map((layer, i) => (
                    <g key={layer.artist.id} className="group">
                        <path
                            d={layer.path}
                            fill={colors[i % colors.length]}
                            className="opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <title>{layer.artist.name}</title>
                    </g>
                ))}
            </svg>

            {/* Legend */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 bg-black/40 p-2 rounded backdrop-blur-md">
                {topArtists.map((artist, i) => (
                    <div key={artist.id} className="flex items-center gap-2 text-[10px] text-white">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        {artist.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
