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
        <div className="group relative flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-secondary)]/40 transition-all duration-200 hover:scale-[1.005] hover:shadow-sm">

            {/* Rank */}
            <div className="w-8 flex justify-center items-center">
                <span className="text-lg font-bold text-[var(--color-fg-tertiary)] group-hover:text-[var(--color-primary)] transition-colors">
                    #{rank}
                </span>
            </div>

            {/* Image */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0 group-hover:shadow-md transition-all">
                <img src={image} alt={track.title} className="w-full h-full object-cover" />
                {/* Play overlay placeholder */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-0.5" />
                </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <Link
                    to={`/track/${track.id}`}
                    className="font-medium text-[var(--color-fg)] hover:text-[var(--color-primary)] transition-colors truncate text-sm leading-tight"
                >
                    {track.title}
                </Link>
                <div className="text-xs text-[var(--color-fg-secondary)] truncate mt-0.5">
                    <ArtistLinks artists={track.artists} />
                </div>
            </div>

            {/* Listen Count */}
            <div className="text-sm font-semibold text-[var(--color-fg-secondary)] whitespace-nowrap px-2">
                {track.listen_count} plays
            </div>

            {/* Subtle Aura on Hover */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-xl">
                <div className="absolute -right-4 -top-10 w-24 h-24 bg-[var(--color-primary)]/5 blur-2xl rounded-full" />
            </div>
        </div>
    );
}
