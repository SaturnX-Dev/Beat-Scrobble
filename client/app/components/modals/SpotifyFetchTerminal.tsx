import { useEffect, useRef, useState } from "react";
import { X, Terminal, CheckCircle, AlertCircle } from "lucide-react";

interface SpotifyFetchTerminalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

interface LogMessage {
    type: 'log' | 'error' | 'success';
    message: string;
    timestamp: string;
}

export default function SpotifyFetchTerminal({ open, setOpen }: SpotifyFetchTerminalProps) {
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ processed: 0, failed: 0 });
    const [isComplete, setIsComplete] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (open && !eventSourceRef.current) {
            // Start SSE connection
            const es = new EventSource('/apis/web/v1/spotify/bulk-fetch-sse');
            eventSourceRef.current = es;

            setLogs([{
                type: 'log',
                message: 'Initializing connection to Spotify Metadata Service...',
                timestamp: new Date().toLocaleTimeString()
            }]);

            es.onmessage = (event) => {
                // This catches messages without a specific event type (default)
                // But our backend sends named events
            };

            es.addEventListener('log', (e: MessageEvent) => {
                const data = JSON.parse(e.data);
                addLog('log', data.message);
            });

            es.addEventListener('error', (e: MessageEvent) => {
                // This is for custom error events sent by backend
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
                es.close();
            });

            es.onerror = (e) => {
                console.error("SSE Error:", e);
                // Only log error if not complete (browser might fire error on close)
                if (!isComplete) {
                    addLog('error', 'Connection interrupted.');
                    es.close();
                }
            };
        }

        return () => {
            if (!open && eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [open, isComplete]);

    const addLog = (type: 'log' | 'error' | 'success', message: string) => {
        setLogs(prev => [...prev, {
            type,
            message,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    // Auto-scroll to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleClose = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setOpen(false);
        // Reset state for next time
        setLogs([]);
        setProgress(0);
        setStats({ processed: 0, failed: 0 });
        setIsComplete(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-gray-800">
                    <div className="flex items-center gap-2 text-gray-200">
                        <Terminal size={18} />
                        <span className="font-mono text-sm font-medium">Spotify Metadata Fetcher</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Section */}
                <div className="p-4 bg-[#1e1e1e] border-b border-gray-800">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-green-400">
                            <CheckCircle size={12} />
                            <span>Processed: {stats.processed}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-red-400">
                            <AlertCircle size={12} />
                            <span>Failed: {stats.failed}</span>
                        </div>
                    </div>
                </div>

                {/* Terminal Output */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#1e1e1e]">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                            <span className={`break-all ${log.type === 'error' ? 'text-red-400' :
                                    log.type === 'success' ? 'text-green-400' :
                                        'text-gray-300'
                                }`}>
                                {log.type === 'log' && <span className="text-blue-400 mr-2">ℹ</span>}
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
