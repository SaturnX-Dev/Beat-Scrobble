import { useState, useEffect } from "react";
import { getSpotifyConfigured, spotifySearch, type SpotifySearchResult } from "api/api";
import { Search, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";

interface Props {
    type: "Artist" | "Album" | "Track";
    onSelect: (url: string) => void;
    initialQuery?: string;
}

export default function SpotifyImagePicker({ type, onSelect, initialQuery = "" }: Props) {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SpotifySearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getSpotifyConfigured().then(res => setConfigured(res.configured));
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError("");
        try {
            const searchType = type.toLowerCase() as "artist" | "album" | "track";
            const res = await spotifySearch(query, searchType);
            setResults(res.results);
        } catch (err: any) {
            setError(err.message || "Failed to search Spotify");
        } finally {
            setLoading(false);
        }
    };

    if (configured === null) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    if (!configured) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-[var(--color-bg-tertiary)]/30 rounded-xl border border-[var(--color-bg-tertiary)]">
                <AlertCircle className="w-10 h-10 text-[var(--color-fg-secondary)] mb-3" />
                <h3 className="font-bold text-[var(--color-fg)]">Spotify Not Configured</h3>
                <p className="text-sm text-[var(--color-fg-secondary)] mt-1 mb-3">
                    Configure Spotify Client ID and Secret in Settings to search for images.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-fg-tertiary)]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder={`Search for ${type}...`}
                        className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] pl-9 pr-4 py-2 rounded-lg border border-transparent focus:border-[var(--color-primary)] outline-none transition-colors"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-dim)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                </button>
            </div>

            {error && (
                <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {results.map((item) => {
                    const image = item.images[0]; // Get largest image
                    if (!image) return null;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect(image.url)}
                            className="group relative aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] hover:ring-2 hover:ring-[var(--color-primary)] transition-all text-left"
                        >
                            <img
                                src={image.url}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <p className="text-white text-xs font-bold truncate">{item.name}</p>
                                {item.artists && (
                                    <p className="text-gray-300 text-[10px] truncate">{item.artists.join(", ")}</p>
                                )}
                            </div>
                        </button>
                    );
                })}

                {results.length === 0 && !loading && query && !error && (
                    <div className="col-span-full text-center py-8 text-[var(--color-fg-tertiary)]">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No results found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
