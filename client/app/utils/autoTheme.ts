// Auto theme detection and switching utilities
// Uses server-side preferences for persistence

export function getSystemThemePreference(): 'dark' | 'light' {
    // Check system/OS theme preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function setupAutoThemeSwitch(
    setTheme: (themeName: string) => void,
    darkTheme: string = 'midnight',
    lightTheme: string = 'snow'
): () => void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        const isDark = e.matches;
        console.log(`System theme changed to ${isDark ? 'dark' : 'light'} mode`);
        setTheme(isDark ? darkTheme : lightTheme);
    };

    // Apply initial theme
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    // Return cleanup function
    return () => {
        mediaQuery.removeEventListener('change', handleChange);
    };
}

export interface AutoThemeConfig {
    enabled: boolean;
    darkTheme: string;
    lightTheme: string;
    // Schedule-based switching
    scheduleEnabled?: boolean;
    darkModeStart?: string; // e.g., "20:00"
    darkModeEnd?: string;   // e.g., "06:00"
}

// These functions now expect preferences to be loaded externally via usePreferences hook
export function getDefaultAutoThemeConfig(): AutoThemeConfig {
    return {
        enabled: false,
        darkTheme: 'midnight',
        lightTheme: 'snow',
    };
}

export function isNightTime(startHour: number, endHour: number): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight schedules (e.g., 20:00 to 06:00)
    if (startHour > endHour) {
        return currentHour >= startHour || currentHour < endHour;
    }

    return currentHour >= startHour && currentHour < endHour;
}

// Time-of-day based theme selection (used by Auto button in ThemeSwitcher)
export function getTimeBasedTheme(): 'dark' | 'light' {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 18;
    return isDaytime ? 'light' : 'dark';
}
