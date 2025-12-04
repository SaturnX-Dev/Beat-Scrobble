import { useState, useRef, useCallback } from "react";
import { Link } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLastListens, getStats, getTopArtists, getTopAlbums, imageUrl, type Listen, type PaginatedResponse } from "api/api";
import { BarChart3, User, TrendingUp, Clock, Disc, Music } from "lucide-react";
import ProfileCritique from "~/components/ProfileCritique";
import PeriodSelector from "~/components/PeriodSelector";
import ActivityGrid from "~/components/ActivityGrid";
import TimelineView from "~/components/TimelineView";

interface Artist {
    id: number;
    name: string;
    image: string;
    listen_count: number;
}

interface Album {
    id: number;
    title: string;
    image: string;
    listen_count: number;
    artists: { name: string }[];
}

interface StatsData {
    listen_count: number;
    artist_count: number;
    album_count: number;
    track_count: number;
    minutes_listened: number;
}

export default function Profile() {
    const [period, setPeriod] = useState<string>("week");

    // Infinite Query for Listens (History timeline)
    const {
        data: historyData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['profile-history', period],
        queryFn: ({ pageParam = 1 }) => getLastListens({
            limit: 50,
            period: period,
            page: pageParam
        }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.has_next_page ? lastPage.current_page + 1 : undefined,
    });

    const listens = historyData?.pages.flatMap(page => page.items) || [];

    // Stats Query
    const { data: statsData } = useQuery({
        queryKey: ['profile-stats', period],
        queryFn: () => getStats(period)
    });

    // Top Artists Query
    const { data: topArtistsData } = useQuery({
        queryKey: ['profile-top-artists', period],
        queryFn: () => getTopArtists({ limit: 5, period, page: 1 })
    });

    // Top Albums Query (5 instead of 1)
    const { data: topAlbumsData } = useQuery({
        queryKey: ['profile-top-albums', period],
        queryFn: () => getTopAlbums({ limit: 5, period, page: 1 })
    });

    // Stats calculations
    const totalScrobbles = (statsData as StatsData)?.listen_count || 0;
    const uniqueArtists = (statsData as StatsData)?.artist_count || 0;
    const uniqueTracks = (statsData as StatsData)?.track_count || 0;
    const uniqueAlbums = (statsData as StatsData)?.album_count || 0;
    const totalMinutes = (statsData as StatsData)?.minutes_listened || 0;
    const totalHours = Math.floor(totalMinutes / 60);

    // Activity Grid Range by period
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

    const periodLabel = period === "all_time" ? "All Time" : period.charAt(0).toUpperCase() + period.slice(1);

    return (
        <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-6 md:py-10 pb-24">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-fg)] tracking-tight mb-2">
                        Your Profile
                    </h1>
                    <p className="text-[var(--color-fg-secondary)] text-sm md:text-base max-w-lg mx-auto">
                        Complete statistics, trends, and insights about your listening habits
                    </p>
                </div>

                {/* Centered Period Selector */}
                <div className="flex justify-center mb-8">
                    <div className="bg-[var(--color-bg-secondary)]/60 p-1.5 rounded-2xl border border-[var(--color-bg-tertiary)] shadow-lg backdrop-blur-sm">
                        <PeriodSelector setter={setPeriod} current={period} />
                    </div>
                </div>

                {/* Stats Cards - Enhanced */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                                <BarChart3 size={18} className="text-[var(--color-primary)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{totalScrobbles.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Scrobbles</p>
                    </div>

                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-[var(--color-accent)]/10 group-hover:bg-[var(--color-accent)]/20 transition-colors">
                                <TrendingUp size={18} className="text-[var(--color-accent)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueArtists.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Artists</p>
                    </div>

                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-success)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-[var(--color-success)]/10 group-hover:bg-[var(--color-success)]/20 transition-colors">
                                <Disc size={18} className="text-[var(--color-success)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueAlbums.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Albums</p>
                    </div>

                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-warning)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-[var(--color-warning)]/10 group-hover:bg-[var(--color-warning)]/20 transition-colors">
                                <Music size={18} className="text-[var(--color-warning)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{uniqueTracks.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Tracks</p>
                    </div>

                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-info)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-[var(--color-info)]/10 group-hover:bg-[var(--color-info)]/20 transition-colors">
                                <Clock size={18} className="text-[var(--color-info)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{totalHours}h</p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Listening Time</p>
                    </div>

                    <div className="glass-card p-4 sm:p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/30 transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 group-hover:from-[var(--color-primary)]/20 group-hover:to-[var(--color-accent)]/20 transition-colors">
                                <TrendingUp size={18} className="text-[var(--color-primary)]" />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">
                            {totalScrobbles > 0 && uniqueTracks > 0 ? (totalScrobbles / uniqueTracks).toFixed(1) : '0'}
                        </p>
                        <p className="text-xs text-[var(--color-fg-secondary)] mt-1">Avg Plays/Track</p>
                    </div>
                </div>

                {/* Two Column Layout: Left = Charts, Right = AI Critique */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Left: Activity & Top Content */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Activity Heatmap */}
                        <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)] mb-4 flex items-center gap-2">
                                <BarChart3 size={20} className="text-[var(--color-primary)]" />
                                Listening Activity
                            </h2>
                            <ActivityGrid range={getActivityRange(period)} />
                        </div>

                        {/* Top Artists */}
                        {topArtistsData && topArtistsData.items && topArtistsData.items.length > 0 && (
                            <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)]">
                                        Top Artists - {periodLabel}
                                    </h2>
                                    <Link
                                        to={`/chart/top-artists?period=${period}`}
                                        className="text-xs sm:text-sm text-[var(--color-primary)] hover:underline font-medium"
                                    >
                                        View All →
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {topArtistsData.items.map((artist: Artist, index: number) => (
                                        <Link
                                            to={`/artist/${artist.id}`}
                                            key={artist.id}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-tertiary)]/50 transition-all group"
                                        >
                                            <div className="relative">
                                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[var(--color-primary)]/20 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--color-primary)]/40 transition-all">
                                                    {artist.image ? (
                                                        <img
                                                            src={imageUrl(artist.image, "small")}
                                                            alt={artist.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User size={20} className="text-[var(--color-fg-tertiary)]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="absolute -top-1 -left-1 w-5 h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-[var(--color-fg)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                                    {artist.name}
                                                </p>
                                                <p className="text-xs text-[var(--color-fg-secondary)]">
                                                    {artist.listen_count?.toLocaleString() || 0} plays
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Albums - 5 albums grid */}
                        {topAlbumsData && topAlbumsData.items && topAlbumsData.items.length > 0 && (
                            <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)]">
                                        Top Albums - {periodLabel}
                                    </h2>
                                    <Link
                                        to={`/chart/top-albums?period=${period}`}
                                        className="text-xs sm:text-sm text-[var(--color-primary)] hover:underline font-medium"
                                    >
                                        View All →
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {topAlbumsData.items.map((album: Album, index: number) => (
                                        <Link
                                            to={`/album/${album.id}`}
                                            key={album.id}
                                            className="group flex flex-col gap-2"
                                        >
                                            <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] shadow-lg group-hover:shadow-xl transition-all">
                                                {album.image ? (
                                                    <img
                                                        src={imageUrl(album.image, "medium")}
                                                        alt={album.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Disc size={32} className="text-[var(--color-fg-tertiary)]" />
                                                    </div>
                                                )}
                                                <span className="absolute top-2 left-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-xs font-bold text-white backdrop-blur-sm">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--color-fg)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                                    {album.title}
                                                </p>
                                                <p className="text-xs text-[var(--color-fg-secondary)] truncate">
                                                    {album.artists?.[0]?.name || "Unknown Artist"}
                                                </p>
                                                <p className="text-xs text-[var(--color-fg-tertiary)] mt-0.5">
                                                    {album.listen_count?.toLocaleString() || 0} plays
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: AI Critique */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <ProfileCritique period={period as "week" | "month" | "year" | "all_time"} />
                        </div>
                    </div>
                </div>

                {/* Listening Timeline - Full Width */}
                <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-fg)]">
                            Recent Listening History
                        </h2>
                        <Link
                            to="/timeline"
                            className="text-xs sm:text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dim)] font-medium"
                        >
                            Full Timeline →
                        </Link>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
                        <TimelineView
                            listens={listens}
                            compact={true}
                            showFilters={false}
                        />
                        {/* Loader / Sentinel for Infinite Scroll */}
                        <div ref={lastElementRef} className="h-10 flex items-center justify-center">
                            {isFetchingNextPage && (
                                <p className="text-sm text-[var(--color-fg-secondary)] animate-pulse">Loading more...</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
