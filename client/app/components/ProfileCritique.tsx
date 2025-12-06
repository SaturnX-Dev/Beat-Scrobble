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
                    aiCircuitBreaker.triggerCooldown(60); // Pause all AI for 60s
                    // Try to parse the specific error from OpenRouter/Backend
                    try {
                        const errData = await res.json();
                        // OpenRouter error format: { error: { message: "..." } }
                        const msg = errData.error?.message || errData.message || JSON.stringify(errData);
                        throw new Error(`Provider Error: ${msg}`);
                    } catch (e) {
                        // If JSON parse fails, throw generic
                        throw new Error('Limit reached. Check OpenRouter credits.');
                    }
                }
                if (res.ok) return res.json();

                // Handle 500s or other errors
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

    if (!enabled) return null;

    return (
        <div className="glass-card rounded-xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)] flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Sparkles size={20} className="text-[var(--color-primary)]" />
                    Comet AI
                </h3>
            </div>

            <div className="min-h-[60px] flex items-center justify-center">
                {loading ? (
                    <div className="flex items-center gap-2 text-[var(--color-fg-secondary)] animate-pulse">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-sm">Analyzing your taste...</span>
                    </div>
                ) : error ? (
                    <p className="text-sm text-red-400">{error}</p>
                ) : (
                    <p className="text-sm sm:text-base italic text-[var(--color-fg-secondary)] leading-relaxed text-center">
                        "{critique}"
                    </p>
                )}
            </div>
        </div>
    );
}
