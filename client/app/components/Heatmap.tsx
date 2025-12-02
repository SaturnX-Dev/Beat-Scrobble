import { useMemo } from "react";

interface HeatmapProps {
    data?: { day: number; hour: number; count: number }[];
    className?: string;
}

export default function Heatmap({ data = [], className = "" }: HeatmapProps) {
    // Generate a 7x24 grid (Days x Hours)
    const days = ["M", "T", "W", "T", "F", "S", "S"];

    const grid = useMemo(() => {
        const cells = [];
        for (let d = 0; d < 7; d++) {
            const dayRow = [];
            for (let h = 0; h < 24; h++) {
                // Find count for this day/hour
                const item = data.find(item => item.day === d && item.hour === h);
                const count = item ? item.count : 0;

                // Normalize intensity 0-4 based on count (assuming max count ~10 for now, can be dynamic)
                let intensity = 0;
                if (count > 0) intensity = 1;
                if (count > 2) intensity = 2;
                if (count > 5) intensity = 3;
                if (count > 10) intensity = 4;

                dayRow.push(intensity);
            }
            cells.push(dayRow);
        }
        return cells;
    }, [data]);

    const getIntensityClass = (intensity: number) => {
        switch (intensity) {
            case 1: return "bg-[var(--color-primary)]/30";
            case 2: return "bg-[var(--color-primary)]/50";
            case 3: return "bg-[var(--color-primary)]/70";
            case 4: return "bg-[var(--color-primary)]";
            default: return "bg-[var(--color-bg-tertiary)]/30";
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${className} w-full overflow-x-auto custom-scrollbar pb-2`}>
            <div className="min-w-[300px]">
                <div className="flex justify-between text-[10px] text-[var(--color-fg-tertiary)] mb-1 pl-6 pr-1">
                    <span>12am</span>
                    <span>6am</span>
                    <span>12pm</span>
                    <span>6pm</span>
                    <span>11pm</span>
                </div>
                <div className="flex gap-2">
                    <div className="flex flex-col justify-between text-[10px] text-[var(--color-fg-tertiary)] py-0.5 h-[140px]">
                        {days.map((d, i) => <span key={i} className="h-4 leading-4 flex items-center">{d}</span>)}
                    </div>
                    <div className="flex-1 grid grid-rows-7 gap-1 h-[140px]">
                        {grid.map((row, dayIndex) => (
                            <div key={dayIndex} className="grid grid-cols-24 gap-1">
                                {row.map((intensity, hourIndex) => (
                                    <div
                                        key={`${dayIndex}-${hourIndex}`}
                                        className={`rounded-sm ${getIntensityClass(intensity)} hover:ring-1 hover:ring-[var(--color-fg)] transition-all cursor-default`}
                                        title={`Day ${days[dayIndex]}, ${hourIndex}:00 - Activity Level: ${intensity}`}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center gap-2 mt-1 text-[10px] text-[var(--color-fg-tertiary)]">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-[var(--color-bg-tertiary)]/30"></div>
                    <div className="w-3 h-3 rounded-sm bg-[var(--color-primary)]/30"></div>
                    <div className="w-3 h-3 rounded-sm bg-[var(--color-primary)]/50"></div>
                    <div className="w-3 h-3 rounded-sm bg-[var(--color-primary)]/70"></div>
                    <div className="w-3 h-3 rounded-sm bg-[var(--color-primary)]"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
