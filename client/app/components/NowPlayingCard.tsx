import { useQuery } from "@tanstack/react-query";
import { getNowPlaying, imageUrl } from "api/api";
import { Link } from "react-router";
import ArtistLinks from "./ArtistLinks";
import { Pause, Play, SkipForward, Sparkles } from "lucide-react";
import { AsyncButton } from "./AsyncButton";
import CardAura from "./CardAura";
import { useState, useEffect, useRef } from "react";
import { usePreferences } from "~/hooks/usePreferences";

export default function NowPlayingCard() {
    const { data: npData, isLoading } = useQuery({
        queryKey: ["now-playing"],
        queryFn: () => getNowPlaying(),
        refetchInterval: 10000, // Refresh every 10s
    });

    const { getPreference } = usePreferences();
    const [critique, setCritique] = useState<string | null>(null);
    const [isCritiqueLoading, setIsCritiqueLoading] = useState(false);
    const lastTrackIdRef = useRef<number | null>(null);
    const aiEnabled = getPreference('ai_critique_enabled', false);

    useEffect(() => {
        if (!npData?.track || !aiEnabled) {
            setCritique(null);
            return;
        }

        const trackId = npData.track.id;

        // Only fetch if track changed
        if (trackId === lastTrackIdRef.current) {
            return;
        }

        // Check cache first
        const cacheKey = `comet_ai_track_${trackId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setCritique(cached);
            lastTrackIdRef.current = trackId;
            return;
        }

        // Check visibility to save tokens
        if (document.hidden) {
            console.log("Page hidden, skipping AI critique fetch");
            return;
        }

        lastTrackIdRef.current = trackId;
        setIsCritiqueLoading(true);
        setCritique(null);

        fetch('/apis/web/v1/ai/critique', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                track_name: npData.track.title,
                artist_name: npData.track.artists?.[0]?.name || "Unknown Artist",
                album_name: (npData.track.album as any)?.title || npData.track.album || "Unknown Album"
            })
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch critique');
            })
            .then(data => {
                setCritique(data.critique);
                localStorage.setItem(cacheKey, data.critique);
            })
            .catch(err => {
                console.error("AI Critique error:", err);
                setCritique(null);
            })
            .finally(() => {
                setIsCritiqueLoading(false);
            });

    }, [npData?.track?.id, aiEnabled]);

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[300px] bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-2xl p-6 flex items-center justify-center animate-pulse">
                <p className="text-[var(--color-fg-secondary)]">Loading...</p>
            </div>
        );
    }

    if (!npData || !npData.currently_playing || !npData.track) {
        return null;
    }

    const track = npData.track;
    const image = track.image ? imageUrl(track.image, "large") : "/assets/default_img/default.png"; // Fallback image

    return (
        <div className="w-full h-full min-h-[350px] md:min-h-[400px] bg-[var(--color-bg)]/70 glass-bg backdrop-blur-md rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 border border-[var(--color-bg-tertiary)]/50 relative overflow-hidden group shadow-premium">
            {/* Background Blur Effect */}
            <div
                className="absolute inset-0 z-0 opacity-20 blur-3xl scale-110 transition-transform duration-700 group-hover:scale-125"
                style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />

            <CardAura size="large" id="now-playing" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden shadow-premium mb-4 relative">
                    <img src={image} alt={track.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-grow">
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--color-fg)] line-clamp-2 mb-1">
                        <Link to={`/track/${track.id}`} className="hover:underline transition-smooth">
                            {track.title}
                        </Link>
                    </h2>
                    <div className="text-base md:text-lg text-[var(--color-fg-secondary)] line-clamp-1">
                        {track.artists && <ArtistLinks artists={track.artists} />}
                    </div>
                </div>

                {/* Comet AI Section */}
                {aiEnabled && (critique || isCritiqueLoading) && (
                    <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2 text-[var(--color-primary)]">
                            <Sparkles size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Comet AI</span>
                        </div>
                        {isCritiqueLoading ? (
                            <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <p className="text-sm text-[var(--color-fg-secondary)] italic leading-relaxed line-clamp-3">
                                "{critique}"
                            </p>
                        )}
                    </div>
                )}

                {/* Fake Controls for visual completeness - functionality would need API endpoints */}
                <div className="flex items-center justify-between mt-4 md:mt-6 pt-4 md:pt-6 border-t border-[var(--color-bg-tertiary)]/50">
                    <div className="flex gap-3 md:gap-4">
                        {/* Placeholder buttons */}
                        <button className="p-2 md:p-3 rounded-full bg-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-tertiary)] transition-smooth text-[var(--color-fg)]">
                            <Pause size={20} fill="currentColor" />
                        </button>
                        <button className="p-2 md:p-3 rounded-full bg-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-tertiary)] transition-smooth text-[var(--color-fg)]">
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                    </div>
                    <div className="text-xs text-[var(--color-fg-tertiary)] uppercase tracking-wider font-bold">
                        Now Playing
                    </div>
                </div>
            </div>
        </div>
    );
}
