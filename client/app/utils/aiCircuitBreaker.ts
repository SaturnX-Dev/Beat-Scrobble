/**
 * AI Circuit Breaker
 * Prevents API spam by tracking requests in memory.
 * Resets on page reload.
 */

// In-memory storage instead of sessionStorage
const memoryStore = new Map<string, string>();
const GLOBAL_COOLDOWN_KEY = 'comet_ai_global_cooldown';
const STORAGE_PREFIX = 'comet_ai_guard_';

export const aiCircuitBreaker = {
    /**
     * Checks if we can make a request for the given key.
     * key: unique identifier (e.g. 'profile_week', 'track_123')
     */
    canFetch: (key: string): boolean => {
        // 1. Check Global Cooldown (triggered by 429s)
        const cooldownStr = memoryStore.get(GLOBAL_COOLDOWN_KEY);
        if (cooldownStr) {
            const cooldownUntil = parseInt(cooldownStr, 10);
            if (Date.now() < cooldownUntil) {
                // Throttle logs to once every 5 seconds to prevent spam
                const lastLog = parseInt(memoryStore.get(STORAGE_PREFIX + 'last_log') || '0', 10);
                if (Date.now() - lastLog > 5000) {
                    console.warn(`[AI Guard] Global cooldown active until ${new Date(cooldownUntil).toLocaleTimeString()}`);
                    memoryStore.set(STORAGE_PREFIX + 'last_log', Date.now().toString());
                }
                return false;
            } else {
                // Cooldown expired, cleanup
                memoryStore.delete(GLOBAL_COOLDOWN_KEY);
            }
        }

        // 2. Check specific key
        if (memoryStore.get(STORAGE_PREFIX + key)) {
            // Already fetched this session
            return false;
        }

        return true;
    },

    /**
     * Marks a key as fetched.
     */
    markFetched: (key: string) => {
        memoryStore.set(STORAGE_PREFIX + key, 'true');
    },

    /**
     * Triggers a global cooldown for all AI requests.
     * Use this when a 429 is received.
     * default: 60 seconds
     */
    triggerCooldown: (seconds: number = 60) => {
        const cooldownUntil = Date.now() + (seconds * 1000);
        memoryStore.set(GLOBAL_COOLDOWN_KEY, cooldownUntil.toString());
        console.error(`[AI Guard] 429 received. AI features paused for ${seconds}s.`);
    },

    /**
     * Clears locks (useful for debugging)
     */
    reset: () => {
        memoryStore.clear();
    }
};
