// NOTE: React 17+ no requiere `import React from 'react'` para JSX.
import { Link } from "react-router";
import { type Listen } from "api/api";
import { timeSince } from "~/utils/utils";
import ArtistLinks from "./ArtistLinks";
import OptimizedImage from "./OptimizedImage";

interface Props {
    listen: Listen;
    showArtist?: boolean;
}

export default function TrackRow({ listen, showArtist = true }: Props) {
    return (
        <div className="group relative flex items-center gap-3 p-2 rounded-xl bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)] transition-all duration-200 hover:shadow-sm">

            {/* Album Art */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--color-bg-tertiary)] relative">
                {listen.track.image ? (
                    <OptimizedImage
                        id={listen.track.image}
                        size="small"
                        alt={listen.track.album || 'Album'}
                        className="w-full h-full object-cover"
                        fill
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-fg-tertiary)]">
                        <span className="text-sm">♪</span>
                    </div>
                )}
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

            {/* Time */}
            <div className="text-xs text-[var(--color-fg-tertiary)] whitespace-nowrap" title={new Date(listen.time).toLocaleString()}>
                {timeSince(new Date(listen.time))}
            </div>
        </div>
    );
}


