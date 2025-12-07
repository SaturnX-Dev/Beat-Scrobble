import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivity, type getActivityArgs } from "api/api";
import { TrendingUp } from "lucide-react";

interface ListeningTrendsProps {
    period?: string;
    range?: number;
    artistId?: number;
    albumId?: number;
    trackId?: number;
    height?: number;
}

export default function ListeningTrends({
    period = "month",
    range = 30,
    artistId = 0,
    albumId = 0,
    trackId = 0,
    height = 120
}: ListeningTrendsProps) {
    const { data, isPending, isError } = useQuery({
        queryKey: ["listening-trends", { step: "day", range, artist_id: artistId, album_id: albumId, track_id: trackId }],
        queryFn: ({ queryKey }) => getActivity(queryKey[1] as getActivityArgs),
    });

    const chartData = useMemo(() => {
        if (!data?.length) return { points: "", areaPath: "", maxY: 0, labels: [] };

        const maxListens = Math.max(...data.map(d => d.listens), 1);
        const width = 100; // percentage width
        const paddingX = 2;
        const usableWidth = width - (paddingX * 2);

        const points: string[] = [];
        const areaPoints: string[] = [];
        const labels: { x: number; label: string; listens: number }[] = [];

        data.forEach((item, i) => {
            const x = paddingX + (i / (data.length - 1 || 1)) * usableWidth;
            const y = 100 - ((item.listens / maxListens) * 85 + 5); // 5% padding top/bottom

            points.push(`${x},${y}`);
            areaPoints.push(`${x},${y}`);

            // Add labels for first, middle, and last
            if (i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) {
                const date = new Date(item.start_time);
                labels.push({
                    x,
                    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    listens: item.listens
                });
            }
        });

        // Create area path (closed polygon)
        const areaPath = `M ${paddingX},100 L ${areaPoints.join(' L ')} L ${100 - paddingX},100 Z`;

        return {
            points: points.join(' '),
            areaPath,
            maxY: maxListens,
            labels
        };
    }, [data]);

    if (isPending) {
        return (
            <div className="w-full flex items-center justify-center" style={{ height }}>
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] animate-spin" />
            </div>
        );
    }

    if (isError || !data?.length) {
        return (
            <div className="w-full flex items-center justify-center text-[var(--color-fg-tertiary)]" style={{ height }}>
                <span className="text-xs">No trend data available</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Chart */}
            <div className="relative w-full" style={{ height }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="1" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                        </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[25, 50, 75].map(y => (
                        <line
                            key={y}
                            x1="2" y1={y} x2="98" y2={y}
                            stroke="var(--color-bg-tertiary)"
                            strokeWidth="0.3"
                            strokeDasharray="2,2"
                        />
                    ))}

                    {/* Area Fill */}
                    <path
                        d={chartData.areaPath}
                        fill="url(#trendGradient)"
                        className="transition-all duration-500"
                    />

                    {/* Line */}
                    <polyline
                        points={chartData.points}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-500"
                    />

                    {/* Glow Effect */}
                    <polyline
                        points={chartData.points}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.2"
                        filter="blur(3px)"
                    />
                </svg>

                {/* Y-axis max label */}
                <div className="absolute top-1 right-2 text-[9px] text-[var(--color-fg-tertiary)] font-medium">
                    {chartData.maxY.toLocaleString()} max
                </div>
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between px-2 mt-1">
                {chartData.labels.map((label, i) => (
                    <span key={i} className="text-[9px] text-[var(--color-fg-tertiary)]">
                        {label.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
