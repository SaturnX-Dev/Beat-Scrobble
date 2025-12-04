import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";

interface Props {
    period: "week" | "month" | "year" | "all_time";
}

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

        // Check server-side cache first
        const cacheKey = `comet_ai_profile_${period}`;
        const cached = getPreference(cacheKey, null);
        if (cached) {
            setCritique(cached);
            return;
        }

        setLoading(true);
        setError(null);

        fetch('/apis/web/v1/ai/profile-critique', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ period })
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch critique');
            })
            .then(data => {
                setCritique(data.critique);
                // Save to server-side preferences for caching
                savePreference(cacheKey, data.critique);
            })
            .catch(err => {
                console.error(err);
                setError("Could not generate critique.");
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
