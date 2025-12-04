import { useState, useEffect, useCallback } from 'react';

interface PreferencesCache {
    [key: string]: any;
}

let preferencesCache: PreferencesCache = {};
let isFetching = false;
let fetchPromise: Promise<void> | null = null;

export function usePreferences() {
    const [preferences, setPreferences] = useState<PreferencesCache>(preferencesCache);
    const [isLoading, setIsLoading] = useState(false);

    // Load preferences from API
    const loadPreferences = useCallback(async () => {
        if (isFetching && fetchPromise) {
            await fetchPromise;
            return;
        }

        isFetching = true;
        setIsLoading(true);

        fetchPromise = (async () => {
            try {
                const res = await fetch('/apis/web/v1/user/preferences');
                if (res.ok) {
                    const data = await res.json();
                    preferencesCache = data;
                    setPreferences(data);
                } else if (res.status === 401) {
                    // Not authenticated, use localStorage as fallback
                    console.log('Not authenticated, using localStorage for preferences');
                }
            } catch (err) {
                console.error('Failed to load preferences:', err);
            } finally {
                setIsLoading(false);
                isFetching = false;
                fetchPromise = null;
            }
        })();

        await fetchPromise;
    }, []);

    // Save a preference to API
    const savePreference = useCallback(async (key: string, value: any) => {
        const newPreferences = { ...preferencesCache, [key]: value };
        preferencesCache = newPreferences;
        setPreferences(newPreferences);

        try {
            const res = await fetch('/apis/web/v1/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPreferences),
            });

            if (!res.ok && res.status === 401) {
                // Not authenticated, save to localStorage as fallback
                localStorage.setItem(`pref_${key}`, JSON.stringify(value));
            }
        } catch (err) {
            console.error('Failed to save preference:', err);
            // Fallback to localStorage
            localStorage.setItem(`pref_${key}`, JSON.stringify(value));
        }
    }, []);

    // Get a preference value
    const getPreference = useCallback((key: string, defaultValue?: any) => {
        if (preferencesCache[key] !== undefined) {
            return preferencesCache[key];
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(`pref_${key}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return stored;
            }
        }

        return defaultValue;
    }, [preferences]);

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    return {
        preferences,
        isLoading,
        savePreference,
        getPreference,
        loadPreferences,
    };
}
