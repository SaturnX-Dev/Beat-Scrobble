import { useQuery } from "@tanstack/react-query";
import { getLastListens } from "api/api";
import { useMemo } from "react";

interface ScatterPlotProps {
    period: string;
    height?: number;
}

export default function ScatterPlot({ period, height = 400 }: ScatterPlotProps) {
    // Fetch recent history (up to 1000 items to get a good scatter)
    const { data: historyData, isLoading } = useQuery({
        queryKey: ['scatter-history', period],
        queryFn: () => getLastListens({
            limit: 1000,
            period: period,
            page: 1
        }),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const points = useMemo(() => {
        if (!historyData?.items) return [];

        return historyData.items.map(listen => {
            const date = new Date(listen.time);
            return {
                id: listen.track.id + listen.time,
                time: date,
                hour: date.getHours() + (date.getMinutes() / 60),
                artist: listen.track.artists[0]?.name || "Unknown",
                track: listen.track.title,
                day: date.getDay(), // 0-6
                dateStr: date.toLocaleDateString(),
                timestamp: date.getTime()
            };
        });
    }, [historyData]);

    if (isLoading) return <div className="animate-pulse h-full w-full bg-[var(--color-bg-secondary)] rounded-xl opacity-50" />;
    if (!points.length) return null;

    // Calculate variations for color mapping (simple hash)
    const getColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    // Scales
    const minTime = Math.min(...points.map(p => p.timestamp));
    const maxTime = Math.max(...points.map(p => p.timestamp));
    const timeRange = maxTime - minTime;

    return (
        <div className="w-full h-full min-h-[400px] flex flex-col font-sans">
            <div className="flex-1 relative w-full h-full">
                <svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none" className="overflow-visible">
                    {/* Grid Lines - Hours */}
                    {[0, 6, 12, 18, 24].map(h => (
                        <g key={h}>
                            <line
                                x1="0" y1={h * (400 / 24)}
                                x2="1000" y2={h * (400 / 24)}
                                stroke="var(--color-bg-tertiary)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            <text
                                x="-10" y={h * (400 / 24) + 4}
                                textAnchor="end"
                                className="text-[10px] fill-[var(--color-fg-secondary)]"
                            >
                                {h}:00
                            </text>
                        </g>
                    ))}

                    {/* Points */}
                    {points.map((p) => {
                        // X position based on time (0 to 1000)
                        const x = ((p.timestamp - minTime) / timeRange) * 1000;
                        // Y position based on hour (0 to 24 mapped to 0 to 400)
                        const y = p.hour * (400 / 24);

                        return (
                            <circle
                                key={p.id}
                                cx={x}
                                cy={y}
                                r={3} // Base size
                                fill="var(--color-primary)" // Default theme color
                                fillOpacity={0.6}
                                className="hover:r-2 transition-all duration-300"
                            >
                                <title>{`${p.track} by ${p.artist} at ${p.time.toLocaleString()}`}</title>
                            </circle>
                        );
                    })}
                </svg>
            </div>
            <div className="text-center text-xs text-[var(--color-fg-tertiary)] mt-2">
                Listening History (Time of Day)
            </div>
        </div>
    );
}
