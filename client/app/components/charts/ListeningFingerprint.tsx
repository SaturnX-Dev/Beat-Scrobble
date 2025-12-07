import { useMemo } from "react";

interface ListeningFingerprintProps {
    consistency?: number;   // 0-100
    discovery?: number;     // 0-100
    variance?: number;      // 0-100
    concentration?: number; // 0-100
    replay?: number;        // 0-100
}

export default function ListeningFingerprint({
    consistency = 75,
    discovery = 60,
    variance = 50,
    concentration = 80,
    replay = 40
}: ListeningFingerprintProps) {

    const size = 300;
    const center = size / 2;
    const radius = 100; // max radius

    const metrics = useMemo(() => [
        { label: "Consistency", value: consistency },
        { label: "Discovery Rate", value: discovery },
        { label: "Variance", value: variance },
        { label: "Concentration", value: concentration },
        { label: "Replay Rate", value: replay },
    ], [consistency, discovery, variance, concentration, replay]);

    const numPoints = metrics.length;

    // Helper to get coordinates
    const getCoords = (value: number, index: number, maxR: number) => {
        const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2;
        const r = (value / 100) * maxR;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return { x, y };
    };

    // Generate web points
    const webLevels = [25, 50, 75, 100];

    // Generate data path
    const dataPoints = metrics.map((m, i) => getCoords(m.value, i, radius));
    const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-[400px] aspect-square">
                <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>

                    {/* Web Background */}
                    {webLevels.map((level, i) => {
                        const points = metrics.map((_, idx) => {
                            const { x, y } = getCoords(level, idx, radius);
                            return `${x},${y}`;
                        }).join(" ");

                        return (
                            <polygon
                                key={`web-${level}`}
                                points={points}
                                fill="none"
                                stroke="var(--color-bg-tertiary)"
                                strokeWidth="1"
                                strokeDasharray={i === webLevels.length - 1 ? "0" : "4 4"}
                            />
                        );
                    })}

                    {/* Axis Lines */}
                    {metrics.map((_, i) => {
                        const { x, y } = getCoords(100, i, radius);
                        return (
                            <line
                                key={`axis-${i}`}
                                x1={center}
                                y1={center}
                                x2={x}
                                y2={y}
                                stroke="var(--color-bg-tertiary)"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* Data Polygon */}
                    <polygon
                        points={polyPoints}
                        fill="var(--color-primary)"
                        fillOpacity="0.2"
                        stroke="var(--color-primary)"
                        strokeWidth="2"
                        className="drop-shadow-lg filter"
                    />

                    {/* Data Points */}
                    {dataPoints.map((p, i) => (
                        <circle
                            key={`pt-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="var(--color-bg-secondary)"
                            stroke="var(--color-primary)"
                            strokeWidth="2"
                        />
                    ))}

                    {/* Labels */}
                    {metrics.map((m, i) => {
                        // Push labels out a bit further than radius
                        const { x, y } = getCoords(120, i, radius);

                        // Determine text anchor based on position
                        let anchor = "middle";
                        if (i === 1) anchor = "start"; // Right
                        if (i === 4) anchor = "end";   // Left

                        return (
                            <text
                                key={`label-${i}`}
                                x={x}
                                y={y}
                                textAnchor={anchor}
                                dominantBaseline="middle"
                                fill="var(--color-fg-secondary)"
                                fontSize="10"
                                className="font-medium uppercase tracking-wide"
                            >
                                {m.label}
                            </text>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
