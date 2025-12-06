import { useQuery } from "@tanstack/react-query";
import { getNowPlaying, imageUrl } from "api/api";
import { Link } from "react-router";
import ArtistLinks from "./ArtistLinks";
import { Pause, Play, SkipForward, Sparkles } from "lucide-react";
import { AsyncButton } from "./AsyncButton";
import CardAura from "./CardAura";
import { useState, useEffect } from "react";
import { usePreferences } from "~/hooks/usePreferences";
import { aiCircuitBreaker } from "../utils/aiCircuitBreaker";

export default function NowPlayingCard() {
    const { data: npData, isLoading } = useQuery({
        queryKey: ["now-playing"],
        queryFn: () => getNowPlaying(),
        refetchInterval: 10000, // Refresh every 10s
    });

    const { getPreference, savePreference } = usePreferences();
    const [critique, setCritique] = useState<string | null>(null);
    const [isCritiqueLoading, setIsCritiqueLoading] = useState(false);
    // Removed lastTrackIdRef
    const aiEnabled = getPreference('ai_critique_enabled', false);

    useEffect(() => {
        if (!npData?.track || !aiEnabled) {
            setCritique(null);
            return;
        }

        const trackId = npData.track.id;
        const lockKey = `track_${trackId}`;

        // STRONG GUARD: Check Circuit Breaker
        if (!aiCircuitBreaker.canFetch(lockKey)) {
            // Try to load from cache if available
            const cacheKey = `comet_ai_track_${trackId}`;
            const cached = getPreference(cacheKey, null);
            if (cached) setCritique(cached);
            return;
        }

        // Check server-side cache first
        const cacheKey = `comet_ai_track_${trackId}`;
        const cached = getPreference(cacheKey, null);
        if (cached) {
            setCritique(cached);
            aiCircuitBreaker.markFetched(lockKey);
            return;
        }

        // Check visibility to save tokens
        if (document.hidden) {
            console.log("Page hidden, skipping AI critique fetch");
            return;
        }

        aiCircuitBreaker.markFetched(lockKey); // Lock immediately
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
            .then(async res => {
                if (res.status === 429) {
                    aiCircuitBreaker.triggerCooldown(60); // Apply global cooldown
                    // Try to parse the specific error from OpenRouter/Backend
                    try {
                        const errData = await res.json();
                        // OpenRouter error format usually: { error: { message: "..." } }
                        const msg = errData.error?.message || errData.message || JSON.stringify(errData);
                        throw new Error(`Provider Error: ${msg}`);
                    } catch (e) {
                        throw new Error('Limit reached. Check OpenRouter credits.');
                    }
                }
                if (res.ok) return res.json();

                try {
                    const errData = await res.json();
                    const msg = errData.error?.message || errData.message || JSON.stringify(errData);
                    throw new Error(msg);
                } catch (e) {
                    throw new Error('Failed to fetch critique');
                }
            })
            .then(data => {
                setCritique(data.critique);
                // Save to server-side preferences for caching
                savePreference(cacheKey, data.critique);
            })
            .catch(err => {
                console.error("AI Critique error:", err);
                setCritique(null);
            })
            .finally(() => {
                setIsCritiqueLoading(false);
            });

    }, [npData?.track?.id, aiEnabled, getPreference, savePreference]);

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[350px] md:min-h-[400px] bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-3xl p-6 flex flex-col gap-6 animate-pulse border border-[var(--color-bg-tertiary)]/30">
                <div className="w-full aspect-square rounded-2xl bg-[var(--color-bg-tertiary)]/50" />
                <div className="space-y-3">
                    <div className="h-8 w-3/4 bg-[var(--color-bg-tertiary)]/50 rounded-lg" />
                    <div className="h-5 w-1/2 bg-[var(--color-bg-tertiary)]/30 rounded-lg" />
                </div>
            </div>
        );
    }

    if (!npData || !npData.currently_playing || !npData.track) {
        return null;
    }

    const track = npData.track;
    const image = track.image ? imageUrl(track.image, "large") : "/assets/default_img/default.png";

    return (
        <div className="w-full h-full min-h-[350px] md:min-h-[400px] bg-[var(--color-bg)]/70 glass-bg backdrop-blur-md rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-4 md:gap-6 border border-[var(--color-bg-tertiary)]/50 relative overflow-hidden group shadow-premium hover:shadow-premium-hover transition-shadow duration-500">
            {/* Background Blur Effect - Organic Breathing */}
            <div
                className="absolute inset-0 z-0 opacity-30 blur-3xl scale-110 transition-transform duration-[3s] ease-in-out group-hover:scale-125"
                style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />

            <CardAura size="large" id="now-playing" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden shadow-2xl mb-4 relative group/image">
                    <img src={image} alt={track.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/image:scale-105" />
                    {/* Vinyl Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
                </div>

                <div className="flex-grow">
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--color-fg)] line-clamp-2 mb-1 tracking-tight">
                        <Link to={`/track/${track.id}`} className="hover:text-[var(--color-primary)] transition-colors">
                            {track.title}
                        </Link>
                    </h2>
                    <div className="text-base md:text-lg text-[var(--color-fg-secondary)] line-clamp-1 font-medium">
                        {track.artists && <ArtistLinks artists={track.artists} />}
                    </div>
                </div>

                {/* Comet AI Section */}
                {aiEnabled && (
                    <div className={`mt-4 p-4 rounded-xl border border-white/5 backdrop-blur-md transition-all duration-500 ${critique ? 'bg-black/20' : 'bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-2 mb-2 text-[var(--color-primary)]">
                            <Sparkles size={14} className={isCritiqueLoading ? "animate-spin-slow" : ""} />
                            <span className="text-xs font-bold uppercase tracking-wider">Comet AI</span>
                        </div>

                        {isCritiqueLoading ? (
                            <div className="space-y-2">
                                <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-5/6 bg-white/10 rounded animate-pulse" />
                            </div>
                        ) : critique ? (
                            <p className="text-sm text-[var(--color-fg-secondary)] italic leading-relaxed font-serif tracking-wide opacity-0 animate-fade-in relative">
                                <span className="absolute -left-2 -top-1 text-2xl text-[var(--color-primary)]/30 font-serif">"</span>
                                {critique}
                                <span className="absolute -bottom-2 -right-1 text-2xl text-[var(--color-primary)]/30 font-serif">"</span>
                            </p>
                        ) : null}
                    </div>
                )}

                {/* Fake Controls */}
                <div className="flex items-center justify-between mt-4 md:mt-6 pt-4 md:pt-6 border-t border-[var(--color-bg-tertiary)]/30">
                    <div className="flex gap-4">
                        <button className="p-3 rounded-full bg-[var(--color-bg-tertiary)]/30 hover:bg-[var(--color-bg-tertiary)]/70 text-[var(--color-fg)] transition-all duration-200 active:scale-90 hover:shadow-lg backdrop-blur-sm group/btn">
                            <Pause size={20} fill="currentColor" className="group-hover/btn:scale-90 transition-transform" />
                        </button>
                        <button className="p-3 rounded-full bg-[var(--color-bg-tertiary)]/30 hover:bg-[var(--color-bg-tertiary)]/70 text-[var(--color-fg)] transition-all duration-200 active:scale-90 hover:shadow-lg backdrop-blur-sm group/btn">
                            <SkipForward size={20} fill="currentColor" className="group-hover/btn:scale-90 transition-transform" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                        <span className="text-[10px] md:text-xs text-[var(--color-primary)] uppercase tracking-widest font-bold">
                            Live
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
