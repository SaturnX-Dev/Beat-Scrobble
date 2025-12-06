import { Link } from "react-router";
import { type Listen, type Track } from "api/api";
import { timeSince } from "~/utils/utils";
import ArtistLinks from "../ArtistLinks";
import { Trash2 } from "lucide-react";
import CardAura from "../CardAura";

interface Props {
    listen: Listen;
    showArtist?: boolean;
    onDelete?: (listen: Listen) => void;
    canDelete?: boolean;
}

export default function TrackRow({ listen, showArtist = true, onDelete, canDelete = false }: Props) {
    return (
        <div className="group relative flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-secondary)]/40 transition-all duration-200 hover:scale-[1.005] hover:shadow-sm">

            {/* Delete Action (Left) */}
            <div className="w-[18px] flex justify-center">
                {canDelete && onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onDelete(listen);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-[var(--color-fg-tertiary)] hover:text-[var(--color-error)] hover:scale-110 p-1 rounded-full hover:bg-[var(--color-error)]/10"
                        aria-label="Delete scrobble"
                        title="Delete this scrobble"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Time */}
            <div className="text-xs text-[var(--color-fg-tertiary)] whitespace-nowrap min-w-[60px]" title={new Date(listen.time).toLocaleString()}>
                {timeSince(new Date(listen.time))}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <Link
                    to={`/track/${listen.track.id}`}
                    className="font-medium text-[var(--color-fg)] hover:text-[var(--color-primary)] transition-colors truncate text-sm leading-tight"
                >
                    {listen.track.title}
                </Link>
                {showArtist && (
                    <div className="text-xs text-[var(--color-fg-secondary)] truncate mt-0.5">
                        <ArtistLinks artists={listen.track.artists} />
                    </div>
                )}
            </div>

            {/* Subtle Aura on Hover */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-xl">
                <div className="absolute -right-4 -top-10 w-24 h-24 bg-[var(--color-primary)]/5 blur-2xl rounded-full" />
            </div>
        </div>
    );
}
