import { useQuery } from "@tanstack/react-query";
import { getTopArtists, getTopAlbums, getStats, imageUrl } from "api/api";
import { Link } from "react-router";
import { Calendar, Edit, MapPin, User, BarChart3 } from "lucide-react";
import { useAppContext } from "~/providers/AppProvider";
import { useState } from "react";

export default function Profile() {
    const { user } = useAppContext();
    const [period, setPeriod] = useState<"week" | "month" | "year" | "all_time">("month");

    const { data: topArtists } = useQuery({
        queryKey: ["profile-top-artists", { limit: 5, period }],
        queryFn: () => getTopArtists({ limit: 5, period, page: 1 }),
    });

    const { data: topAlbum } = useQuery({
        queryKey: ["profile-top-album", { limit: 1, period }],
        queryFn: () => getTopAlbums({ limit: 1, period, page: 1 }),
    });

    const { data: stats } = useQuery({
        queryKey: ["profile-stats", period],
        queryFn: () => getStats(period === "all_time" ? "all_time" : period),
    });

    return (
        <main className="flex flex-col items-center w-full min-h-screen pb-20">
            {/* Banner */}
            <div className="w-full h-48 sm:h-64 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] relative">
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            <div className="w-full max-w-5xl px-4 -mt-16 sm:-mt-20 relative z-10 flex flex-col gap-6 sm:gap-8">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-xl flex-shrink-0">
                        <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-tertiary)] text-[var(--color-fg-tertiary)]">
                            <User size={48} className="sm:w-16 sm:h-16" />
                        </div>
                    </div>
                    <div className="flex-1 pb-2 sm:pb-4 text-center md:text-left">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-fg)]">{user?.username || "User"}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 mt-2 text-[var(--color-fg-secondary)] flex-wrap">
                            <span className="flex items-center gap-1 text-xs sm:text-sm">
                                <MapPin size={14} /> Earth
                            </span>
                            <span className="flex items-center gap-1 text-xs sm:text-sm">
                                <Calendar size={14} /> Joined 2024
                            </span>
                        </div>
                        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--color-fg-secondary)] max-w-2xl">
                            Music enthusiast. Exploring new sounds every day.
                        </p>
                    </div>
                    <div className="pb-2 sm:pb-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-bg-tertiary)] transition-colors text-sm">
                            <Edit size={16} />
                            <span>Edit Profile</span>
                        </button>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex justify-center sm:justify-start">
                    <div className="flex gap-1 sm:gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-full border border-[var(--color-bg-tertiary)]">
                        {[
                            { label: "Week", value: "week" },
                            { label: "Month", value: "month" },
                            { label: "Year", value: "year" },
                            { label: "All Time", value: "all_time" }
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value as any)}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${period === p.value
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

                    {/* Left Column - Stats */}
                    <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="glass-card rounded-xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)]">
                            <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                                <BarChart3 size={20} className="text-[var(--color-primary)]" />
                                Stats
                            </h3>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-base text-[var(--color-fg-secondary)]">Scrobbles</span>
                                    <span className="text-base sm:text-lg font-bold">{stats?.listen_count?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-base text-[var(--color-fg-secondary)]">Artists</span>
                                    <span className="text-base sm:text-lg font-bold">{stats?.artist_count?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-base text-[var(--color-fg-secondary)]">Albums</span>
                                    <span className="text-base sm:text-lg font-bold">{stats?.album_count?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-base text-[var(--color-fg-secondary)]">Tracks</span>
                                    <span className="text-base sm:text-lg font-bold">{stats?.track_count?.toLocaleString() || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center/Right Column - Highlights */}
                    <div className="md:col-span-2 flex flex-col gap-4 sm:gap-6">

                        {/* Top Artists Block */}
                        <div className="glass-card rounded-xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)]">
                            <div className="flex justify-between items-center mb-4 sm:mb-6">
                                <h3 className="text-lg sm:text-xl font-bold">Top Artists</h3>
                                <Link to={`/chart/top-artists?period=${period}`} className="text-xs sm:text-sm text-[var(--color-primary)] hover:underline">View All</Link>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                                {topArtists?.items.map((artist) => (
                                    <Link key={artist.id} to={`/artist/${artist.id}`} className="group flex flex-col items-center gap-2 text-center">
                                        <div className="w-full aspect-square rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-[var(--color-bg-tertiary)]">
                                            {artist.image ? (
                                                <img
                                                    src={imageUrl(artist.image, "medium")}
                                                    alt={artist.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[var(--color-fg-tertiary)]">
                                                    <User size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium truncate w-full group-hover:text-[var(--color-primary)] transition-colors">{artist.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Album of the Period Block */}
                        {topAlbum && topAlbum.items.length > 0 && (
                            <div className="glass-card rounded-xl p-4 sm:p-6 border border-[var(--color-bg-tertiary)] flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
                                <div className="w-full sm:w-40 md:w-48 aspect-square rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-[var(--color-bg-tertiary)]">
                                    {topAlbum.items[0].image ? (
                                        <img
                                            src={imageUrl(topAlbum.items[0].image, "large")}
                                            alt={topAlbum.items[0].title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--color-fg-tertiary)]">
                                            <span className="text-4xl">♪</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-2 block">
                                        Top Album - {period === "all_time" ? "All Time" : period.charAt(0).toUpperCase() + period.slice(1)}
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-bold mb-2">{topAlbum.items[0].title}</h3>
                                    <p className="text-sm sm:text-base md:text-lg text-[var(--color-fg-secondary)] mb-3 sm:mb-4">
                                        {topAlbum.items[0].artists[0]?.name || "Unknown Artist"}
                                    </p>
                                    <div className="inline-block bg-[var(--color-bg-tertiary)] px-3 py-1 rounded-full text-xs sm:text-sm">
                                        {topAlbum.items[0].listen_count} plays
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </main>
    );
}
