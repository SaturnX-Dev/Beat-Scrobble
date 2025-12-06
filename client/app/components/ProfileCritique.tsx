import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";
import { aiCircuitBreaker } from "../utils/aiCircuitBreaker";

interface Props {
    period: "day" | "week" | "month" | "year" | "all_time";
}

// Global cache to prevent re-fetching across component remounts
const fetchedPeriodsCache = new Set<string>();

export default function ProfileCritique({ period }: Props) {
    const { getPreference, savePreference } = usePreferences();
    const [enabled, setEnabled] = useState(false);
    const [critique, setCritique] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setEnabled(getPreference('profile_critique_enabled', false));
    }, [getPreference]);

    useEffect(() => {
        if (!enabled) {
            setCritique(null);
            return;
        }

        const lockKey = `profile_${period}`;

        // STRONG GUARD: Check Circuit Breaker
        if (!aiCircuitBreaker.canFetch(lockKey)) {
            // Check if we have a cached value to show even if blocked
            const cacheKey = `comet_ai_profile_${period}`;
            const cached = getPreference(cacheKey, null);
            if (cached) setCritique(cached);
            return;
        }

        // Check server-side cache (Preference)
        const cacheKey = `comet_ai_profile_${period}`;
        const cached = getPreference(cacheKey, null);
        if (cached) {
            setCritique(cached);
            aiCircuitBreaker.markFetched(lockKey); // Mark as complete
            return;
        }

        setLoading(true);
        setError(null);
        aiCircuitBreaker.markFetched(lockKey); // Optimistic lock

        fetch('/apis/web/v1/ai/profile-critique', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period })
        })
            .then(async res => {
                if (res.status === 429) {
                    aiCircuitBreaker.triggerCooldown(60);
                }

                if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429 || res.status === 500) {
                    const errorText = await res.text();
                    let errorMessage = errorText;
                    try {
                        const json = JSON.parse(errorText);
                        if (json.error) errorMessage = json.error;
                        // Handle specific "not configured" error
                        if (errorMessage.includes("AI Model not configured")) {
                            errorMessage = "⚠️ AI Model not set. Please configure it in Settings -> API Keys.";
                        }
                    } catch (e) {
                        // unparseable, use raw text (truncated)
                        errorMessage = errorText.substring(0, 100);
                    }
                    throw new Error(errorMessage);
                }

                if (res.ok) return res.json();

                const text = await res.text();
                try {
                    const errData = JSON.parse(text);
                    const msg = errData.error?.message || errData.message || JSON.stringify(errData);
                    throw new Error(msg);
                } catch (e) {
                    throw new Error(`Error: ${text.slice(0, 100)}` || 'Failed to fetch critique');
                }
            })
            .then(data => {
                setCritique(data.critique);
                savePreference(cacheKey, data.critique);
            })
            .catch(err => {
                console.error(err);
                setError(err.message || "Could not generate critique.");
            })
            .finally(() => {
                setLoading(false);
            });

    }, [period, enabled, getPreference, savePreference]);

    if (!enabled || (!critique && !loading)) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl p-[1px] group">
            {/* Gradient Border - Fully Theme Adaptive */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-dim)] to-[var(--color-accent)] opacity-30 group-hover:opacity-60 transition-opacity duration-500" />

            <div className="relative bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl rounded-2xl p-6 h-full flex flex-col justify-between">

                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                        <Sparkles size={14} className="text-[var(--color-primary)]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Comet AI</span>
                    </div>
                </div>

                {/* Content */}
                <div className="relative flex-grow flex items-center justify-center min-h-[120px]">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3 text-[var(--color-fg-secondary)] animate-pulse py-8">
                            <RefreshCw size={24} className="animate-spin text-[var(--color-primary)] opacity-50" />
                            <span className="text-sm font-medium tracking-wide">Analyzing your frequency...</span>
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-400 text-center">{error}</p>
                    ) : (
                        <div className="relative z-10">
                            <span className="absolute -top-6 -left-2 text-6xl text-[var(--color-primary)]/10 font-serif leading-none select-none">"</span>
                            <p className="text-base sm:text-lg text-[var(--color-fg)] font-serif italic leading-relaxed text-center px-2">
                                {critique}
                            </p>
                            <span className="absolute -bottom-8 -right-2 text-6xl text-[var(--color-primary)]/10 font-serif leading-none select-none transform rotate-180">"</span>
                        </div>
                    )}
                </div>

                {/* Footer / Decorative */}
                <div className="mt-6 flex justify-center opacity-30">
                    <div className="h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-[var(--color-fg-tertiary)] to-transparent" />
                </div>

                {/* Subtle Background Glow */}
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-[var(--color-accent)]/10 rounded-full blur-3xl pointer-events-none" />
            </div>
        </div>
    );
}
