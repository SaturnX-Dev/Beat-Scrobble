import { useLoaderData, Link } from "react-router";
import { useState, useRef, useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLastListens, getStats, getTopArtists, imageUrl, type Listen, type PaginatedResponse } from "api/api";
import { BarChart3, Calendar, TrendingUp, Clock } from "lucide-react";
import ActivityGrid from "~/components/ActivityGrid";
import TimelineView from "~/components/TimelineView";
import PeriodSelector from "~/components/PeriodSelector";

export async function clientLoader() {
    try {
        const initialListens = await getLastListens({
            limit: 50,
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
                items_per_page: 50
            }
        };
    }
}

export default function History() {
    const { initialListens } = useLoaderData<{ initialListens: PaginatedResponse<Listen> }>();
    const [period, setPeriod] = useState<string>("week");

    // Infinite Query for Listens
    const {
        data: historyData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['history', period],
        queryFn: ({ pageParam = 1 }) => getLastListens({
            limit: 50,
            period: period,
            page: pageParam
        }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.has_next_page ? lastPage.current_page + 1 : undefined,
        initialData: period === 'week' ? { pages: [initialListens], pageParams: [1] } : undefined
    });

    const listens = historyData?.pages.flatMap(page => page.items) || initialListens.items;

    // Stats
    const { data: statsData } = useQuery({
        queryKey: ['stats', period],
        queryFn: () => getStats(period)
    });

    // Top Artists
    const { data: topArtistsData } = useQuery({
        queryKey: ['top-artists', period],
        queryFn: () => getTopArtists({ limit: 5, period, page: 1 })
    });

    // Stats calculations
    const totalScrobbles = statsData?.listen_count || 0;
    const uniqueArtists = statsData?.artist_count || 0;
    const uniqueTracks = statsData?.track_count || 0;
    const totalMinutes = statsData?.minutes_listened || 0;
    const totalHours = Math.floor(totalMinutes / 60);

    // Activity Grid Range
    const getActivityRange = (p: string) => {
        switch (p) {
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            case 'all_time': return 365;
            default: return 182;
        }
    };

    // Intersection Observer for Infinite Scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

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
                    <PeriodSelector setter={setPeriod} current={period} />
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
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueArtists.toLocaleString()}</p>
                    </div>

                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 rounded-lg bg-[var(--color-success)]/10">
                                <Calendar size={16} className="text-[var(--color-success)] sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">Tracks</p>
                        </div>
                        <p className="text-xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueTracks.toLocaleString()}</p>
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

                {/* Top Artists */}
                {topArtistsData && topArtistsData.items.length > 0 && (
                    <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)] mb-6 md:mb-8">
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)] mb-3 sm:mb-4">Top Artists This Period</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {topArtistsData.items.map((artist, index) => (
                                <Link to={`/artist/${artist.id}`} key={artist.id} className="flex items-center gap-3 sm:gap-4 p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)]/50 transition-colors group">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[var(--color-primary)]/20 flex-shrink-0">
                                        {artist.image ? (
                                            <img src={imageUrl(artist.image, "small")} alt={artist.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl">🎵</div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm sm:text-base font-bold text-[var(--color-fg)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                            {index + 1}. {artist.name}
                                        </p>
                                        <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)]">{artist.listen_count} plays</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Activity Heatmap */}
                <div className="glass-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--color-bg-tertiary)] mb-6 md:mb-8">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)] mb-3 sm:mb-4">Listening Activity</h2>
                    <ActivityGrid range={getActivityRange(period)} />
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
                            listens={listens}
                            compact={true}
                            showFilters={false}
                        />
                        {/* Loader / Sentinel */}
                        <div ref={lastElementRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && <p className="text-sm text-[var(--color-fg-secondary)]">Loading more...</p>}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
