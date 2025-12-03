import { useQuery } from "@tanstack/react-query";
import { getStats, getTopArtists, getTopAlbums, imageUrl } from "api/api";
import { Link } from "react-router";
import { Clock, PlayCircle, Calendar } from "lucide-react";
import { useState } from "react";
import { useAuraStyle } from "~/hooks/useAuraStyle";
import CardAura from "./CardAura";

export default function DashboardMetrics() {
    const [period, setPeriod] = useState<"day" | "week" | "month" | "year" | "all_time">("week");
    const auraClass = useAuraStyle('small');

    const { data: stats } = useQuery({
        queryKey: ["stats", period],
        queryFn: () => getStats(period),
    });

    const { data: topArtist } = useQuery({
        queryKey: ["top-artists-metric", { limit: 1, period, page: 1 }],
        queryFn: () => getTopArtists({ limit: 1, period, page: 1 }),
    });

    const { data: topAlbum } = useQuery({
        queryKey: ["top-albums-metric", { limit: 1, period, page: 1 }],
        queryFn: () => getTopAlbums({ limit: 1, period, page: 1 }),
    });

    const periodLabel = {
        day: "Today",
        week: "This Week",
        month: "This Month",
        year: "This Year",
        all_time: "All Time"
    }[period];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6 w-full h-full">
            {/* Stats Card - Large with Aura */}
            <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-[var(--color-bg-tertiary)]/50 shadow-xl relative overflow-hidden group">
                <CardAura size="small" id="dashboard" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold flex items-center gap-2">
                        <Calendar size={12} />
                        Stats For:
                    </p>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="bg-[var(--color-bg)]/50 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-fg)] outline-none border border-[var(--color-bg-tertiary)]/50 cursor-pointer hover:bg-[var(--color-bg)]/80 transition-colors"
                    >
                        <option value="day">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="all_time">All Time</option>
                    </select>
                </div>

                <div className="flex items-baseline gap-2 mb-1 relative z-10">
                    <p className="text-4xl md:text-5xl lg:text-6xl font-black text-[var(--color-fg)] tracking-tight">
                        {stats ? stats.listen_count : "-"}
                    </p>
                </div>
                <p className="text-xs text-[var(--color-fg-secondary)] relative z-10 mb-6">
                    {stats ? Math.round(stats.minutes_listened / 60) : "-"} hours listened
                </p>

                <Link to="/history" className="relative z-10 w-full block text-center bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white text-sm font-bold py-3 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 uppercase tracking-wide">
                    History
                </Link>
            </div>

            {/* Top Artist Card */}
            {topArtist && topArtist.items.length > 0 && (
                <Link to={`/artist/${topArtist.items[0].id}`} className="block group relative">
                    <div className="h-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-4 md:p-5 border border-[var(--color-bg-tertiary)]/50 shadow-xl relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl">
                        <CardAura size="small" id="dashboard" />

                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
                            <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold">Top Artist</p>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 relative z-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                                <img
                                    src={imageUrl(topArtist.items[0].image, "medium")}
                                    alt={topArtist.items[0].name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-bold text-[var(--color-fg)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                    {topArtist.items[0].name}
                                </p>
                                <p className="text-xs text-[var(--color-fg-secondary)] truncate mt-0.5">
                                    {topArtist.items[0].listen_count} plays
                                </p>
                            </div>
                        </div>
                    </div>
                </Link>
            )}

            {/* Top Album Card */}
            {topAlbum && topAlbum.items.length > 0 && (
                <Link to={`/album/${topAlbum.items[0].id}`} className="block group relative">
                    <div className="h-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-4 md:p-5 border border-[var(--color-bg-tertiary)]/50 shadow-xl relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl">
                        <CardAura size="small" id="dashboard" />

                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-info)] animate-pulse"></div>
                            <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold">Top Album</p>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 relative z-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                                <img
                                    src={imageUrl(topAlbum.items[0].image, "medium")}
                                    alt={topAlbum.items[0].title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-bold text-[var(--color-fg)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                    {topAlbum.items[0].title}
                                </p>
                                <p className="text-xs text-[var(--color-fg-secondary)] truncate mt-0.5">
                                    {topAlbum.items[0].listen_count} plays
                                </p>
                            </div>
                        </div>
                    </div>
                </Link>
            )}
        </div>
    );
}
