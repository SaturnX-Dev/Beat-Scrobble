// TODO: Implement URL theme sharing functionality
// This module handles encoding/decoding themes in URLs for easy sharing

export function encodeThemeToURL(theme: any): string {
    // TODO: Implement theme encoding
    // Convert theme object to base64 and add to URL
    // Example: ?theme=eyJiZyI6IiMwMDAwMDAiLCJmZyI6IiNmZmZmZmYifQ==
    const themeJson = JSON.stringify(theme);
    const themeBase64 = btoa(themeJson);
    return `${window.location.origin}/?theme=${encodeURIComponent(themeBase64)}`;
}

export function decodeThemeFromURL(): any | null {
    // TODO: Implement theme decoding
    // Extract theme from URL parameter and decode
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');

    if (!themeParam) return null;

    try {
        const themeJson = atob(decodeURIComponent(themeParam));
        const theme = JSON.parse(themeJson);

        // Validate theme has required properties
        const requiredKeys = ['bg', 'fg', 'primary'];
        if (!requiredKeys.every(key => key in theme)) {
            console.error('Invalid theme in URL');
            return null;
        }

        return theme;
    } catch (err) {
        console.error('Failed to decode theme from URL:', err);
        return null;
    }
}

export function generateShareableLink(theme: any, themeName: string): string {
    // TODO: Implement shareable link generation
    // Creates a shortened URL for social media sharing
    // Could use a URL shortener service or backend endpoint
    const fullUrl = encodeThemeToURL(theme);

    // For now, return full URL
    // In future, call backend to create short link:
    // POST /apis/web/v1/themes/share
    // Returns shortened URL like: https://app.com/t/abc123

    return fullUrl;
}

// TODO: Add to app initialization
// Call this on app load to check for shared themes
export function initializeSharedTheme(setTheme: (theme: any) => void): void {
    const sharedTheme = decodeThemeFromURL();
    if (sharedTheme) {
        console.log('Applying shared theme from URL');
        setTheme(sharedTheme);

        // Optionally show notification
        // "You're previewing a shared theme. Save it to keep using it!"
    }
}
