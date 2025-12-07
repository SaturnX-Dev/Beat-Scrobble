import { Link } from "react-router";
import { imageUrl, type Track } from "api/api";
import ArtistLinks from "./ArtistLinks";

interface Props {
    track: Track;
    rank: number;
}

export default function RankedTrackRow({ track, rank }: Props) {
    const image = track.image ? imageUrl(track.image, "medium") : "/assets/default_img/default.png";

    return (
        <div className="group relative flex items-center gap-4 p-3 rounded-xl border border-[var(--color-bg-tertiary)]/30 bg-[var(--color-bg-secondary)]/20 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-secondary)] transition-all duration-300 hover:shadow-[0_4px_20px_-12px_var(--color-primary)] hover:-translate-y-0.5">

            {/* Active Indicator Bar (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-[var(--color-primary)] rounded-r-full transition-all duration-300 group-hover:h-3/4 opacity-0 group-hover:opacity-100" />

            {/* Rank */}
            <div className="w-8 flex justify-center items-center">
                <span className="text-lg font-bold text-[var(--color-fg-tertiary)] group-hover:text-[var(--color-primary)] transition-colors duration-300 font-mono">
                    #{rank}
                </span>
            </div>

            {/* Image */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0 group-hover:shadow-md transition-all group-hover:ring-2 ring-[var(--color-primary)]/20">
                <img src={image} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <Link
                    to={`/track/${track.id}`}
                    className="font-bold text-[var(--color-fg)] hover:text-[var(--color-primary)] transition-colors truncate text-sm leading-tight"
                >
                    {track.title}
                </Link>
                <div className="text-xs text-[var(--color-fg-secondary)] truncate group-hover:text-[var(--color-fg)] transition-colors">
                    <ArtistLinks artists={track.artists} />
                </div>
            </div>

            {/* Listen Count */}
            <div className="text-sm font-semibold text-[var(--color-fg-secondary)] whitespace-nowrap px-2 group-hover:text-[var(--color-primary)] transition-colors">
                {track.listen_count} plays
            </div>

            {/* Subtle Aura on Hover */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-xl">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-primary)]/5 blur-3xl rounded-full" />
            </div>
        </div>
    );
}
