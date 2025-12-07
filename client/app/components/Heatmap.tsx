import { useMemo } from "react";

interface HeatmapProps {
    data?: { day: number; hour: number; count: number }[];
    className?: string;
}

export default function Heatmap({ data = [], className = "" }: HeatmapProps) {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    const hours = [0, 6, 12, 18, 23];

    const grid = useMemo(() => {
        const cells = [];
        for (let d = 0; d < 7; d++) {
            const dayRow = [];
            for (let h = 0; h < 24; h++) {
                const item = data.find(item => item.day === d && item.hour === h);
                const count = item ? item.count : 0;

                let intensity = 0;
                if (count > 0) intensity = 1;
                if (count > 2) intensity = 2;
                if (count > 5) intensity = 3;
                if (count > 10) intensity = 4;

                dayRow.push({ intensity, count });
            }
            cells.push(dayRow);
        }
        return cells;
    }, [data]);

    const maxCount = useMemo(() => {
        return Math.max(...data.map(d => d.count), 1);
    }, [data]);

    return (
        <div className={`w-full ${className}`}>
            {/* Container con aspect ratio fijo para responsividad */}
            <div className="relative w-full">
                {/* Contenedor scrollable solo en móvil muy pequeño */}
                <div className="overflow-x-auto hide-scrollbar">
                    <div className="min-w-[280px] w-full">
                        {/* Header con horas */}
                        <div className="flex items-end mb-1 sm:mb-1.5">
                            <div className="w-4 sm:w-5 shrink-0" />
                            <div className="flex-1 flex justify-between px-0.5">
                                {hours.map((h) => (
                                    <span key={h} className="text-[8px] sm:text-[9px] text-[var(--color-fg-tertiary)] font-medium opacity-60">
                                        {h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Grid principal */}
                        <div className="flex gap-0.5 sm:gap-1">
                            {/* Labels de días */}
                            <div className="flex flex-col justify-around shrink-0">
                                {days.map((d, i) => (
                                    <span
                                        key={i}
                                        className="text-[8px] sm:text-[9px] font-semibold text-[var(--color-fg-tertiary)] w-4 sm:w-5 text-center opacity-70"
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>

                            {/* Celdas del heatmap */}
                            <div className="flex-1 grid grid-rows-7 gap-[2px] sm:gap-[3px]">
                                {grid.map((row, dayIndex) => (
                                    <div key={dayIndex} className="grid grid-cols-24 gap-[2px] sm:gap-[3px]">
                                        {row.map((cell, hourIndex) => {
                                            const { intensity, count } = cell;
                                            const normalizedIntensity = count / maxCount;

                                            return (
                                                <div
                                                    key={`${dayIndex}-${hourIndex}`}
                                                    className={`
                                                        aspect-square rounded-[2px] sm:rounded-[3px]
                                                        transition-all duration-200 ease-out
                                                        ${intensity > 0
                                                            ? 'hover:scale-[1.8] hover:z-30 cursor-pointer'
                                                            : 'cursor-default'
                                                        }
                                                    `}
                                                    style={{
                                                        backgroundColor: intensity === 0
                                                            ? 'var(--color-bg-tertiary)'
                                                            : `color-mix(in srgb, var(--color-primary) ${Math.max(25, normalizedIntensity * 100)}%, transparent)`,
                                                        opacity: intensity === 0 ? 0.2 : 1,
                                                        boxShadow: intensity > 2
                                                            ? `0 0 ${4 + intensity * 2}px color-mix(in srgb, var(--color-primary) 50%, transparent)`
                                                            : 'none'
                                                    }}
                                                    title={`${days[dayIndex]} ${hourIndex}:00 — ${count} plays`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leyenda compacta */}
                <div className="flex items-center justify-end gap-2 mt-2 sm:mt-3">
                    <span className="text-[8px] sm:text-[9px] text-[var(--color-fg-tertiary)] font-medium opacity-60">Less</span>
                    <div className="flex items-center gap-[3px]">
                        {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
                            <div
                                key={i}
                                className="w-[6px] h-[6px] sm:w-2 sm:h-2 rounded-[1px] sm:rounded-[2px] transition-transform hover:scale-125"
                                style={{
                                    backgroundColor: i === 0
                                        ? 'var(--color-bg-tertiary)'
                                        : `color-mix(in srgb, var(--color-primary) ${level * 100}%, transparent)`,
                                    opacity: i === 0 ? 0.25 : 1
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-[var(--color-fg-tertiary)] font-medium opacity-60">More</span>
                </div>
            </div>
        </div>
    );
}