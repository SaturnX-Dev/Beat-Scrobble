import { useQuery } from "@tanstack/react-query";
import { getStats, getTopArtists, getTopAlbums, imageUrl } from "api/api";
import { Link } from "react-router";
import { Calendar } from "lucide-react";
import { useAuraStyle } from "~/hooks/useAuraStyle";
import CardAura from "./CardAura";
import { useCountUp } from "~/hooks/useCountUp";

interface Props {
    period?: "day" | "week" | "month" | "year" | "all_time";
}

export default function DashboardMetrics({ period = "week" }: Props) {
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

    const animatedListens = useCountUp(stats?.listen_count, 2000);
    const animatedHours = useCountUp(stats ? Math.round(stats.minutes_listened / 60) : 0, 2000);

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
            <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-[var(--color-bg-tertiary)]/50 shadow-premium relative overflow-hidden group hover:shadow-premium-hover transition-all duration-500">
                <CardAura size="small" id="dashboard" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold flex items-center gap-2">
                        <Calendar size={12} />
                        Stats: {periodLabel}
                    </p>
                </div>

                <div className="flex items-baseline gap-2 mb-1 relative z-10">
                    <p className="text-4xl md:text-5xl lg:text-6xl font-black text-[var(--color-fg)] tracking-tight tabular-nums">
                        {stats ? animatedListens.toLocaleString() : "-"}
                    </p>
                </div>
                <p className="text-xs text-[var(--color-fg-secondary)] relative z-10 mb-6 font-medium">
                    {stats ? Math.round(animatedHours).toLocaleString() : "-"} hours listened
                </p>

                <Link to="/timeline" className="relative z-10 w-full block text-center bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white text-sm font-bold py-3 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 uppercase tracking-wide active:scale-[0.98]">
                    History
                </Link>
            </div>

            {/* Top Artist Card */}
            {topArtist && topArtist.items.length > 0 && (
                <Link to={`/artist/${topArtist.items[0].id}`} className="block group relative">
                    <div className="h-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-4 md:p-5 border border-[var(--color-bg-tertiary)]/50 shadow-premium relative overflow-hidden transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-premium-hover hover:-translate-y-1">
                        <CardAura size="small" id="dashboard" />

                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse"></div>
                            <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold">Top Artist</p>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 relative z-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
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
                    <div className="h-full bg-[var(--color-bg-secondary)]/50 backdrop-blur-md rounded-3xl p-4 md:p-5 border border-[var(--color-bg-tertiary)]/50 shadow-premium relative overflow-hidden transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-premium-hover hover:-translate-y-1">
                        <CardAura size="small" id="dashboard" />

                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-info)] animate-pulse"></div>
                            <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold">Top Album</p>
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 relative z-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
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
