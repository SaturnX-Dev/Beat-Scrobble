import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Music, Download, RefreshCw, ExternalLink, Sparkles, Clock, Heart, Disc, Radio, Calendar, Gem, Zap } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";
import { imageUrl } from "api/api";

interface Track {
    id: number;
    name: string;
    artist: string;
    album: string;
    image?: string;
}

interface Playlist {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    tracks: Track[];
    lastGenerated: string;
    color: string;
}

const PLAYLIST_TYPES = [
    { id: "mood_mix", name: "Mood Mix", description: "Tracks matching your current vibe", icon: Heart, color: "from-pink-500 to-rose-600" },
    { id: "genre_dive", name: "Genre Dive", description: "Deep dive into your top genres", icon: Music, color: "from-purple-500 to-indigo-600" },
    { id: "discover_weekly", name: "Discover Weekly", description: "New artists based on your taste", icon: Sparkles, color: "from-green-500 to-emerald-600" },
    { id: "time_capsule", name: "Time Capsule", description: "Your most played from the past", icon: Clock, color: "from-amber-500 to-orange-600" },
    { id: "artist_radio", name: "Artist Radio", description: "Mix from your favorite artists", icon: Radio, color: "from-blue-500 to-cyan-600" },
    { id: "decade_mix", name: "Decade Mix", description: "Best of each decade you love", icon: Calendar, color: "from-red-500 to-pink-600" },
    { id: "hidden_gems", name: "Hidden Gems", description: "Tracks you might have missed", icon: Gem, color: "from-teal-500 to-green-600" },
];

export default function Playlists() {
    const queryClient = useQueryClient();
    const { getPreference, savePreference } = usePreferences();
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState<string | null>(null);

    // Get stored playlists from preferences
    const { data: playlists, isLoading } = useQuery({
        queryKey: ['ai-playlists'],
        queryFn: async () => {
            const stored = getPreference('ai_playlists', null);
            if (stored) {
                return stored as Record<string, Playlist>;
            }
            return null;
        },
    });

    // Check if playlists need regeneration (every 7 days)
    const needsRegeneration = (lastGenerated: string) => {
        if (!lastGenerated) return true;
        const last = new Date(lastGenerated);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 7;
    };

    // Generate playlist with AI
    const generatePlaylist = useMutation({
        mutationFn: async (playlistType: string) => {
            setRegenerating(playlistType);
            const res = await fetch('/apis/web/v1/ai/generate-playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: playlistType }),
            });
            if (!res.ok) throw new Error('Failed to generate playlist');
            return res.json();
        },
        onSuccess: (data, playlistType) => {
            const currentPlaylists = playlists || {};
            const newPlaylists = {
                ...currentPlaylists,
                [playlistType]: {
                    ...data,
                    lastGenerated: new Date().toISOString(),
                },
            };
            savePreference('ai_playlists', newPlaylists);
            queryClient.invalidateQueries({ queryKey: ['ai-playlists'] });
            setRegenerating(null);
        },
        onError: () => {
            setRegenerating(null);
        },
    });

    // Export playlist to JSON
    const exportPlaylist = (playlist: Playlist) => {
        const exportData = {
            name: playlist.name,
            description: playlist.description,
            generatedAt: playlist.lastGenerated,
            tracks: playlist.tracks,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.id}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const aiEnabled = getPreference('ai_playlists_enabled', false);
    const hasApiKey = getPreference('openrouter_api_key', '');

    return (
        <main className="min-h-screen w-full bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg)] px-4 py-6 md:py-10 pb-24">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 bg-[var(--color-primary)]/10 rounded-full">
                        <Zap size={16} className="text-[var(--color-primary)]" />
                        <span className="text-sm font-medium text-[var(--color-primary)]">Comet AI</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-fg)] tracking-tight mb-2">
                        Your Playlists
                    </h1>
                    <p className="text-[var(--color-fg-secondary)] text-sm md:text-base max-w-lg mx-auto">
                        AI-generated playlists based on your listening history, updated every 7 days
                    </p>
                </div>

                {/* Warning if AI not configured */}
                {(!aiEnabled || !hasApiKey) && (
                    <div className="mb-8 p-4 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30">
                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-[var(--color-warning)]" />
                            <div>
                                <p className="font-medium text-[var(--color-fg)]">AI Playlists not enabled</p>
                                <p className="text-sm text-[var(--color-fg-secondary)]">
                                    Enable AI Playlists in Settings → API Keys and add your OpenRouter API key.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Playlists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {PLAYLIST_TYPES.map((type) => {
                        const playlist = playlists?.[type.id];
                        const Icon = type.icon;
                        const isGenerating = regenerating === type.id;
                        const shouldRegenerate = playlist ? needsRegeneration(playlist.lastGenerated) : true;

                        return (
                            <div
                                key={type.id}
                                className={`group relative overflow-hidden rounded-2xl border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/50 backdrop-blur-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-lg ${selectedPlaylist === type.id ? 'ring-2 ring-[var(--color-primary)]' : ''
                                    }`}
                            >
                                {/* Gradient Header */}
                                <div className={`h-24 bg-gradient-to-br ${type.color} flex items-center justify-center relative`}>
                                    <Icon size={40} className="text-white/90" />
                                    {shouldRegenerate && !isGenerating && (
                                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 rounded-full text-[10px] text-white">
                                            New available
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-[var(--color-fg)] mb-1">{type.name}</h3>
                                    <p className="text-xs text-[var(--color-fg-secondary)] mb-3">{type.description}</p>

                                    {playlist && (
                                        <p className="text-[10px] text-[var(--color-fg-tertiary)] mb-3">
                                            {playlist.tracks?.length || 0} tracks • Updated {new Date(playlist.lastGenerated).toLocaleDateString()}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => generatePlaylist.mutate(type.id)}
                                            disabled={isGenerating || !aiEnabled || !hasApiKey}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGenerating ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={14} />
                                            )}
                                            {playlist ? 'Regenerate' : 'Generate'}
                                        </button>

                                        {playlist && (
                                            <>
                                                <button
                                                    onClick={() => setSelectedPlaylist(
                                                        selectedPlaylist === type.id ? null : type.id
                                                    )}
                                                    className="px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg)] text-xs font-medium rounded-lg transition-all"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => exportPlaylist(playlist)}
                                                    className="px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg)] rounded-lg transition-all"
                                                    title="Export to JSON"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Selected Playlist Detail */}
                {selectedPlaylist && playlists?.[selectedPlaylist] && (
                    <div className="glass-card rounded-xl p-6 border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[var(--color-fg)]">
                                {PLAYLIST_TYPES.find(t => t.id === selectedPlaylist)?.name}
                            </h2>
                            <button
                                onClick={() => setSelectedPlaylist(null)}
                                className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {playlists[selectedPlaylist].tracks?.map((track, index) => (
                                <Link
                                    key={track.id || index}
                                    to={track.id ? `/track/${track.id}` : '#'}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-tertiary)]/50 transition-colors"
                                >
                                    <span className="text-xs font-bold text-[var(--color-fg-tertiary)] w-6">
                                        {index + 1}
                                    </span>
                                    <div className="w-10 h-10 rounded bg-[var(--color-bg-tertiary)] overflow-hidden flex-shrink-0">
                                        {track.image ? (
                                            <img src={imageUrl(track.image, "small")} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Music size={16} className="text-[var(--color-fg-tertiary)]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--color-fg)] truncate">{track.name}</p>
                                        <p className="text-xs text-[var(--color-fg-secondary)] truncate">{track.artist}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navidrome Integration Skeleton */}
                <div className="mt-8 p-4 rounded-xl bg-[var(--color-bg-secondary)]/30 border border-dashed border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)]">
                                <ExternalLink size={20} className="text-[var(--color-fg-tertiary)]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--color-fg)]">Navidrome Integration</h3>
                                <p className="text-xs text-[var(--color-fg-secondary)]">
                                    Export playlists directly to your Navidrome server
                                </p>
                            </div>
                        </div>
                        <button
                            disabled
                            className="px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-fg-secondary)] text-sm rounded-lg cursor-not-allowed opacity-50"
                            title="Coming soon - Navidrome API integration"
                        >
                            Coming Soon
                        </button>
                    </div>
                    {/* TODO: Future implementation notes */}
                    {/* 
                        Navidrome Integration Plan:
                        1. Add navidrome_url and navidrome_api_key to preferences
                        2. Create endpoint: POST /apis/web/v1/navidrome/export-playlist
                        3. Use Navidrome API to create playlist:
                           - POST /rest/createPlaylist
                           - POST /rest/updatePlaylist (for adding tracks)
                        4. Add auto-sync option: regenerate + export every 7 days
                        5. Handle Subsonic API authentication (username + MD5 password token)
                    */}
                </div>
            </div>
        </main>
    );
}
