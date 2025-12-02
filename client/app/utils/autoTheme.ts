// TODO: Implement automatic dark/light mode switching
// This module detects system theme preference and applies appropriate theme

export function getSystemThemePreference(): 'dark' | 'light' {
    // Check system/OS theme preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function setupAutoThemeSwitch(
    setTheme: (themeName: string) => void,
    darkTheme: string = 'midnight',
    lightTheme: string = 'snow'
): () => void {
    // TODO: Implement auto theme switching
    // Listen to system theme changes and update app theme accordingly

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

export function loadAutoThemeConfig(): AutoThemeConfig {
    // TODO: Load from localStorage or server
    const savedConfig = localStorage.getItem('autoThemeConfig');
    if (savedConfig) {
        return JSON.parse(savedConfig);
    }

    return {
        enabled: false,
        darkTheme: 'midnight',
        lightTheme: 'snow',
    };
}

export function saveAutoThemeConfig(config: AutoThemeConfig): void {
    // TODO: Save to localStorage and optionally to server
    localStorage.setItem('autoThemeConfig', JSON.stringify(config));

    // Optionally sync to server:
    // POST /apis/web/v1/user/preferences
    // { autoTheme: config }
}

export function isNightTime(startHour: number, endHour: number): boolean {
    // TODO: Implement schedule-based theme switching
    const now = new Date();
    const currentHour = now.getHours();

    // Handle overnight schedules (e.g., 20:00 to 06:00)
    if (startHour > endHour) {
        return currentHour >= startHour || currentHour < endHour;
    }

    return currentHour >= startHour && currentHour < endHour;
}
