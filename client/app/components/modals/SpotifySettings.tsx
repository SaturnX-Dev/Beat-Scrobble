import { useState, useEffect } from "react";
import { getSpotifyConfigured, bulkFetchSpotifyMetadata } from "api/api";
import { usePreferences } from "~/hooks/usePreferences";

export default function SpotifySettings() {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const { preferences, savePreference } = usePreferences();

    // Metadata fetch toggles
    const [fetchArtistMetadata, setFetchArtistMetadata] = useState(true);
    const [fetchAlbumMetadata, setFetchAlbumMetadata] = useState(true);
    const [fetchTrackMetadata, setFetchTrackMetadata] = useState(true);
    const [showMetadataOnPages, setShowMetadataOnPages] = useState(true);

    // Bulk fetch state
    const [bulkFetching, setBulkFetching] = useState(false);
    const [bulkResult, setBulkResult] = useState<{ processed: number; failed: number; skipped: number } | null>(null);

    useEffect(() => {
        getSpotifyConfigured()
            .then((res) => setConfigured(res.configured))
            .catch(() => setConfigured(false));
    }, []);

    useEffect(() => {
        if (preferences) {
            setClientId(preferences.spotify_client_id || "");
            setClientSecret(preferences.spotify_client_secret || "");
            setFetchArtistMetadata(preferences.spotify_fetch_artist_metadata !== false);
            setFetchAlbumMetadata(preferences.spotify_fetch_album_metadata !== false);
            setFetchTrackMetadata(preferences.spotify_fetch_track_metadata !== false);
            setShowMetadataOnPages(preferences.spotify_show_metadata !== false);
        }
    }, [preferences]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await savePreference("spotify_client_id", clientId);
            await savePreference("spotify_client_secret", clientSecret);
            setMessage({ type: "success", text: "Spotify credentials saved successfully!" });
            setConfigured(clientId !== "" && clientSecret !== "");
        } catch (e) {
            console.error(e);
            setMessage({ type: "error", text: "Failed to save Spotify credentials." });
        } finally {
            setSaving(false);
        }
    };

    const handleBulkFetch = async () => {
        setBulkFetching(true);
        setBulkResult(null);
        setMessage(null);
        try {
            const result = await bulkFetchSpotifyMetadata();
            setBulkResult({ processed: result.processed, failed: result.failed, skipped: result.skipped });
            setMessage({ type: "success", text: `Metadata fetched! ${result.processed} updated, ${result.skipped} skipped, ${result.failed} failed.` });
        } catch (e) {
            console.error(e);
            setMessage({ type: "error", text: "Bulk fetch failed. Ensure Spotify is configured." });
        } finally {
            setBulkFetching(false);
        }
    };

    const handleToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        await savePreference(key, value);
    };

    const ToggleSwitch = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-bg-tertiary)] last:border-b-0">
            <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-fg)]">{label}</p>
                <p className="text-xs text-[var(--color-fg-tertiary)]">{description}</p>
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-[var(--color-fg)]">Spotify Integration</h2>
                <p className="text-[var(--color-fg-secondary)]">
                    Connect your Spotify Developer credentials to enable metadata fetching for artists, albums, and tracks.
                </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-4">Connection Status</h3>
                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${configured === null
                            ? "bg-yellow-500"
                            : configured
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                    />
                    <span className="text-sm text-[var(--color-fg-secondary)]">
                        {configured === null
                            ? "Checking..."
                            : configured
                                ? "Spotify is configured"
                                : "Spotify is not configured"}
                    </span>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-4">Spotify API Credentials</h3>
                <p className="text-sm text-[var(--color-fg-secondary)] mb-4">
                    Get your credentials from the{" "}
                    <a
                        href="https://developer.spotify.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                    >
                        Spotify Developer Dashboard
                    </a>
                    .
                </p>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--color-fg)]">Client ID</label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="Enter your Spotify Client ID"
                            className="px-4 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] text-[var(--color-fg)] placeholder-[var(--color-fg-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--color-fg)]">Client Secret</label>
                        <input
                            type="password"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder="Enter your Spotify Client Secret"
                            className="px-4 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] text-[var(--color-fg)] placeholder-[var(--color-fg-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
                        />
                    </div>

                    {message && (
                        <div
                            className={`p-3 rounded-lg text-sm ${message.type === "success"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dim)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Credentials"}
                    </button>
                </div>
            </div>

            {/* Metadata Fetch Toggles */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-4">Metadata Fetching</h3>
                <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                    Control what metadata is fetched when you click the refresh button on artist/album pages.
                </p>

                <ToggleSwitch
                    enabled={fetchArtistMetadata}
                    onChange={(v) => handleToggle("spotify_fetch_artist_metadata", v, setFetchArtistMetadata)}
                    label="Fetch Artist Metadata"
                    description="Genres, popularity, and Spotify ID for artists"
                />
                <ToggleSwitch
                    enabled={fetchAlbumMetadata}
                    onChange={(v) => handleToggle("spotify_fetch_album_metadata", v, setFetchAlbumMetadata)}
                    label="Fetch Album Metadata"
                    description="Release date, genres, and popularity for albums"
                />
                <ToggleSwitch
                    enabled={fetchTrackMetadata}
                    onChange={(v) => handleToggle("spotify_fetch_track_metadata", v, setFetchTrackMetadata)}
                    label="Fetch Track Metadata"
                    description="Popularity and Spotify ID for tracks"
                />
            </div>

            {/* Bulk Fetch All */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-2">Auto-Fetch All Metadata</h3>
                <p className="text-xs text-[var(--color-fg-tertiary)] mb-4">
                    Automatically fetch metadata from Spotify for your top 100 artists and albums. This searches Spotify by name and updates each item.
                </p>

                {bulkResult && (
                    <div className="mb-4 p-3 rounded-lg bg-[var(--color-bg)]/50 text-sm">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold text-green-400">{bulkResult.processed}</p>
                                <p className="text-xs text-[var(--color-fg-tertiary)]">Updated</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-yellow-400">{bulkResult.skipped}</p>
                                <p className="text-xs text-[var(--color-fg-tertiary)]">Skipped</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-red-400">{bulkResult.failed}</p>
                                <p className="text-xs text-[var(--color-fg-tertiary)]">Failed</p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleBulkFetch}
                    disabled={bulkFetching || !configured}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {bulkFetching ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Fetching... (may take a few minutes)
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            Fetch All Metadata from Spotify
                        </>
                    )}
                </button>

                {!configured && (
                    <p className="mt-2 text-xs text-yellow-400 text-center">
                        Configure Spotify credentials above to enable bulk fetch
                    </p>
                )}
            </div>

            {/* Display Options */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-4">Display Options</h3>

                <ToggleSwitch
                    enabled={showMetadataOnPages}
                    onChange={(v) => handleToggle("spotify_show_metadata", v, setShowMetadataOnPages)}
                    label="Show Metadata on Pages"
                    description="Display genres, popularity, and other metadata on artist/album pages"
                />
            </div>

            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">
                <h3 className="font-semibold text-[var(--color-fg)] mb-2">Features</h3>
                <ul className="text-sm text-[var(--color-fg-secondary)] list-disc list-inside space-y-1">
                    <li>Fetch artist genres and popularity</li>
                    <li>Fetch album release dates and genres</li>
                    <li>Search for Spotify images for covers</li>
                    <li>Enrich your library with Spotify metadata</li>
                </ul>
            </div>
        </div>
    );
}
