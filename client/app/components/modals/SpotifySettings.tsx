import { useState, useEffect } from "react";
import { getSpotifyConfigured } from "api/api";
import { usePreferences } from "~/hooks/usePreferences";

export default function SpotifySettings() {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const { preferences, savePreference } = usePreferences();

    useEffect(() => {
        getSpotifyConfigured()
            .then((res) => setConfigured(res.configured))
            .catch(() => setConfigured(false));
    }, []);

    useEffect(() => {
        if (preferences) {
            setClientId(preferences.spotify_client_id || "");
            setClientSecret(preferences.spotify_client_secret || "");
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
