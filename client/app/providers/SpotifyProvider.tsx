import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

interface LogMessage {
    type: 'log' | 'error' | 'success';
    message: string;
    timestamp: string;
}

interface SpotifyContextValue {
    logs: LogMessage[];
    progress: number;
    stats: { processed: number; failed: number };
    isFetching: boolean;
    isComplete: boolean;
    startFetch: () => void;
    stopFetch: () => void;
    clearLogs: () => void;
}

const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ processed: 0, failed: 0 });
    const [isFetching, setIsFetching] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    const addLog = (type: 'log' | 'error' | 'success', message: string) => {
        setLogs(prev => [...prev, {
            type,
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const stopFetch = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsFetching(false);
    }, []);

    const startFetch = useCallback(() => {
        if (isFetching) return;

        // Reset state
        setLogs([]);
        setProgress(0);
        setStats({ processed: 0, failed: 0 });
        setIsComplete(false);
        setIsFetching(true);

        const es = new EventSource('/apis/web/v1/spotify/bulk-fetch-sse');
        eventSourceRef.current = es;

        addLog('log', 'Initializing connection to Spotify Metadata Service...');

        es.addEventListener('log', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            addLog('log', data.message);
        });

        es.addEventListener('error', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            addLog('error', data.message);
        });

        es.addEventListener('progress', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            setProgress(data.percent);
            setStats({ processed: data.processed, failed: data.failed });
        });

        es.addEventListener('complete', (e: MessageEvent) => {
            const data = JSON.parse(e.data);
            setStats({ processed: data.processed, failed: data.failed });
            setIsComplete(true);
            addLog('success', `Operation complete! Processed: ${data.processed}, Failed: ${data.failed}`);
            setIsFetching(false);
            es.close();
        });

        es.onerror = (e) => {
            console.error("SSE Error:", e);
            if (!isComplete) {
                addLog('error', 'Connection interrupted.');
                stopFetch();
            }
        };
    }, [isFetching, stopFetch, isComplete]);

    const clearLogs = useCallback(() => {
        setLogs([]);
        setProgress(0);
        setStats({ processed: 0, failed: 0 });
        setIsComplete(false);
    }, []);

    // Cleanup on unmount (only if app unmounts, i.e. refresh)
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    return (
        <SpotifyContext.Provider value={{
            logs,
            progress,
            stats,
            isFetching,
            isComplete,
            startFetch,
            stopFetch,
            clearLogs
        }}>
            {children}
        </SpotifyContext.Provider>
    );
}

export function useSpotify() {
    const context = useContext(SpotifyContext);
    if (!context) {
        throw new Error('useSpotify must be used within a SpotifyProvider');
    }
    return context;
}
