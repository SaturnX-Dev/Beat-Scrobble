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
        <div className="relative w-full aspect-square max-h-[350px] bg-[var(--color-bg-secondary)]/30 rounded-2xl overflow-hidden">
            {/* Ambient glow background */}
            <div className="absolute inset-0 bg-gradient-radial from-[var(--color-primary)]/5 to-transparent" />

            <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                    {bubbles.map(b => (
                        <clipPath key={`clip-${b.id}`} id={`clip-${b.id}`}>
                            <circle cx={b.x} cy={b.y} r={b.size * 0.45 / 2} />
                        </clipPath>
                    ))}
                </defs>

                {bubbles.map((bubble, index) => {
                    const isHovered = hoveredId === bubble.id;
                    const scale = isHovered ? 1.15 : 1;
                    const r = (bubble.size * 0.45 / 2) * scale;

                    return (
                        <g key={bubble.id}>
                            {/* Glow ring on hover */}
                            {isHovered && (
                                <circle
                                    cx={bubble.x}
                                    cy={bubble.y}
                                    r={r + 2}
                                    fill="none"
                                    stroke="var(--color-primary)"
                                    strokeWidth="1"
                                    opacity="0.6"
                                    className="animate-pulse"
                                />
                            )}

                            {/* Main circle */}
                            <Link to={`/artist/${bubble.id}`}>
                                <circle
                                    cx={bubble.x}
                                    cy={bubble.y}
                                    r={r}
                                    fill={bubble.image ? `url(#img-pattern-${bubble.id})` : "var(--color-bg-tertiary)"}
                                    stroke="var(--color-bg-secondary)"
                                    strokeWidth="2"
                                    className="transition-all duration-200 cursor-pointer group-hover:stroke-[var(--color-primary)] group-hover:stroke-4"
                                    style={{
                                        filter: isHovered ? 'drop-shadow(0 0 8px var(--color-primary))' : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredId(bubble.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                />
                                {/* Image */}
                                {bubble.image && (
                                    <image
                                        href={imageUrl(bubble.image, "small")}
                                        x={bubble.x - r}
                                        y={bubble.y - r}
                                        width={r * 2}
                                        height={r * 2}
                                        clipPath={`url(#clip-${bubble.id})`}
                                        className="transition-all duration-200"
                                        style={{
                                            transform: `scale(${scale})`,
                                            transformOrigin: `${bubble.x}px ${bubble.y}px`
                                        }}
                                        onMouseEnter={() => setHoveredId(bubble.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    />
                                )}
                            </Link>
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {hoveredId && bubbles.find(b => b.id === hoveredId) && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 shadow-xl z-20">
                    <p className="text-sm font-bold text-[var(--color-fg)]">
                        {bubbles.find(b => b.id === hoveredId)?.name}
                    </p>
                    <p className="text-xs text-[var(--color-primary)]">
                        {bubbles.find(b => b.id === hoveredId)?.count.toLocaleString()} plays
                    </p>
                </div>
            )}
        </div>
    );
}
