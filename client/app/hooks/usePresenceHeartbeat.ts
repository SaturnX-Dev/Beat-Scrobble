import { useEffect, useRef } from 'react';

/**
 * usePresenceHeartbeat - Sends periodic pings to server while app is visible
 * This enables the Now Playing critique system to know when to generate critiques
 */
export function usePresenceHeartbeat() {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        const sendPing = async () => {
            try {
                await fetch('/apis/web/v1/presence/ping', {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch {
                // Silently fail - presence is optional
            }
        };

        const startHeartbeat = () => {
            // Send initial ping
            sendPing();

            // Set up interval (every 20 seconds)
            intervalRef.current = setInterval(sendPing, 20000);
        };

        const stopHeartbeat = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        // Handle visibility changes
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopHeartbeat();
            } else {
                startHeartbeat();
            }
        };

        // Start if visible
        if (!document.hidden) {
            startHeartbeat();
        }

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopHeartbeat();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);
}

export default usePresenceHeartbeat;
