import { useMemo, useState } from "react";
import { Link } from "react-router";
import { imageUrl } from "api/api";

interface BubbleItem {
    id: number;
    name: string;
    image?: string;
    listen_count: number;
}

interface ArtistBubblesProps {
    items: BubbleItem[];
    maxItems?: number;
}

interface Bubble {
    id: number;
    name: string;
    image?: string;
    count: number;
    size: number;
    x: number;
    y: number;
}

export default function ArtistBubbles({ items, maxItems = 15 }: ArtistBubblesProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const bubbles = useMemo(() => {
        if (!items?.length) return [];

        const displayItems = items.slice(0, maxItems);
        const maxCount = Math.max(...displayItems.map(i => i.listen_count), 1);
        const minSize = 32;
        const maxSize = 80;

        // Simple circle packing algorithm
        const packed: Bubble[] = [];
        const width = 100;
        const height = 100;

        displayItems.forEach((item, index) => {
            const normalizedCount = item.listen_count / maxCount;
            const size = minSize + normalizedCount * (maxSize - minSize);

            // Try to place bubble without overlap
            let placed = false;
            let attempts = 0;
            let x = 0, y = 0;

            while (!placed && attempts < 100) {
                // Spiral placement from center
                const angle = (index * 0.7 + attempts * 0.3) * Math.PI;
                const radius = 10 + (attempts * 2) + (index * 3);
                x = 50 + Math.cos(angle) * radius;
                y = 50 + Math.sin(angle) * radius;

                // Check bounds
                const halfSize = (size / 2) * 0.5; // Account for viewport scaling
                if (x - halfSize < 5 || x + halfSize > 95 || y - halfSize < 5 || y + halfSize > 95) {
                    attempts++;
                    continue;
                }

                // Check overlap with existing bubbles (simplified)
                const hasOverlap = packed.some(b => {
                    const dist = Math.hypot(b.x - x, b.y - y);
                    const minDist = ((b.size + size) / 2) * 0.45;
                    return dist < minDist;
                });

                if (!hasOverlap) {
                    placed = true;
                } else {
                    attempts++;
                }
            }

            packed.push({
                id: item.id,
                name: item.name,
                image: item.image,
                count: item.listen_count,
                size,
                x: placed ? x : 50 + (Math.random() - 0.5) * 60,
                y: placed ? y : 50 + (Math.random() - 0.5) * 60
            });
        });

        return packed;
    }, [items, maxItems]);

    if (!bubbles.length) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                <span className="text-sm">No artist data</span>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-square max-h-[350px] bg-[var(--color-bg-secondary)]/30 rounded-2xl overflow-hidden group/container">
            {/* Ambient glow background */}
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-primary)]/5 to-transparent" />

            <style>{`
                @keyframes coin-entry {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    70% { transform: scale(0.95); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .bubble-entry {
                    animation: coin-entry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>

            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    {bubbles.map(b => (
                        <clipPath key={`clip-${b.id}`} id={`clip-${b.id}`}>
                            <circle cx={b.x} cy={b.y} r={b.size * 0.45 / 2} />
                        </clipPath>
                    ))}
                    {bubbles.map(b => b.image ? (
                        <pattern key={`img-pattern-${b.id}`} id={`img-pattern-${b.id}`} patternUnits="userSpaceOnUse" width="100" height="100">
                            <image
                                href={imageUrl(b.image, "large")}
                                x={b.x - (b.size * 0.45 / 2)}
                                y={b.y - (b.size * 0.45 / 2)}
                                width={b.size * 0.45}
                                height={b.size * 0.45}
                                preserveAspectRatio="xMidYMid slice"
                            />
                        </pattern>
                    ) : null)}
                </defs>

                {bubbles.map((bubble, index) => {
                    const isHovered = hoveredId === bubble.id;
                    const scale = isHovered ? 1.15 : 1;
                    const r = (bubble.size * 0.45 / 2) * scale;
                    // Add slight delay based on index for staggered entry
                    const delay = index * 50;

                    return (
                        <g
                            key={bubble.id}
                            style={{ animationDelay: `${delay}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}
                            className="bubble-entry opacity-0"
                        >
                            <Link to={`/artist/${bubble.id}`}>
                                {/* Shadow/Glow behind */}
                                <circle
                                    cx={bubble.x}
                                    cy={bubble.y}
                                    r={r}
                                    fill="black"
                                    opacity="0.2"
                                    className="transition-all duration-300"
                                    style={{
                                        filter: 'blur(3px)',
                                        transform: isHovered ? 'translateY(2px) scale(1.05)' : 'translateY(1px)'
                                    }}
                                />

                                {/* Main Bubble Circle */}
                                <circle
                                    cx={bubble.x}
                                    cy={bubble.y}
                                    r={r}
                                    fill={bubble.image ? `url(#img-pattern-${bubble.id})` : "var(--color-bg-tertiary)"}
                                    stroke="var(--color-bg-secondary)"
                                    strokeWidth="1.5"
                                    className="transition-all duration-300 ease-spring cursor-pointer"
                                    style={{
                                        filter: isHovered ? 'brightness(1.1) contrast(1.1)' : 'none',
                                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                    onMouseEnter={() => setHoveredId(bubble.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                />

                                {/* Inner Border / Highlight */}
                                <circle
                                    cx={bubble.x}
                                    cy={bubble.y}
                                    r={r}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="1"
                                    opacity={isHovered ? 0.3 : 0.1}
                                    className="pointer-events-none transition-opacity duration-300"
                                />
                            </Link>
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hoveredId && bubbles.find(b => b.id === hoveredId) && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/90 backdrop-blur border border-[var(--color-bg-tertiary)] rounded-full px-4 py-2 shadow-xl z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-[var(--color-fg)] whitespace-nowrap">
                            {bubbles.find(b => b.id === hoveredId)?.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-primary)] font-bold">
                            {bubbles.find(b => b.id === hoveredId)?.count.toLocaleString()} plays
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
