import { Clock } from "lucide-react";
import ActivityGrid from "./ActivityGrid";
import Heatmap from "./Heatmap";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastListens, type Listen, type getItemsArgs } from "api/api";
import { timeSince } from "~/utils/utils";
import { Link } from "react-router";
import CardAura from "./CardAura";

export default function RecentActivity() {
    const [period, setPeriod] = useState<"month" | "quarter" | "all_time">("month");

    const { isPending, isError, data, error } = useQuery({
        queryKey: ['last-listens', { limit: 5, offset: 0, period, page: 1 }],
        queryFn: ({ queryKey }) => getLastListens(queryKey[1] as getItemsArgs),
    });

    if (isPending) {
        return (
            <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)]/50 shadow-lg">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-fg)] mb-4">Recent Activity</h2>
                <p className="text-xs sm:text-sm text-[var(--color-fg-secondary)] animate-pulse">Loading...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)]/50 shadow-lg">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-fg)] mb-4">Recent Activity</h2>
                <p className="text-xs sm:text-sm text-[var(--color-error)]">Error: {error.message}</p>
            </div>
        );
    }

    const recentListens = data?.items || [];

    return (
        <div className="bg-[var(--color-bg-secondary)]/30 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)]/50 shadow-lg relative overflow-hidden">
            <CardAura size="large" id="recent-activity" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-fg)]">Recent Activity</h2>
                <div className="flex items-center gap-1 text-xs bg-[var(--color-bg-secondary)] p-1 rounded-full border border-[var(--color-bg-tertiary)]">
                    <button
                        onClick={() => setPeriod("month")}
                        className={`px-3 py-1 rounded-full transition-all duration-150 ${period === "month" ? "bg-[var(--color-primary)] text-white font-bold" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"}`}
                    >
                        30d
                    </button>
                    <button
                        onClick={() => setPeriod("quarter")}
                        className={`px-3 py-1 rounded-full transition-all duration-150 ${period === "quarter" ? "bg-[var(--color-primary)] text-white font-bold" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"}`}
                    >
                        90d
                    </button>
                    <button
                        onClick={() => setPeriod("all_time")}
                        className={`px-3 py-1 rounded-full transition-all duration-150 ${period === "all_time" ? "bg-[var(--color-primary)] text-white font-bold" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"}`}
                    >
                        All
                    </button>
                </div>
            </div>

            {/* Real Timeline Data */}
            <div className="space-y-4 mb-8">
                {recentListens.slice(0, 2).map((listen, idx) => (
                    <div key={idx} className="flex items-center gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10 group-hover:ring-[var(--color-primary)]/20 transition-all"></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-[var(--color-fg)] truncate font-medium">
                                <Link to={`/track/${listen.track.id}`} className="hover:text-[var(--color-primary)]">
                                    {listen.track.title}
                                </Link>
                                <span className="text-[10px] sm:text-xs text-[var(--color-fg-secondary)] font-normal"> · {listen.track.artists?.[0]?.name || 'Unknown'}</span>
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-[var(--color-fg-tertiary)] flex items-center gap-1.5 mt-0.5">
                                <span>{timeSince(new Date(listen.time))}</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Heatmap Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wider text-[var(--color-fg-secondary)] font-bold">
                        Listening Habits
                    </p>
                    <Clock size={14} className="text-[var(--color-fg-tertiary)]" />
                </div>
                <div className="h-[180px] w-full overflow-hidden">
                    <ActivityGrid range={period === "month" ? 30 : period === "quarter" ? 90 : 365} />
                </div>
            </div>
        </div>
    );
}
