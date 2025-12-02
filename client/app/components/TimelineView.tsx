import { Link } from "react-router";
import { deleteListen, type Listen, imageUrl } from "api/api";
import { timeSince } from "~/utils/utils";
import ArtistLinks from "./ArtistLinks";
import { useState } from "react";
import { Layers, List, Filter } from "lucide-react";
import { useAppContext } from "~/providers/AppProvider";

interface TimelineViewProps {
    listens: Listen[];
    compact?: boolean;
    showFilters?: boolean;
    onDelete?: (listen: Listen) => void;
    viewMode?: 'list' | 'session';
    onViewModeChange?: (mode: 'list' | 'session') => void;
}

export default function TimelineView({
    listens,
    compact = false,
    showFilters = true,
    onDelete,
    viewMode = 'list',
    onViewModeChange
}: TimelineViewProps) {
    const { user } = useAppContext();
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const handleDelete = async (listen: Listen) => {
        if (!onDelete) return;
        try {
            const res = await deleteListen(listen);
            if (res.ok || (res.status >= 200 && res.status < 300)) {
                onDelete(listen);
            }
        } catch (err) {
            console.error("Error deleting listen:", err);
        }
    };

    return (
        <div className="flex flex-col gap-3 md:gap-4 relative">
            {/* Vertical Line for desktop */}
            {!compact && <div className="absolute left-8 top-0 bottom-0 w-px bg-[var(--color-bg-tertiary)]/50 z-0 hidden md:block"></div>}

            {viewMode === 'list' ? (
                listens.map((item, index) => (
                    <div key={`${item.time}-${index}`} className="relative z-10 group">
                        <div className={`flex items-start gap-3 md:gap-6 ${compact ? 'p-2 md:p-3' : 'p-3 md:p-4'} rounded-xl md:rounded-2xl bg-[var(--color-bg)]/60 glass-card hover:bg-[var(--color-bg)]/80 transition-smooth shadow-sm hover:shadow-md border border-transparent hover:border-[var(--color-bg-tertiary)]`}>

                            {/* Time / Dot - Desktop only for compact */}
                            {!compact && (
                                <div className="flex flex-col items-center gap-2 min-w-[60px] pt-2 hidden md:flex">
                                    <span className="text-xs text-[var(--color-fg-tertiary)] font-mono">
                                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className="w-3 h-3 rounded-full bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-bg)] group-hover:bg-[var(--color-primary)] transition-smooth"></div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 flex gap-3 md:gap-4 items-center">
                                {/* Album Art */}
                                <div className={`${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-12 h-12 md:w-14 md:h-14'} rounded-lg overflow-hidden flex-shrink-0 shadow-md bg-[var(--color-bg-tertiary)] relative group-hover:scale-105 transition-transform duration-150`}>
                                    {item.track?.image ? (
                                        <img
                                            src={imageUrl(item.track.image, "large")}
                                            alt={item.track.album || 'Album'}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : null}
                                    <div className={`absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)] text-[var(--color-fg-tertiary)] ${!item.track?.image ? 'z-0' : '-z-10'}`}>
                                        <span className="text-base">♪</span>
                                    </div>
                                </div>

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <Link
                                            to={`/track/${item.track.id}`}
                                            className={`font-bold text-[var(--color-fg)] hover:text-[var(--color-primary)] truncate ${compact ? 'text-sm md:text-base' : 'text-base md:text-lg'} block transition-smooth`}
                                        >
                                            {item.track.title}
                                        </Link>
                                        <span className="text-xs text-[var(--color-fg-tertiary)] whitespace-nowrap md:hidden">
                                            {timeSince(new Date(item.time))}
                                        </span>
                                    </div>

                                    <div className={`${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'} text-[var(--color-fg-secondary)] truncate`}>
                                        <ArtistLinks artists={item.track.artists} />
                                    </div>

                                    {!compact && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Link
                                                to={`/album/${item.track.album_id}`}
                                                className="text-xs text-[var(--color-fg-tertiary)] hover:underline truncate max-w-[200px]"
                                            >
                                                {item.track.album}
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Action */}
                                {user && onDelete && (
                                    <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-smooth">
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-2 text-[var(--color-fg-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-tertiary)] rounded-full transition-smooth"
                                            title="Delete Scrobble"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                // Session View
                (() => {
                    const sessions: Listen[][] = [];
                    let currentSession: Listen[] = [];

                    listens.forEach((item, idx) => {
                        if (idx === 0) {
                            currentSession = [item];
                        } else {
                            const prevTime = new Date(listens[idx - 1].time).getTime();
                            const currTime = new Date(item.time).getTime();
                            const gap = Math.abs(prevTime - currTime) / (1000 * 60);

                            if (gap > 20) {
                                sessions.push([...currentSession]);
                                currentSession = [item];
                            } else {
                                currentSession.push(item);
                            }
                        }
                    });
                    if (currentSession.length > 0) sessions.push(currentSession);

                    return sessions.map((session, sIdx) => {
                        const startTime = new Date(session[0].time);
                        const endTime = new Date(session[session.length - 1].time);
                        const duration = Math.abs(startTime.getTime() - endTime.getTime()) / (1000 * 60);

                        return (
                            <div key={sIdx} className="glass-card p-3 md:p-4 rounded-xl border border-[var(--color-bg-tertiary)]">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--color-fg)]">
                                            Session {sIdx + 1}
                                        </p>
                                        <p className="text-xs text-[var(--color-fg-secondary)]">
                                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {Math.round(duration)} mins
                                        </p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold">
                                        {session.length} tracks
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {session.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-[var(--color-bg-tertiary)]/30 rounded-lg transition-smooth">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--color-bg-tertiary)] relative">
                                                {item.track.image ? (
                                                    <img
                                                        src={imageUrl(item.track.image, "large")}
                                                        alt={item.track.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : null}
                                                <div className={`absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)] text-[var(--color-fg-tertiary)] ${!item.track.image ? 'z-0' : '-z-10'}`}>
                                                    <span className="text-sm">♪</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/track/${item.track.id}`} className="text-sm font-medium text-[var(--color-fg)] hover:text-[var(--color-primary)] truncate block">
                                                    {item.track.title}
                                                </Link>
                                                <p className="text-xs text-[var(--color-fg-secondary)] truncate">
                                                    <ArtistLinks artists={item.track.artists} />
                                                </p>
                                            </div>
                                            <span className="text-xs text-[var(--color-fg-tertiary)]">
                                                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    });
                })()
            )}
        </div>
    );
}
