import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastListens, type Listen, type PaginatedResponse } from "api/api";
import { BarChart3, Calendar, TrendingUp, Clock } from "lucide-react";
import ActivityGrid from "~/components/ActivityGrid";
import TimelineView from "~/components/TimelineView";

export async function clientLoader() {
    try {
        const initialListens = await getLastListens({
            limit: 100,
            page: 1,
            period: "week"
        });
        return { initialListens };
    } catch (error) {
        console.error("Failed to load history:", error);
        return {
            initialListens: {
                items: [],
                total_record_count: 0,
                has_next_page: false,
                current_page: 1,
                items_per_page: 100
            }
        };
    }
}

export default function History() {
    const { initialListens } = useLoaderData<{ initialListens: PaginatedResponse<Listen> }>();
    const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("week");

    const { data: historyData } = useQuery({
        queryKey: ['history', period],
        queryFn: () => getLastListens({
            limit: 100,
            period: period === 'all' ? 'all_time' : period,
            page: 1
        }),
        initialData: period === 'week' ? { ...initialListens, items: initialListens.items } : undefined
    });

    const listens = historyData?.items || initialListens.items;

    // Calculate statistics
    const totalScrobbles = listens.length;
    const uniqueArtists = new Set(listens.map(l => l.track.artists?.[0]?.name).filter(Boolean));
    const uniqueTracks = new Set(listens.map(l => l.track.id));
    const totalMinutes = totalScrobbles * 3.5;
    const totalHours = Math.floor(totalMinutes / 60);

    const artistCounts = listens.reduce((acc, listen) => {
        const artist = listen.track.artists?.[0]?.name || 'Unknown';
        acc[artist] = (acc[artist] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];

    return (
        <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-6 md:py-12 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <BarChart3 size={32} className="text-[var(--color-primary)]" />
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-fg)]">Listening History</h1>
                    </div>
                    <p className="text-[var(--color-fg-secondary)] text-sm md:text-base">Deep dive into your music listening statistics and trends</p>
                </div>

                {/* Period Selector */}
                <div className="flex justify-center mb-6 md:mb-8">
                    <div className="flex gap-1 sm:gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-full border border-[var(--color-bg-tertiary)]">
                        {['week', 'month', 'year', 'all'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${period === p
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                    }`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[var(--color-primary)]/10">
                                <BarChart3 size={16} className="text-[var(--color-primary)] sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">Scrobbles</p>
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{totalScrobbles.toLocaleString()}</p>
                    </div>

                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[var(--color-accent)]/10">
                                <TrendingUp size={16} className="text-[var(--color-accent)] sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">Artists</p>
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueArtists.size}</p>
                    </div>

                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[var(--color-success)]/10">
                                <Calendar size={16} className="text-[var(--color-success)] sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">Tracks</p>
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueTracks.size}</p>
                    </div>

                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[var(--color-info)]/10">
                                <Clock size={16} className="text-[var(--color-info)] sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">Time</p>
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{totalHours}h</p>
                    </div>
                </div>

                {/* Top Artist Card */}
                {topArtist && (
                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)] mb-6 md:mb-8">
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)] mb-3 sm:mb-4">Top Artist This Period</h2>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                                <span className="text-xl sm:text-2xl">🎵</span>
                            </div>
                            <div>
                                <p className="text-lg sm:text-2xl font-bold text-[var(--color-fg)]">{topArtist[0]}</p>
                                <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">{topArtist[1]} plays</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Heatmap */}
                <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)] mb-6 md:mb-8">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)] mb-3 sm:mb-4">Listening Activity</h2>
                    <ActivityGrid />
                </div>

                {/* Listening Timeline - Integrated */}
                <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)]">Listening Timeline</h2>
                        <Link
                            to="/timeline"
                            className="text-xs sm:text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dim)] font-medium"
                        >
                            View All →
                        </Link>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
                        <TimelineView
                            listens={listens.slice(0, 20)}
                            compact={true}
                            showFilters={false}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
