import { useQuery } from "@tanstack/react-query";
import { createApiKey, deleteApiKey, getApiKeys, type ApiKey } from "api/api";
import { AsyncButton } from "../AsyncButton";
import { useEffect, useRef, useState } from "react";
import { Copy, Trash, Eye, EyeOff, RefreshCw } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";
import SpotifySettings from "./SpotifySettings";

type CopiedState = {
    x: number;
    y: number;
    visible: boolean;
};

export default function ApiKeysModal() {
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [err, setError] = useState<string>()
    const [displayData, setDisplayData] = useState<ApiKey[]>([])
    const [copied, setCopied] = useState<CopiedState | null>(null);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const textRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // AI Critique Preferences
    const { getPreference, savePreference } = usePreferences();
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [aiModel, setAiModel] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [profileCritiqueEnabled, setProfileCritiqueEnabled] = useState(false);
    const [profilePrompt, setProfilePrompt] = useState('');
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

    useEffect(() => {
        setOpenRouterKey(getPreference('openrouter_api_key', ''));
        setAiModel(getPreference('ai_model', 'google/gemini-2.0-flash-001'));
        setAiPrompt(getPreference('ai_critique_prompt', 'Give a short, witty, and slightly pretentious music critique of this song. Keep it under 50 words.'));
        setAiEnabled(getPreference('ai_critique_enabled', false));
        setProfileCritiqueEnabled(getPreference('profile_critique_enabled', false));
        setProfilePrompt(getPreference('profile_critique_prompt', 'You are a music critic. Give a short, witty, and slightly judgmental assessment of this user\'s listening habits based on their stats and top artists. Keep it under 60 words.'));
    }, [getPreference]);

    const handleSaveAIConfig = () => {
        savePreference('openrouter_api_key', openRouterKey);
        savePreference('ai_model', aiModel);
        savePreference('ai_critique_prompt', aiPrompt);
        savePreference('ai_critique_enabled', aiEnabled);
        savePreference('profile_critique_enabled', profileCritiqueEnabled);
        savePreference('profile_critique_prompt', profilePrompt);
    };

    const [clearingCache, setClearingCache] = useState(false);
    const [cacheCleared, setCacheCleared] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [importingCache, setImportingCache] = useState(false);
    const [importMsg, setImportMsg] = useState<string | null>(null);

    const handleClearAICache = async () => {
        setClearingCache(true);
        setCacheCleared(false);
        try {
            const res = await fetch('/apis/web/v1/ai/clear-cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                setCacheCleared(true);
                setTimeout(() => setCacheCleared(false), 3000);
            }
        } catch (err) {
            console.error('Failed to clear AI cache:', err);
        } finally {
            setClearingCache(false);
        }
    };

    const handleImportCache = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportingCache(true);
        setImportMsg(null);

        try {
            const text = await file.text();
            // Validate JSON
            JSON.parse(text);

            const res = await fetch('/apis/web/v1/ai/cache/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: text,
            });

            if (res.ok) {
                const data = await res.json();
                setImportMsg(`Success! Imported ${data.count} items.`);
            } else {
                setImportMsg('Failed to import cache.');
            }
        } catch (err) {
            console.error('Import failed:', err);
            setImportMsg('Invalid JSON file.');
        } finally {
            setImportingCache(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleRevealAndSelect = (key: string) => {
        setExpandedKey(key);
        setTimeout(() => {
            const el = textRefs.current[key];
            if (el) {
                const range = document.createRange();
                range.selectNodeContents(el);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        }, 0);
    };

    const { isPending, isError, data, error } = useQuery({
        queryKey: [
            'api-keys'
        ],
        queryFn: () => {
            return getApiKeys();
        },
    });

    useEffect(() => {
        if (data) {
            setDisplayData(data)
        }
    }, [data])

    if (isError) {
        return (
            <p className="error">Error: {error.message}</p>
        )
    }
    if (isPending) {
        return (
            <p>Loading...</p>
        )
    }

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }

        const parentRect = (e.currentTarget.closest(".relative") as HTMLElement).getBoundingClientRect();
        const buttonRect = e.currentTarget.getBoundingClientRect();

        setCopied({
            x: buttonRect.left - parentRect.left + buttonRect.width / 2,
            y: buttonRect.top - parentRect.top - 8,
            visible: true,
        });

        setTimeout(() => setCopied(null), 1500);
    };

    const fallbackCopy = (text: string) => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed"; // prevent scroll to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand("copy");
        } catch (err) {
            console.error("Fallback: Copy failed", err);
        }
        document.body.removeChild(textarea);
    };

    const handleCreateApiKey = () => {
        setError(undefined)
        if (input === "") {
            setError("a label must be provided")
            return
        }
        setLoading(true)
        createApiKey(input)
            .then(r => {
                setDisplayData([r, ...displayData])
                setInput('')
            }).catch((err) => setError(err.message))
        setLoading(false)
    }

    const handleDeleteApiKey = (id: number) => {
        setError(undefined)
        setLoading(true)
        deleteApiKey(id)
            .then(r => {
                if (r.ok) {
                    setDisplayData(displayData.filter((v) => v.id != id))
                } else {
                    r.json().then((r) => setError(r.error))
                }
            })
        setLoading(false)

    }

    return (
        <div className="flex flex-col gap-8 pb-8">
            {/* Internal API Keys Section */}
            <div className="">
                <h2 className="text-xl font-bold mb-4">Beat Scrobble API Keys</h2>
                <div className="flex flex-col gap-4 relative">
                    {displayData.map((v) => (
                        <div className="flex gap-2" key={v.key}>
                            <div
                                ref={el => {
                                    textRefs.current[v.key] = el;
                                }}
                                onClick={() => handleRevealAndSelect(v.key)}
                                className={`bg p-3 rounded-md flex-grow cursor-pointer select-text ${expandedKey === v.key ? '' : 'truncate'
                                    }`}
                                style={{ whiteSpace: 'nowrap' }}
                                title={v.key}
                            >
                                {expandedKey === v.key ? v.key : `${v.key.slice(0, 8)}... ${v.label}`}
                            </div>
                            <button onClick={(e) => handleCopy(e, v.key)} className="large-button px-5 rounded-md"><Copy size={16} /></button>
                            <AsyncButton loading={loading} onClick={() => handleDeleteApiKey(v.id)} confirm><Trash size={16} /></AsyncButton>
                        </div>
                    ))}
                    <div className="flex gap-2 w-full sm:w-3/5">
                        <input
                            type="text"
                            placeholder="Add a label for a new API key"
                            className="mx-auto fg bg rounded-md p-3 flex-grow"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <AsyncButton loading={loading} onClick={handleCreateApiKey}>Create</AsyncButton>
                    </div>
                    {err && <p className="error">{err}</p>}
                </div>
            </div>

            <hr className="border-[var(--color-bg-tertiary)]" />

            {/* External Services Section */}
            <div>
                <h2 className="text-xl font-bold mb-4">External Services</h2>
                <div className="flex flex-col gap-6">
                    {/* OpenRouter Config */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]/50 border border-[var(--color-bg-tertiary)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">AI Music Critique</h3>
                                <p className="text-sm text-[var(--color-fg-secondary)]">Powered by OpenRouter</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">OpenRouter API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type={showOpenRouterKey ? "text" : "password"}
                                    placeholder="sk-or-..."
                                    className="flex-grow bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm"
                                    value={openRouterKey}
                                    onChange={(e) => setOpenRouterKey(e.target.value)}
                                    onBlur={handleSaveAIConfig}
                                />
                                <button
                                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                    className="p-2 rounded-md bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)]"
                                >
                                    {showOpenRouterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-[var(--color-fg-secondary)]">
                                Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline hover:text-[var(--color-primary)]">openrouter.ai</a>
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">AI Model</label>
                            <input
                                type="text"
                                placeholder="google/gemini-2.0-flash-001"
                                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm"
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                onBlur={handleSaveAIConfig}
                            />
                            <p className="text-xs text-[var(--color-fg-secondary)]">
                                Specify the OpenRouter model ID to use (default: google/gemini-2.0-flash-001)
                            </p>
                        </div>

                        <hr className="border-[var(--color-bg-tertiary)] my-2" />

                        {/* Now Playing Critique Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium">Now Playing Critique</span>
                                <p className="text-xs text-[var(--color-fg-secondary)]">Show critique on the Now Playing card</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newValue = !aiEnabled;
                                    setAiEnabled(newValue);
                                    savePreference('ai_critique_enabled', newValue);
                                }}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${aiEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                                    }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${aiEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {aiEnabled && (
                            <PromptEditor
                                label="Now Playing Prompt"
                                value={aiPrompt}
                                onChange={setAiPrompt}
                                onSave={(newVal) => {
                                    savePreference('ai_critique_prompt', newVal);
                                    handleClearAICache();
                                }}
                                placeholder="Enter instructions for the AI critic..."
                                description="Instructions for the AI when critiquing your currently playing track."
                            />
                        )}

                        <hr className="border-[var(--color-bg-tertiary)] my-2" />

                        {/* Profile Critique Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium">Profile Critique</span>
                                <p className="text-xs text-[var(--color-fg-secondary)]">Show critique on your Profile page</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newValue = !profileCritiqueEnabled;
                                    setProfileCritiqueEnabled(newValue);
                                    savePreference('profile_critique_enabled', newValue);
                                }}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${profileCritiqueEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                                    }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${profileCritiqueEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {profileCritiqueEnabled && (
                            <PromptEditor
                                label="Profile Prompt"
                                value={profilePrompt}
                                onChange={setProfilePrompt}
                                onSave={(newVal) => {
                                    savePreference('profile_critique_prompt', newVal);
                                    handleClearAICache();
                                }}
                                placeholder="Enter instructions for the AI critic..."
                                description="Instructions for the AI when critiquing your overall profile."
                            />
                        )}

                        <hr className="border-[var(--color-bg-tertiary)] my-2" />

                        {/* AI Playlists Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium">AI Playlists</span>
                                <p className="text-xs text-[var(--color-fg-secondary)]">Generate personalized playlists based on your listening</p>
                            </div>
                            <button
                                onClick={() => {
                                    const currentValue = getPreference('ai_playlists_enabled', false);
                                    const newValue = !currentValue;
                                    savePreference('ai_playlists_enabled', newValue);
                                }}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${getPreference('ai_playlists_enabled', false) ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                                    }`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${getPreference('ai_playlists_enabled', false) ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {getPreference('ai_playlists_enabled', false) && (
                            <PromptEditor
                                label="Playlist Generation Prompt"
                                value={getPreference('ai_playlists_prompt', '')}
                                onChange={(val) => savePreference('ai_playlists_prompt', val)} // Direct save for now or manage state if needed
                                onSave={(newVal) => {
                                    savePreference('ai_playlists_prompt', newVal);
                                }}
                                placeholder="Instructions for AI playlist generation..."
                                description="Playlists are regenerated every 7 days automatically."
                            />
                        )}

                        <hr className="border-[var(--color-bg-tertiary)] my-2" />

                        {/* Regenerate AI Cache Button */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-medium">Regenerate AI Cache</span>
                                <p className="text-xs text-[var(--color-fg-secondary)]">Clear cached AI responses when you update prompts</p>
                            </div>
                            <button
                                onClick={handleClearAICache}
                                disabled={clearingCache}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${cacheCleared
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)]'
                                    } ${clearingCache ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw size={16} className={clearingCache ? 'animate-spin' : ''} />
                                {cacheCleared ? 'Cache Cleared!' : clearingCache ? 'Clearing...' : 'Clear Cache'}
                            </button>
                        </div>

                        <hr className="border-[var(--color-bg-tertiary)] my-2" />

                        {/* Advanced Cache Management */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                                <div>
                                    <span className="text-sm font-medium">Advanced: Cache Import/Export</span>
                                    <p className="text-xs text-[var(--color-fg-secondary)]">Manage your AI cache data separately</p>
                                </div>
                                <button className="text-[var(--color-fg-secondary)]">
                                    {showAdvanced ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="flex flex-col gap-3 mt-2 p-3 bg-[var(--color-bg)]/50 rounded-md border border-[var(--color-bg-tertiary)]">
                                    <p className="text-xs text-[var(--color-fg-secondary)]">
                                        AI Cache contains all generated critiques and playlists. Exporting this allows you to save tokens when moving to a new device.
                                        <br />
                                        <span className="text-yellow-500">Warning: Files can be large.</span>
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => window.open('/apis/web/v1/ai/cache/export', '_blank')}
                                            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] rounded-md py-2 text-sm font-medium transition-colors"
                                        >
                                            Export Cache JSON
                                        </button>
                                        <div className="flex-1 relative">
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleImportCache}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <button className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] rounded-md py-2 text-sm font-medium transition-colors">
                                                {importingCache ? 'Importing...' : 'Import Cache JSON'}
                                            </button>
                                        </div>
                                    </div>
                                    {importMsg && (
                                        <p className={`text-xs text-center ${importMsg.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                                            {importMsg}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Spotify Config */}
                    <SpotifySettings />
                </div>
            </div>

            {copied?.visible && (
                <div
                    style={{
                        position: "absolute",
                        top: copied.y,
                        left: copied.x,
                        transform: "translate(-50%, -100%)",
                    }}
                    className="pointer-events-none bg-black text-white text-sm px-2 py-1 rounded shadow-lg opacity-90 animate-fade z-50"
                >
                    Copied!
                </div>
            )
            }
        </div >
    )
}

function PromptEditor({ label, value, onChange, onSave, placeholder, description }: { label: string, value: string, onChange: (val: string) => void, onSave: (val: string) => void, placeholder: string, description?: string }) {
    const [expanded, setExpanded] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleSave = () => {
        onChange(localValue);
        onSave(localValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="border border-[var(--color-bg-tertiary)] rounded-lg overflow-hidden bg-[var(--color-bg)]">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
                <div className="text-left">
                    <span className="text-sm font-medium block">{label}</span>
                    {description && <span className="text-xs text-[var(--color-fg-secondary)]">{description}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-fg-tertiary)]">{expanded ? 'Collapse' : 'Edit'}</span>
                    <RefreshCw size={14} className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="p-3 border-t border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/30">
                    <textarea
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-3 text-sm min-h-[120px] focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        placeholder={placeholder}
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={handleSave}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${saved
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dim)]'
                                }`}
                        >
                            {saved ? 'Saved & Cache Cleared!' : 'Save Prompt'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}