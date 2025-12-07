import { Link } from "react-router";
import { imageUrl } from "api/api";
import { User, Disc, Music } from "lucide-react";

interface TopListItem {
    id: number;
    name?: string;
    title?: string;
    image?: string;
    listen_count?: number;
    artist?: string;
    artists?: { name: string }[];
}

interface TopListChartProps {
    items: TopListItem[];
    type: 'artist' | 'album' | 'track';
    maxItems?: number;
    showRank?: boolean;
    compact?: boolean;
}

export default function TopListChart({
    items,
    type,
    maxItems = 10,
    showRank = true,
    compact = false
}: TopListChartProps) {
    if (!items?.length) {
        return (
            <div className="w-full py-8 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                <span className="text-sm">No data available</span>
            </div>
        );
    }

    const displayItems = items.slice(0, maxItems);
    const maxCount = Math.max(...displayItems.map(i => i.listen_count || 0), 1);

    const getLink = (item: TopListItem) => {
        switch (type) {
            case 'artist': return `/artist/${item.id}`;
            case 'album': return `/album/${item.id}`;
            case 'track': return `/track/${item.id}`;
        }
    };

    const getName = (item: TopListItem) => item.name || item.title || 'Unknown';

    const getSubtitle = (item: TopListItem) => {
        if (type === 'album' || type === 'track') {
            return item.artist || item.artists?.[0]?.name || '';
        }
        return '';
    };

    const getIcon = () => {
        switch (type) {
            case 'artist': return <User size={16} className="text-[var(--color-fg-tertiary)]" />;
            case 'album': return <Disc size={16} className="text-[var(--color-fg-tertiary)]" />;
            case 'track': return <Music size={16} className="text-[var(--color-fg-tertiary)]" />;
        }
    };

    return (
        <div className="w-full flex flex-col gap-1">
            {displayItems.map((item, index) => {
                const percentage = ((item.listen_count || 0) / maxCount) * 100;
                const delay = index * 50;

                return (
                    <Link
                        key={item.id}
                        to={getLink(item)}
                        className={`
                            group relative flex items-center gap-3 
                            ${compact ? 'py-2 px-2' : 'py-2.5 px-3'} 
                            rounded-lg overflow-hidden
                            hover:bg-[var(--color-bg-tertiary)]/30 
                            transition-all duration-200
                        `}
                        style={{ animationDelay: `${delay}ms` }}
                    >
                        {/* Background Bar */}
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/20 to-transparent origin-left transition-all duration-500 ease-out"
                            style={{
                                width: `${percentage}%`,
                                opacity: 0.6
                            }}
                        />

                        {/* Rank Number */}
                        {showRank && (
                            <span className={`
                                relative z-10 font-bold tabular-nums
                                ${compact ? 'text-sm w-5' : 'text-base w-6'}
                                ${index < 3 ? 'text-[var(--color-primary)]' : 'text-[var(--color-fg-tertiary)]'}
                            `}>
                                {index + 1}
                            </span>
                        )}

                        {/* Image */}
                        <div className={`
                            relative z-10 flex-shrink-0 overflow-hidden bg-[var(--color-bg-tertiary)]
                            ${type === 'artist' ? 'rounded-full' : 'rounded-md'}
                            ${compact ? 'w-8 h-8' : 'w-10 h-10'}
                            ring-1 ring-white/5 group-hover:ring-[var(--color-primary)]/30
                            transition-all duration-200
                        `}>
                            {item.image ? (
                                <img
                                    src={imageUrl(item.image, "small")}
                                    alt={getName(item)}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    {getIcon()}
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="relative z-10 flex-1 min-w-0">
                            <p className={`
                                font-semibold text-[var(--color-fg)] truncate
                                group-hover:text-[var(--color-primary)] transition-colors
                                ${compact ? 'text-sm' : 'text-sm'}
                            `}>
                                {getName(item)}
                            </p>
                            {getSubtitle(item) && (
                                <p className="text-xs text-[var(--color-fg-tertiary)] truncate">
                                    {getSubtitle(item)}
                                </p>
                            )}
                        </div>

                        {/* Play Count */}
                        <div className="relative z-10 flex items-center gap-1.5 ml-auto">
                            <span className={`
                                font-bold tabular-nums text-[var(--color-fg)]
                                ${compact ? 'text-xs' : 'text-sm'}
                            `}>
                                {(item.listen_count || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[var(--color-fg-tertiary)] uppercase tracking-wide">
                                plays
                            </span>
                        </div>

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--color-primary)]/10 to-transparent" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
