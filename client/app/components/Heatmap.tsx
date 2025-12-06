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
        // Dynamic intensity based on theme variables
        if (intensity === 0) return { bg: 'bg-[var(--color-bg-tertiary)]/20', opacity: 'opacity-100' };

        // Return styles for inline application if needed, or classes
        // Note: Tailwind arbitrary values with CSS vars are powerful
        switch (intensity) {
            case 1: return { bg: 'bg-[var(--color-primary)]', opacity: 'opacity-30' };
            case 2: return { bg: 'bg-[var(--color-primary)]', opacity: 'opacity-50' };
            case 3: return { bg: 'bg-[var(--color-primary)]', opacity: 'opacity-70' };
            case 4: return { bg: 'bg-[var(--color-primary)]', opacity: 'opacity-100' };
            default: return { bg: 'bg-[var(--color-bg-tertiary)]', opacity: 'opacity-20' };
        }
    };

    return (
        <div className={`flex flex-col gap-4 ${className} w-full`}>
            {/* Scrollable Container with Fade Masks */}
            <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--color-bg-secondary)] to-transparent z-10 pointer-events-none lg:hidden" />
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--color-bg-secondary)] to-transparent z-10 pointer-events-none lg:hidden" />

                <div className="overflow-x-auto hide-scrollbar pb-2">
                    <div className="min-w-[320px] pr-2">
                        {/* Hours Labels */}
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-[var(--color-fg-tertiary)] mb-2 pl-8 font-medium">
                            <span>12am</span>
                            <span>6am</span>
                            <span>12pm</span>
                            <span>6pm</span>
                            <span>11pm</span>
                        </div>

                        <div className="flex gap-3">
                            {/* Days Axis */}
                            <div className="flex flex-col justify-between text-[10px] font-bold text-[var(--color-fg-secondary)] py-[2px] h-[160px]">
                                {days.map((d, i) => <span key={i} className="h-4 flex items-center justify-center w-4">{d}</span>)}
                            </div>

                            {/* Grid */}
                            <div className="flex-1 grid grid-rows-7 gap-1.5 h-[160px]">
                                {grid.map((row, dayIndex) => (
                                    <div key={dayIndex} className="grid grid-cols-24 gap-1.5">
                                        {row.map((intensity, hourIndex) => {
                                            const style = getIntensityClass(intensity);
                                            return (
                                                <div
                                                    key={`${dayIndex}-${hourIndex}`}
                                                    className={`
                                                        rounded-[2px] sm:rounded-sm 
                                                        ${style.bg} 
                                                        transition-all duration-300
                                                        ${intensity > 0 ? style.opacity : 'opacity-20'}
                                                        ${intensity > 0 ? 'hover:scale-150 hover:z-20 hover:shadow-[0_0_8px_var(--color-primary)]' : ''}
                                                        cursor-help
                                                    `}
                                                    title={`Day ${days[dayIndex]}, ${hourIndex}:00 - Activity Level: ${intensity}`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-end items-center gap-3 mt-1 text-[10px] font-medium text-[var(--color-fg-tertiary)]">
                <span>Less</span>
                <div className="flex gap-1.5 p-1 bg-[var(--color-bg-tertiary)]/20 rounded-full">
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={`w-2.5 h-2.5 rounded-[2px] bg-[var(--color-primary)] transition-all`}
                            style={{ opacity: level === 0 ? 0.1 : 0.2 + (level * 0.2) }}
                        />
                    ))}
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
