/**
 * AI Circuit Breaker
 * Prevents API spam by using sessionStorage to track requests across component lifecycles.
 * This survives component unmounts/remounts and module reloads.
 */

const STORAGE_PREFIX = 'comet_ai_guard_';
const GLOBAL_COOLDOWN_KEY = 'comet_ai_global_cooldown';

export const aiCircuitBreaker = {
    /**
     * Checks if we can make a request for the given key.
     * key: unique identifier (e.g. 'profile_week', 'track_123')
     */
    canFetch: (key: string): boolean => {
        // 1. Check Global Cooldown (triggered by 429s)
        const cooldownStr = sessionStorage.getItem(GLOBAL_COOLDOWN_KEY);
        if (cooldownStr) {
            const cooldownUntil = parseInt(cooldownStr, 10);
            if (Date.now() < cooldownUntil) {
                console.warn(`[AI Guard] Global cooldown active until ${new Date(cooldownUntil).toLocaleTimeString()}`);
                return false;
            } else {
                // Cooldown expired, cleanup
                sessionStorage.removeItem(GLOBAL_COOLDOWN_KEY);
            }
        }

        // 2. Check specific key
        if (sessionStorage.getItem(STORAGE_PREFIX + key)) {
            // Already fetched this session
            return false;
        }

        return true;
    },

    /**
     * Marks a key as fetched.
     */
    markFetched: (key: string) => {
        sessionStorage.setItem(STORAGE_PREFIX + key, 'true');
    },

    /**
     * Triggers a global cooldown for all AI requests.
     * Use this when a 429 is received.
     * default: 60 seconds
     */
    triggerCooldown: (seconds: number = 60) => {
        const cooldownUntil = Date.now() + (seconds * 1000);
        sessionStorage.setItem(GLOBAL_COOLDOWN_KEY, cooldownUntil.toString());
        console.error(`[AI Guard] 429 received. AI features paused for ${seconds}s.`);
    },

    /**
     * Clears locks (useful for debugging)
     */
    reset: () => {
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(STORAGE_PREFIX) || key === GLOBAL_COOLDOWN_KEY) {
                sessionStorage.removeItem(key);
            }
        });
    }
};
