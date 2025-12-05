import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, User, TrendingUp, Clock, Disc, Music } from "lucide-react";
import { imageUrl } from "api/api";

interface PublicProfileData {
    username: string;
    stats: {
        listen_count: number;
        artist_count: number;
        album_count: number;
        track_count: number;
        minutes_listened: number;
    };
    topArtists: Array<{
        id: number;
        name: string;
        image?: string;
        listen_count: number;
    }>;
    topAlbums: Array<{
        id: number;
        title: string;
        image?: string;
        artists: { name: string }[];
        listen_count: number;
    }>;
    memberSince?: string;
    profileImage?: string;
    backgroundImage?: string;
}

export default function PublicProfile() {
    const { username } = useParams<{ username: string }>();

    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['public-profile', username],
        queryFn: async () => {
            const res = await fetch(`/apis/web/v1/public/profile/${username}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Profile not found');
                throw new Error('Failed to load profile');
            }
            return res.json() as Promise<PublicProfileData>;
        },
        enabled: !!username,
    });

    if (isLoading) {
        return (
            <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--color-fg-secondary)]">Loading profile...</p>
                </div>
            </main>
        );
    }

    if (error || !profile) {
        return (
            <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <User size={64} className="text-[var(--color-fg-tertiary)] mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-[var(--color-fg)] mb-2">Profile Not Found</h1>
                    <p className="text-[var(--color-fg-secondary)]">
                        This profile doesn't exist or sharing is disabled.
                    </p>
                </div>
            </main>
        );
    }

    const totalHours = Math.floor((profile.stats.minutes_listened || 0) / 60);

    return (
        <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-8 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Header with Banner */}
                <div className="relative mb-8 rounded-2xl overflow-hidden bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                    {/* Banner Image */}
                    <div className="h-48 sm:h-64 w-full bg-[var(--color-bg-tertiary)] relative">
                        {profile.backgroundImage ? (
                            <img
                                src={profile.backgroundImage}
                                alt="Profile Banner"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-secondary)] to-transparent opacity-60" />
                    </div>

                    {/* Profile Info (Overlapping Banner) */}
                    <div className="relative px-6 pb-6 -mt-16 sm:-mt-20 flex flex-col items-center text-center">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--color-bg-secondary)] p-1.5 mb-4 shadow-xl">
                            <div className="w-full h-full rounded-full overflow-hidden bg-[var(--color-bg-tertiary)] relative">
                                {profile.profileImage ? (
                                    <img
                                        src={profile.profileImage}
                                        alt={profile.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                                        <User size={64} className="text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-fg)] mb-2">{profile.username}</h1>
                        <p className="text-[var(--color-fg-secondary)] text-sm">
                            Beat Scrobble Profile
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    <div className="glass-card p-4 rounded-xl border border-[var(--color-bg-tertiary)] text-center">
                        <BarChart3 size={20} className="text-[var(--color-primary)] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-[var(--color-fg)]">{profile.stats.listen_count.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Scrobbles</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-[var(--color-bg-tertiary)] text-center">
                        <TrendingUp size={20} className="text-[var(--color-accent)] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-[var(--color-fg)]">{profile.stats.artist_count.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Artists</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-[var(--color-bg-tertiary)] text-center">
                        <Disc size={20} className="text-[var(--color-success)] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-[var(--color-fg)]">{profile.stats.album_count.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Albums</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-[var(--color-bg-tertiary)] text-center">
                        <Music size={20} className="text-[var(--color-warning)] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-[var(--color-fg)]">{profile.stats.track_count.toLocaleString()}</p>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Tracks</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl border border-[var(--color-bg-tertiary)] text-center col-span-2 sm:col-span-1">
                        <Clock size={20} className="text-[var(--color-info)] mx-auto mb-2" />
                        <p className="text-2xl font-bold text-[var(--color-fg)]">{totalHours}h</p>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Listening</p>
                    </div>
                </div>

                {/* Top Artists */}
                {profile.topArtists && profile.topArtists.length > 0 && (
                    <div className="glass-card rounded-xl p-6 border border-[var(--color-bg-tertiary)] mb-6">
                        <h2 className="text-lg font-bold text-[var(--color-fg)] mb-4">Top Artists</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {profile.topArtists.slice(0, 5).map((artist, index) => (
                                <div key={artist.id} className="text-center">
                                    <div className="relative w-16 h-16 mx-auto mb-2">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-[var(--color-bg-tertiary)]">
                                            {artist.image ? (
                                                <img src={imageUrl(artist.image, "small")} alt={artist.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User size={24} className="text-[var(--color-fg-tertiary)]" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="absolute -top-1 -left-1 w-5 h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--color-fg)] truncate">{artist.name}</p>
                                    <p className="text-xs text-[var(--color-fg-secondary)]">{artist.listen_count} plays</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Albums */}
                {profile.topAlbums && profile.topAlbums.length > 0 && (
                    <div className="glass-card rounded-xl p-6 border border-[var(--color-bg-tertiary)]">
                        <h2 className="text-lg font-bold text-[var(--color-fg)] mb-4">Top Albums</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {profile.topAlbums.slice(0, 5).map((album, index) => (
                                <div key={album.id} className="text-center">
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] mb-2">
                                        {album.image ? (
                                            <img src={imageUrl(album.image, "medium")} alt={album.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Disc size={32} className="text-[var(--color-fg-tertiary)]" />
                                            </div>
                                        )}
                                        <span className="absolute top-2 left-2 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                            {index + 1}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[var(--color-fg)] truncate">{album.title}</p>
                                    <p className="text-xs text-[var(--color-fg-secondary)] truncate">{album.artists?.[0]?.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 pt-6 border-t border-[var(--color-bg-tertiary)]">
                    <p className="text-xs text-[var(--color-fg-tertiary)]">
                        Powered by <span className="font-medium">Beat Scrobble</span> • Self-hosted music analytics
                    </p>
                </div>
            </div>
        </main>
    );
}
