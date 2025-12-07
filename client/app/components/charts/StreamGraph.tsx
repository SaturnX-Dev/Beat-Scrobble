import { useQueries } from "@tanstack/react-query";
import { getActivity } from "api/api";
import { useMemo, useState, useRef } from "react";

interface StreamGraphProps {
    items: any[]; // Top artists
    period: string; // "week", "month", etc.
}

// Premium Palette
const COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#14b8a6", // Teal
];

// Helper: Generate Smooth Path (Catmull-Rom-like via Cubic Bezier)
// This is a simplified smoothing ensuring C continuity
function getSmoothPath(points: { x: number, y: number }[], closeBottomPoints?: { x: number, y: number }[]): string {
    if (points.length < 2) return "";

    const format = (n: number) => n.toFixed(1);

    let d = `M ${format(points[0].x)} ${format(points[0].y)}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${format(cp1x)} ${format(cp1y)}, ${format(cp2x)} ${format(cp2y)}, ${format(p2.x)} ${format(p2.y)}`;
    }

    if (closeBottomPoints) {
        // Line to first bottom point
        d += ` L ${format(closeBottomPoints[0].x)} ${format(closeBottomPoints[0].y)}`;

        // Curve back along bottom points (reversed)
        for (let i = 0; i < closeBottomPoints.length - 1; i++) {
            const p0 = closeBottomPoints[i === 0 ? 0 : i - 1];
            const p1 = closeBottomPoints[i];
            const p2 = closeBottomPoints[i + 1];
            const p3 = closeBottomPoints[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${format(cp1x)} ${format(cp1y)}, ${format(cp2x)} ${format(cp2y)}, ${format(p2.x)} ${format(p2.y)}`;
        }
        d += " Z";
    }

    return d;
}


export default function StreamGraph({ items, period }: StreamGraphProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipData, setTooltipData] = useState<{ x: number, y: number, artists: any[] } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Increase to Top 10 as requested
    const topArtists = useMemo(() => items.slice(0, 10), [items]);

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

        // 1. Calculate Totals per Day for Centering
        const dailyTotals = timestamps.map((_, dayIdx) => {
            return allData.reduce((sum, artistList) => sum + (artistList[dayIdx]?.listens || 0), 0);
        });

        // 2. Build Stacked Points (Centered / Silhouette)
        // We track the strict Max Y value (distance from center) to determine chart height
        let maxDistanceFromCenter = 0;

        const layers = topArtists.map((artist, artistIdx) => {
            const points: { x: number, y0: number, y1: number, raw: number, data: any }[] = [];

            timestamps.forEach((ts, dayIdx) => {
                const total = dailyTotals[dayIdx];
                // Start stack at -total/2 to center it around 0
                let currentY = -total / 2;

                // Add up previous artists to find our start Y
                for (let k = 0; k < artistIdx; k++) {
                    currentY += (allData[k][dayIdx]?.listens || 0);
                }

                const value = allData[artistIdx][dayIdx]?.listens || 0;
                const y0 = currentY;
                const y1 = currentY + value;

                points.push({
                    x: dayIdx, // Use index as X for uniform spacing
                    y0,
                    y1,
                    raw: value,
                    data: allData[artistIdx][dayIdx]
                });

                maxDistanceFromCenter = Math.max(maxDistanceFromCenter, Math.abs(y0), Math.abs(y1));
            });

            return { artist, points, color: COLORS[artistIdx % COLORS.length] };
        });

        return { layers, timestamps, maxVal: maxDistanceFromCenter * 1.1 }; // 10% padding
    }, [artistQueries, isLoading, topArtists]);

    if (isLoading) return <div className="animate-pulse h-[300px] w-full bg-[var(--color-bg-secondary)] rounded-xl opacity-20" />;

    // Empty state
    if (!chartData || !chartData.layers.length || !chartData.timestamps.length) {
        return <div className="h-[300px] flex items-center justify-center text-[var(--color-fg-tertiary)]">Insufficient activity data for StreamGraph</div>;
    }

    const { layers, maxVal, timestamps } = chartData;
    const width = 1000;
    const height = 400;
    const paddingY = 20;

    // Y-Scale: Maps values [-maxVal, maxVal] to [height-padding, padding]
    const scaleY = (val: number) => {
        const normalized = (val + maxVal) / (maxVal * 2); // 0 to 1
        return height - (normalized * height);
    };

    // X-Scale: Maps index to width
    const scaleX = (idx: number) => (idx / (timestamps.length - 1)) * width;

    // Create Paths
    const calculatedLayers = layers.map(layer => {
        const topPoints = layer.points.map(p => ({ x: scaleX(p.x), y: scaleY(p.y1) }));
        const bottomPoints = layer.points.map(p => ({ x: scaleX(p.x), y: scaleY(p.y0) })).reverse(); // Reverse for closing path

        return {
            ...layer,
            d: getSmoothPath(topPoints, bottomPoints)
        };
    });

    // Mouse Move Handler
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const relativeX = (x / rect.width); // 0 to 1

        const index = Math.min(Math.max(Math.round(relativeX * (timestamps.length - 1)), 0), timestamps.length - 1);

        // Find artists with values > 0 at this index
        const activeArtists = layers
            .map(l => ({
                artist: l.artist,
                value: l.points[index].raw,
                color: l.color
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        if (activeArtists.length > 0) {
            setHoveredIndex(index);
            setTooltipData({ x: x, y: e.clientY - rect.top, artists: activeArtists });
        } else {
            setTooltipData(null);
            setHoveredIndex(null);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
        setTooltipData(null);
    };

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            <div
                ref={containerRef}
                className="flex-1 relative w-full h-full min-h-[250px] cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full block">
                    <defs>
                        {calculatedLayers.map((layer, i) => (
                            <linearGradient key={`grad-${layer.artist.id}`} id={`grad-${layer.artist.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={layer.color} stopOpacity="0.9" />
                                <stop offset="100%" stopColor={layer.color} stopOpacity="0.4" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Background Guide Lines (Optional) */}
                    <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />

                    {calculatedLayers.map((layer, i) => (
                        <path
                            key={layer.artist.id}
                            d={layer.d}
                            fill={`url(#grad-${layer.artist.id})`}
                            stroke={layer.color}
                            strokeWidth={0.5}
                            className="transition-opacity duration-300 hover:opacity-100"
                            style={{ opacity: hoveredIndex !== null && !tooltipData?.artists.find(a => a.artist.id === layer.artist.id) ? 0.3 : 0.8 }}
                        />
                    ))}

                    {/* Hover Line */}
                    {hoveredIndex !== null && (
                        <line
                            x1={scaleX(hoveredIndex)}
                            y1={0}
                            x2={scaleX(hoveredIndex)}
                            y2={height}
                            stroke="white"
                            strokeOpacity="0.5"
                            strokeWidth="1"
                        />
                    )}
                </svg>

                {/* Interactive Tooltip */}
                {tooltipData && (
                    <div
                        className="absolute z-10 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-3 rounded-lg shadow-xl pointer-events-none min-w-[150px]"
                        style={{
                            left: Math.min(Math.max(tooltipData.x, 150), containerRef.current!.offsetWidth - 150),
                            top: 20
                        }}
                    >
                        <div className="text-xs text-[var(--color-fg-tertiary)] mb-2 font-medium">
                            {new Date(timestamps[hoveredIndex!]).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex flex-col gap-1">
                            {tooltipData.artists.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[var(--color-fg-secondary)] truncate max-w-[100px]">{item.artist.name}</span>
                                    </div>
                                    <span className="font-bold text-[var(--color-fg-primary)]">{item.value}</span>
                                </div>
                            ))}
                            {tooltipData.artists.length > 5 && (
                                <div className="text-[10px] text-[var(--color-fg-tertiary)] mt-1">
                                    + {tooltipData.artists.length - 5} more
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable Legend */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-h-[60px] overflow-y-auto px-2">
                {topArtists.map((artist, i) => (
                    <div key={artist.id} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--color-bg-secondary)] rounded-full text-[10px] sm:text-xs text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors cursor-default">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[80px] sm:max-w-none">{artist.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
