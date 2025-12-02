
import { useQuery } from "@tanstack/react-query";
import { getLastListens, imageUrl, type Listen } from "api/api";
import { Clock, Smartphone, Monitor } from "lucide-react";

interface Props {
    artistId?: number;
    limit?: number;
}

export default function ListeningSessions({ artistId, limit = 50 }: Props) {
    const { data } = useQuery({
        queryKey: ["last-plays", { limit, artistId, page: 1 }],
        queryFn: () => getLastListens({ limit, period: "all", page: 1, artist_id: artistId }),
    });

    if (!data || !data.items) return null;

    // Group plays into sessions (break > 20 mins)
    const sessions: Listen[][] = [];
    let currentSession: Listen[] = [];

    // Process in reverse chronological order (newest first)
    // But for grouping logic, it's easier to iterate and check gaps

    for (let i = 0; i < data.items.length; i++) {
        const play = data.items[i];
        const prevPlay = data.items[i - 1];

        if (!prevPlay) {
            currentSession.push(play);
            continue;
        }

        const timeDiff = new Date(prevPlay.time).getTime() - new Date(play.time).getTime(); // Difference in ms

        // If gap is more than 20 minutes (1200000 ms), start new session
        if (timeDiff > 1200000) {
            sessions.push(currentSession);
            currentSession = [play];
        } else {
            currentSession.push(play);
        }
    }
    if (currentSession.length > 0) sessions.push(currentSession);

    // Filter out single-track sessions for this view to make it more interesting, or keep them
    const interestingSessions = sessions.filter(s => s.length > 1).slice(0, 5);

    if (interestingSessions.length === 0) {
        return (
            <div className="text-center text-[var(--color-fg-tertiary)] py-4 text-sm">
                No recent listening sessions found.
            </div>
        );
    }

    return (
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {interestingSessions.map((session, idx) => {
                const startTime = new Date(session[session.length - 1].time);
                const endTime = new Date(session[0].time);
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

                return (
                    <div key={idx} className="bg-[var(--color-bg-secondary)]/50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 border border-[var(--color-bg-tertiary)]/50">
                        <div className="flex justify-between items-start mb-2 sm:mb-3">
                            <div>
                                <p className="text-xs sm:text-sm font-bold text-[var(--color-fg)]">
                                    {startTime.toLocaleDateString()}
                                </p>
                                <p className="text-[10px] sm:text-xs text-[var(--color-fg-secondary)] flex items-center gap-1 mt-0.5">
                                    <Clock size={10} />
                                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <span className="mx-1">•</span>
                                    {duration} mins
                                </p>
                            </div>
                            <div className="text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded-full">
                                {session.length} tracks
                            </div>
                        </div>

                        <div className="flex -space-x-2 overflow-hidden py-2">
                            {session.slice(0, 8).map((play, pIdx) => (
                                <div key={pIdx} className="w-8 h-8 rounded-full border-2 border-[var(--color-bg-secondary)] bg-[var(--color-bg-tertiary)] overflow-hidden relative">
                                    {play.track.image ? (
                                        <img
                                            src={imageUrl(play.track.image, "small")}
                                            alt={play.track.title}
                                            title={`${play.track.title}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                const span = document.createElement('span');
                                                span.innerText = '♪';
                                                span.className = 'text-[10px] text-[var(--color-fg-tertiary)]';
                                                e.currentTarget.parentElement?.appendChild(span);
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--color-fg-tertiary)]">♪</div>
                                    )}
                                </div>
                            ))}
                            {session.length > 8 && (
                                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-bg-secondary)] bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[10px] font-bold text-[var(--color-fg)]">
                                    +{session.length - 8}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
