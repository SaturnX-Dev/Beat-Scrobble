import { useQuery } from "@tanstack/react-query";
import { getLastListens } from "api/api";
import { useMemo } from "react";

interface ScatterPlotProps {
    period: string;
    height?: number;
}

export default function ScatterPlot({ period, height = 400 }: ScatterPlotProps) {
    // Fetch recent history (up to 1000 items)
    const { data: historyData, isLoading } = useQuery({
        queryKey: ['scatter-history', period],
        queryFn: () => getLastListens({
            limit: 1000,
            period: period,
            page: 1
        }),
        staleTime: 1000 * 60 * 5,
    });

    const points = useMemo(() => {
        if (!historyData?.items) return [];

        return historyData.items.map(listen => {
            const date = new Date(listen.time);
            return {
                id: listen.track.id + listen.time,
                time: date,
                // Y Axis: Hour of day (0-24)
                hour: date.getHours() + (date.getMinutes() / 60),
                artist: listen.track.artists[0]?.name || "Unknown",
                track: listen.track.title,
                timestamp: date.getTime()
            };
        });
    }, [historyData]);

    if (isLoading) return <div className="animate-pulse h-full w-full bg-[var(--color-bg-secondary)] rounded-xl opacity-50" />;
    if (!points.length) return <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">No data</div>;

    // Scales
    const minTime = Math.min(...points.map(p => p.timestamp));
    const maxTime = Math.max(...points.map(p => p.timestamp));
    const timeRange = maxTime - minTime;

    // Add 5% padding to X axis
    const padding = timeRange * 0.05;
    const xMin = minTime - padding;
    const xMax = maxTime + padding;
    const xRange = xMax - xMin;

    return (
        <div className="w-full h-full min-h-[350px] flex flex-col font-sans">
            {/* Legend / Axis Labels */}
            <div className="flex justify-between text-[10px] text-[var(--color-fg-tertiary)] mb-2 px-2 uppercase tracking-wider font-semibold">
                <span>Morning (6 AM)</span>
                <span>Noon (12 PM)</span>
                <span>Evening (6 PM)</span>
                <span>Night (12 AM)</span>
            </div>

            <div className="flex-1 relative w-full h-full">
                {/* Use percentages for responsiveness instead of fixed viewBox pixels */}
                <svg width="100%" height="100%" className="overflow-visible">
                    {/* Background Grid - Hours */}
                    {[6, 12, 18, 24].map(h => {
                        const yPct = (h / 24) * 100;
                        return (
                            <g key={h}>
                                <line
                                    x1="0%" y1={`${yPct}%`}
                                    x2="100%" y2={`${yPct}%`}
                                    stroke="var(--color-bg-tertiary)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                            </g>
                        );
                    })}

                    {/* Points */}
                    {points.map((p) => {
                        // X as percentage
                        const xPct = ((p.timestamp - xMin) / xRange) * 100;
                        // Y as percentage
                        const yPct = (p.hour / 24) * 100;

                        return (
                            <circle
                                key={p.id}
                                cx={`${xPct}%`}
                                cy={`${yPct}%`}
                                r={3.5}
                                fill="var(--color-primary)"
                                fillOpacity={0.5}
                                className="hover:r-6 hover:fill-white hover:fill-opacity-100 transition-all duration-300 cursor-pointer"
                            >
                                <title>{`${p.track} · ${p.artist}\n${p.time.toLocaleDateString()} ${p.time.toLocaleTimeString()}`}</title>
                            </circle>
                        );
                    })}
                </svg>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--color-fg-tertiary)] mt-2 px-2 border-t border-[var(--color-bg-tertiary)] pt-2">
                <span>{new Date(minTime).toLocaleDateString()}</span>
                <span className="opacity-50 font-medium uppercase tracking-widest">Time →</span>
                <span>{new Date(maxTime).toLocaleDateString()}</span>
            </div>
        </div>
    );
}
