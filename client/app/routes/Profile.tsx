import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLastListens, getStats, getTopArtists, getTopAlbums, getTopTracks, imageUrl, type Listen, type PaginatedResponse } from "api/api";
import { BarChart3, User, TrendingUp, Clock, Disc, Music, Share2, Gift, Copy, Check, Grid3X3, Circle, LineChart } from "lucide-react";
import ProfileCritique from "~/components/ProfileCritique";
import PeriodSelector from "~/components/PeriodSelector";
import ActivityGrid from "~/components/ActivityGrid";
import TimelineView from "~/components/TimelineView";
import YearlyRecapModal from "~/components/modals/YearlyRecapModal";
import TopTracks from "~/components/TopTracks";
import { usePreferences } from "~/hooks/usePreferences";
import { useAppContext } from "~/providers/AppProvider";
import { TopListChart, ListeningTrends, ArtistBubbles, ScatterPlot, WordCloud, StreamGraph } from "~/components/charts";

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

type ChartView = 'rankings' | 'trends' | 'bubbles' | 'stream' | 'scatter' | 'cloud';

export default function Profile() {
    const [period, setPeriod] = useState<string>("week");
    const [recapOpen, setRecapOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [chartView, setChartView] = useState<ChartView>('rankings');
    const { getPreference, savePreference } = usePreferences();
    const { user } = useAppContext();
    const backgroundImage = getPreference('background_image', null);
    const profileImage = getPreference('profile_image', null);

    // Check if recap should be visible (Dec 15-21 only)
    const isRecapPeriod = () => {
        const today = new Date();
        const month = today.getMonth(); // 11 = December
        const day = today.getDate();
        return month === 11 && day >= 15 && day <= 21;
    };

    const showRecapButton = isRecapPeriod();

    // Check if it's December 15-21 and show recap popup
    useEffect(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const hasViewedRecap = getPreference(`yearly_recap_viewed_${currentYear}`, false);

        if (isRecapPeriod() && !hasViewedRecap) {
            setRecapOpen(true);
        }
    }, [getPreference]);


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

    // Top Artists Query - more for bubbles view
    const { data: topArtistsData } = useQuery({
        queryKey: ['profile-top-artists', period],
        queryFn: () => getTopArtists({ limit: 15, period, page: 1 })
    });

    // Top Albums Query - more for quilt view
    const { data: topAlbumsData } = useQuery({
        queryKey: ['profile-top-albums', period],
        queryFn: () => getTopAlbums({ limit: 16, period, page: 1 })
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

    // Share profile
    const handleShare = () => {
        const hostname = getPreference('share_hostname', window.location.origin);
        const username = user?.username || 'user';
        const url = `${hostname}/u/${username}`;
        setShareUrl(url);
    };

    const copyShareUrl = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const aiEnabled = getPreference('profile_critique_enabled', false);

    return (
        <>
            <YearlyRecapModal open={recapOpen} setOpen={setRecapOpen} />

            <div className="flex w-full h-screen overflow-hidden">
                {/* Main Content - Scrollable */}
                <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 md:py-12 pb-24 hide-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {/* Header with Banner */}
                        <div className="relative mb-8 rounded-2xl overflow-hidden bg-[var(--color-bg-secondary)]/60 backdrop-blur-md border border-[var(--color-bg-tertiary)]">
                            {/* Banner Image - Full width/height container */}
                            <div className="w-full h-[250px] sm:h-[350px] bg-[var(--color-bg-tertiary)] relative">
                                {backgroundImage ? (
                                    <img
                                        src={backgroundImage}
                                        alt="Profile Banner"
                                        className="w-full h-full object-cover object-center"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-secondary)] via-transparent to-transparent opacity-90" />
                            </div>

                            {/* Profile Info (Overlapping Banner) */}
                            <div className="relative px-6 pb-6 -mt-16 sm:-mt-20 flex flex-col items-center text-center">
                                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-bg-secondary)] p-1.5 mb-4 shadow-xl">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-[var(--color-bg-tertiary)] relative">
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                                                <User size={64} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-fg)] mb-2">{user?.username}</h1>
                                <p className="text-[var(--color-fg-secondary)] text-sm md:text-base max-w-lg mx-auto mb-4">
                                    Complete statistics, trends, and insights about your listening habits
                                </p>

                                {/* Action buttons */}
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white rounded-xl text-sm font-medium transition-all"
                                    >
                                        <Share2 size={16} />
                                        Share Profile
                                    </button>
                                    {showRecapButton && (
                                        <button
                                            onClick={() => setRecapOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-all"
                                        >
                                            <Gift size={16} />
                                            {new Date().getFullYear()} Recap
                                        </button>
                                    )}
                                </div>

                                {/* Share URL popup */}
                                {shareUrl && (
                                    <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] max-w-md mx-auto">
                                        <p className="text-xs text-[var(--color-fg-secondary)] mb-2">Share this link:</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={shareUrl}
                                                readOnly
                                                className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                                            />
                                            <button
                                                onClick={copyShareUrl}
                                                className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg"
                                            >
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-[var(--color-fg-tertiary)] mt-2">
                                            Configure your hostname in Settings → Sharing
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Centered Period Selector */}
                        <div className="flex justify-center mb-8">
                            <div className="bg-[var(--color-bg-secondary)]/60 p-1.5 rounded-2xl border border-[var(--color-bg-tertiary)] shadow-lg backdrop-blur-sm">
                                <PeriodSelector setter={setPeriod} current={period} />
                            </div>
                        </div>

                        {/* Stats Cards Grid - 6 items */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
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

                        {/* Listening Activity with Trends */}
                        <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)] mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={18} className="text-[var(--color-primary)]" />
                                    <h2 className="text-lg font-bold text-[var(--color-fg)]">Listening Activity</h2>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <ActivityGrid range={getActivityRange(period)} compact />
                                <div className="pt-2 border-t border-[var(--color-bg-tertiary)]">
                                    <p className="text-[10px] text-[var(--color-fg-tertiary)] mb-2 uppercase tracking-wider">Trend</p>
                                    <ListeningTrends range={getActivityRange(period)} height={80} />
                                </div>
                            </div>
                        </div>

                        {/* Chart View Tabs */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                            {[
                                { id: 'rankings' as ChartView, label: 'Rankings', icon: BarChart3 },
                                { id: 'bubbles' as ChartView, label: 'Bubbles', icon: Circle },
                                { id: 'stream' as ChartView, label: 'Stream', icon: TrendingUp },
                                { id: 'scatter' as ChartView, label: 'Scatter', icon: Clock },
                                { id: 'cloud' as ChartView, label: 'Tags', icon: Share2 },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setChartView(tab.id)}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                        ${chartView === tab.id
                                            ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                                            : 'bg-[var(--color-bg-tertiary)]/50 text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                                        }
                                    `}
                                >
                                    <tab.icon size={14} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Main Content - Conditional based on view */}
                        <div className="flex flex-col gap-6">
                            {chartView === 'rankings' && (
                                <>
                                    {/* Top Artists with bars */}
                                    {topArtistsData?.items && topArtistsData.items.length > 0 && (
                                        <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                                    Top Artists - {periodLabel}
                                                </h2>
                                                <Link
                                                    to={`/chart/top-artists?period=${period}`}
                                                    className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                                                >
                                                    View All →
                                                </Link>
                                            </div>
                                            <TopListChart
                                                items={topArtistsData.items}
                                                type="artist"
                                                maxItems={aiEnabled ? 5 : 8}
                                            />
                                        </div>
                                    )}

                                    {/* Top Albums with bars */}
                                    {topAlbumsData?.items && topAlbumsData.items.length > 0 && (
                                        <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                                    Top Albums - {periodLabel}
                                                </h2>
                                                <Link
                                                    to={`/chart/top-albums?period=${period}`}
                                                    className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                                                >
                                                    View All →
                                                </Link>
                                            </div>
                                            <TopListChart
                                                items={topAlbumsData.items}
                                                type="album"
                                                maxItems={aiEnabled ? 5 : 8}
                                            />
                                        </div>
                                    )}

                                    {/* Top Tracks */}
                                    <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                                Top Tracks - {periodLabel}
                                            </h2>
                                            <Link
                                                to={`/chart/top-tracks?period=${period}`}
                                                className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                                            >
                                                View All →
                                            </Link>
                                        </div>
                                        <div className="bg-[var(--color-bg-secondary)]/30 rounded-xl p-4">
                                            <TopTracks period={period} limit={aiEnabled ? 5 : 8} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {chartView === 'bubbles' && (
                                <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                            Artist Bubbles - {periodLabel}
                                        </h2>
                                        <Link
                                            to={`/chart/top-artists?period=${period}`}
                                            className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                                        >
                                            View All →
                                        </Link>
                                    </div>
                                    <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                                        Bubble size represents play count. Click to view artist.
                                    </p>
                                    {topArtistsData?.items && topArtistsData.items.length > 0 ? (
                                        <ArtistBubbles items={topArtistsData.items} maxItems={12} />
                                    ) : (
                                        <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                                            No artist data available
                                        </div>
                                    )}
                                </div>
                            )}



                            {chartView === 'scatter' && (
                                <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                            Listening History Scatter - {periodLabel}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                                        Listening time habits (Hour of Day vs Date)
                                    </p>
                                    <div className="bg-[var(--color-bg-secondary)]/30 rounded-xl p-4 overflow-hidden">
                                        <ScatterPlot period={period} height={400} />
                                    </div>
                                </div>
                            )}

                            {chartView === 'stream' && (
                                <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                            Artist StreamGraph - {periodLabel}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                                        Evolution of your Top 5 artists over time.
                                    </p>
                                    <div className="bg-[var(--color-bg-secondary)]/30 rounded-xl p-4 overflow-hidden">
                                        {topArtistsData?.items && topArtistsData.items.length > 0 ? (
                                            <StreamGraph items={topArtistsData.items} period={period} />
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                                                No artist data available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {chartView === 'cloud' && (
                                <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--color-fg)]">
                                            Genre Cloud - {periodLabel}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                                        Top genres based on your artist activity.
                                    </p>
                                    <div className="bg-[var(--color-bg-secondary)]/30 rounded-xl p-4 overflow-hidden">
                                        {topArtistsData?.items && topArtistsData.items.length > 0 ? (
                                            <WordCloud items={topArtistsData.items} />
                                        ) : (
                                            <div className="h-64 flex items-center justify-center text-[var(--color-fg-tertiary)]">
                                                No genre data available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Listening Timeline */}
                        <div className="glass-card p-4 sm:p-6 rounded-xl border border-[var(--color-bg-tertiary)] mt-6">
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

                    {/* Mobile AI Critique Card - Only visible on mobile/tablet */}
                    {aiEnabled && (
                        <div className="lg:hidden mt-8">
                            <ProfileCritique period={period as "day" | "week" | "month" | "year" | "all_time"} />
                        </div>
                    )}
                </main>

                {/* Fixed AI Sidebar for Desktop */}
                {aiEnabled && (
                    <aside className="hidden lg:block w-96 flex-shrink-0 overflow-y-auto bg-transparent p-4 py-6 md:py-10 hide-scrollbar">
                        <ProfileCritique period={period as "day" | "week" | "month" | "year" | "all_time"} />
                    </aside>
                )}
            </div>
        </>
    );
}
