import { useMemo } from "react";

interface WordCloudProps {
    items: any[]; // Expecting artists with 'genres' field
}

export default function WordCloud({ items }: WordCloudProps) {
    const tags = useMemo(() => {
        if (!items) return [];

        const tagCounts: Record<string, number> = {};

        items.forEach(artist => {
            if (artist.genres && Array.isArray(artist.genres)) {
                artist.genres.forEach((genre: string) => {
                    // Clean and normalize genre
                    const clean = genre.toLowerCase().trim();
                    if (!clean) return;
                    tagCounts[clean] = (tagCounts[clean] || 0) + (artist.listen_count || 1);
                });
            }
        });

        // Convert to array
        const sortedTags = Object.entries(tagCounts)
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 30); // Top 30 tags

        // Normalize sizes for display (score 1-5)
        const max = sortedTags[0]?.value || 1;
        const min = sortedTags[sortedTags.length - 1]?.value || 0;

        return sortedTags.map(tag => ({
            ...tag,
            sizeLevel: Math.ceil(((tag.value - min) / (max - min)) * 4) + 1 // 1 to 5 scale
        }));

    }, [items]);

    if (!tags.length) {
        return (
            <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)] flex-col gap-2">
                <p>No genre data available</p>
                <p className="text-xs opacity-50">Try refreshing metadata for your top artists</p>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-center content-center gap-x-4 gap-y-2 p-8 h-full min-h-[300px] select-none">
            {tags.map((tag, i) => {
                // Tailwind classes for sizes
                const sizeClasses = [
                    "text-sm opacity-60 font-normal",      // Level 1
                    "text-base opacity-70 font-medium",     // Level 2
                    "text-lg opacity-80 font-semibold",    // Level 3
                    "text-xl opacity-90 font-bold",        // Level 4
                    "text-3xl opacity-100 font-extrabold"  // Level 5
                ];

                const colorClasses = [
                    "text-[var(--color-fg-secondary)]",
                    "text-[var(--color-fg)]",
                    "text-[var(--color-primary-dim)]",
                    "text-[var(--color-primary)]",
                    "text-[var(--color-primary)] tracking-wide"
                ];

                return (
                    <span
                        key={tag.text}
                        className={`
                            ${sizeClasses[tag.sizeLevel - 1]} 
                            ${colorClasses[tag.sizeLevel - 1]}
                            hover:scale-110 hover:opacity-100 transition-transform cursor-pointer
                        `}
                        style={{
                            // Random slight rotation for word-cloud feel, but kept readable
                            transform: `rotate(${i % 2 === 0 ? '0deg' : (i % 3 === 0 ? '2deg' : '-2deg')})`
                        }}
                    >
                        {tag.text}
                    </span>
                );
            })}
        </div>
    );
}
