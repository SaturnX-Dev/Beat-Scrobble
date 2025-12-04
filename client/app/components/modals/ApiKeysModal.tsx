import { useQuery } from "@tanstack/react-query";
import { createApiKey, deleteApiKey, getApiKeys, type ApiKey } from "api/api";
import { AsyncButton } from "../AsyncButton";
import { useEffect, useRef, useState } from "react";
import { Copy, Trash, Eye, EyeOff } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";

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
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [profileCritiqueEnabled, setProfileCritiqueEnabled] = useState(false);
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

    useEffect(() => {
        setOpenRouterKey(getPreference('openrouter_api_key', ''));
        setAiPrompt(getPreference('ai_critique_prompt', 'Give a short, witty, and slightly pretentious music critique of this song. Keep it under 50 words.'));
        setAiEnabled(getPreference('ai_critique_enabled', false));
        setProfileCritiqueEnabled(getPreference('profile_critique_enabled', false));
    }, [getPreference]);

    const handleSaveAIConfig = () => {
        savePreference('openrouter_api_key', openRouterKey);
        savePreference('ai_critique_prompt', aiPrompt);
        savePreference('ai_critique_enabled', aiEnabled);
        savePreference('profile_critique_enabled', profileCritiqueEnabled);
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
                <h2 className="text-xl font-bold mb-4">Koito API Keys</h2>
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
                            <div className="flex flex-col gap-2 mt-2">
                                <label className="text-sm font-medium">Now Playing Prompt</label>
                                <textarea
                                    className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-md p-2 text-sm min-h-[60px]"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onBlur={handleSaveAIConfig}
                                    placeholder="Enter instructions for the AI critic..."
                                />
                            </div>
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

                    </div>
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
            )}
        </div>
    )
}