import { useState, useEffect } from "react";
import { Link } from "react-router";
import { BarChart3, User } from "lucide-react";
import ProfileCritique from "~/components/ProfileCritique";
import PeriodSelector from "~/components/PeriodSelector";
import { imageUrl } from "api/api";

interface Stats {
    listen_count: number;
    artist_count: number;
    album_count: number;
    track_count: number;
}

interface Artist {
    id: number;
    name: string;
    image: string;
}

interface Album {
    id: number;
    title: string;
    image: string;
    listen_count: number;
    artists: { name: string }[];
}

interface TopArtistsResponse {
    items: Artist[];
}

interface TopAlbumsResponse {
    items: Album[];
}

export default function Profile() {
    const [period, setPeriod] = useState("week");
    const [stats, setStats] = useState<Stats | null>(null);
    const [topArtists, setTopArtists] = useState<TopArtistsResponse | null>(null);
    const [topAlbum, setTopAlbum] = useState<TopAlbumsResponse | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`/apis/web/v1/stats?period=${period}`);
                const statsData = await statsRes.json();
                setStats(statsData);

                const artistsRes = await fetch(`/apis/web/v1/top-artists?period=${period}&limit=5`);
                const artistsData = await artistsRes.json();
                setTopArtists(artistsData);

                const albumsRes = await fetch(`/apis/web/v1/top-albums?period=${period}&limit=1`);
                const albumsData = await albumsRes.json();
                setTopAlbum(albumsData);
            } catch (error) {
                console.error("Failed to fetch profile data", error);
            }
        };

        fetchData();
    }, [period]);

    return (
        <main className="flex flex-grow justify-center pb-8 w-full min-h-screen">
            <div className="w-full max-w-[1200px] px-4 md:px-6 mt-6 md:mt-8">
                {/* Header Section */}
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-fg)] tracking-tight">Profile</h1>
                        <p className="text-[var(--color-fg-secondary)] mt-1">Your listening habits and stats</p>
                    </div>
                    <div className="bg-[var(--color-bg-secondary)]/50 p-1 rounded-xl border border-[var(--color-bg-tertiary)]">
                        <PeriodSelector setter={setPeriod} current={period} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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

                        {/* AI Critique Block */}
                        <ProfileCritique period={period as "week" | "month" | "year" | "all_time"} />
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
