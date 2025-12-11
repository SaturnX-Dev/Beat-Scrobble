import { useState, useEffect } from "react";
import { Form, useActionData, useNavigation, type ActionFunctionArgs } from "react-router";
import { FaArrowRight, FaCheck, FaMusic, FaSpotify, FaPalette, FaKey, FaCopy } from "react-icons/fa";

export const meta = () => {
    return [
        { title: "Welcome - Beat Scrobble" },
    ];
};

export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "complete_setup") {
        const openrouterKey = formData.get("openrouter_key") as string;
        const spotifyClientId = formData.get("spotify_client_id") as string;
        const spotifyClientSecret = formData.get("spotify_client_secret") as string;

        try {
            // Save preferences
            const prefRes = await fetch("/apis/web/v1/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    setup_completed: true,
                    openrouter_key: openrouterKey || undefined,
                    spotify_client_id: spotifyClientId || undefined,
                    spotify_client_secret: spotifyClientSecret || undefined,
                })
            });

            if (prefRes.ok) {
                window.location.href = "/";
                return null;
            } else {
                return { error: "Failed to save settings" };
            }
        } catch (e) {
            console.error(e);
            return { error: "Connection error" };
        }
    }
    return null;
}

const StepIndicator = ({ current, total }: { current: number, total: number }) => {
    return (
        <div className="flex items-center space-x-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i <= current
                        ? 'w-8 bg-[var(--color-primary)]'
                        : 'w-2 bg-[var(--color-bg-tertiary)]'
                        }`}
                />
            ))}
        </div>
    )
}

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const totalSteps = 4;
    const navigation = useNavigation();
    const actionData = useActionData();

    // Form state
    const [openrouterKey, setOpenrouterKey] = useState("");
    const [spotifyClientId, setSpotifyClientId] = useState("");
    const [spotifyClientSecret, setSpotifyClientSecret] = useState("");

    const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    // Generate API key when reaching step 3
    useEffect(() => {
        if (step === 3 && !apiKey) {
            fetch("/apis/web/v1/user/apikeys", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                credentials: "include",
                body: new URLSearchParams({ label: "Default Key" }),
            })
                .then(r => r.json())
                .then(data => {
                    if (data.key) {
                        setApiKey(data.key);
                    }
                })
                .catch(console.error);
        }
    }, [step, apiKey]);

    const copyApiKey = () => {
        if (apiKey) {
            navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isSubmitting = navigation.state === "submitting";

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-fg)]">
            <div className="w-full max-w-2xl p-8">

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 10px 40px var(--color-primary)' }}>
                        <FaMusic className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Setup Beat Scrobble</h1>
                        <p className="text-[var(--color-fg-secondary)] text-sm">Let's get your instance ready.</p>
                    </div>
                </div>

                <StepIndicator current={step} total={totalSteps} />

                <div className="glass-card rounded-2xl p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                    {/* Step Content */}
                    <div className="relative z-10 transition-opacity duration-300">
                        {step === 0 && (
                            <div className="space-y-6 animate-entry">
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]">Welcome!</h2>
                                <p className="text-[var(--color-fg-secondary)] text-lg leading-relaxed">
                                    Beat Scrobble is your premium, self-hosted music analytics platform.
                                    <br /><br />
                                    In the next few steps, we'll configure your primary data sources and aesthetic preferences so you can start tracking your listening habits immediately.
                                </p>
                                <div className="p-4 bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 rounded-xl flex gap-3 text-[var(--color-info)]">
                                    <FaCheck className="mt-1" />
                                    <p className="text-sm">You are currently logged in as the Administrator. You have full control over this instance.</p>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-entry">
                                <div className="flex items-center gap-3">
                                    <FaKey className="text-2xl text-[var(--color-primary)]" />
                                    <h2 className="text-2xl font-bold text-[var(--color-fg)]">AI Configuration</h2>
                                </div>
                                <p className="text-[var(--color-fg-secondary)]">
                                    Beat Scrobble uses AI to generate critiques and playlists.
                                    We recommend <strong>OpenRouter</strong> for the best compatibility.
                                </p>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--color-fg-secondary)]">OpenRouter API Key</label>
                                        <input
                                            type="password"
                                            name="openrouter_key"
                                            placeholder="sk-or-..."
                                            value={openrouterKey}
                                            onChange={(e) => setOpenrouterKey(e.target.value)}
                                            className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[var(--color-primary)]/50 outline-none transition-all text-[var(--color-fg)]"
                                        />
                                        <p className="text-xs text-[var(--color-fg-tertiary)]">Optional. Required for "Comet AI" features.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-entry">
                                <div className="flex items-center gap-3">
                                    <FaSpotify className="text-2xl text-[var(--color-success)]" />
                                    <h2 className="text-2xl font-bold text-[var(--color-fg)]">Spotify Integration</h2>
                                </div>
                                <p className="text-[var(--color-fg-secondary)]">
                                    Connect Spotify to fetch high-res artwork, metadata, and audio features.
                                    This does <strong>not</strong> require Premium.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--color-fg-secondary)]">Client ID</label>
                                        <input
                                            type="text"
                                            name="spotify_client_id"
                                            value={spotifyClientId}
                                            onChange={(e) => setSpotifyClientId(e.target.value)}
                                            className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[var(--color-success)]/50 outline-none transition-all text-[var(--color-fg)]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-[var(--color-fg-secondary)]">Client Secret</label>
                                        <input
                                            type="password"
                                            name="spotify_client_secret"
                                            value={spotifyClientSecret}
                                            onChange={(e) => setSpotifyClientSecret(e.target.value)}
                                            className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[var(--color-success)]/50 outline-none transition-all text-[var(--color-fg)]"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--color-fg-tertiary)]">Optional. You can configure this later in Settings.</p>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-entry">
                                <div className="flex items-center gap-3">
                                    <FaPalette className="text-2xl text-[var(--color-accent)]" />
                                    <h2 className="text-2xl font-bold text-[var(--color-fg)]">You're All Set!</h2>
                                </div>
                                <p className="text-[var(--color-fg-secondary)]">
                                    A unique API Key has been generated for you to use with clients like Pano Scrobbler or MultiScrobbler.
                                </p>

                                <div
                                    onClick={copyApiKey}
                                    className="p-6 bg-[var(--color-bg)] rounded-xl border border-[var(--color-bg-tertiary)] text-center space-y-2 relative group cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
                                >
                                    <span className="text-xs text-[var(--color-fg-tertiary)] uppercase tracking-widest">Your API Key</span>
                                    <p className="font-mono text-xl text-[var(--color-warning)] break-all select-all">
                                        {apiKey || "Generating..."}
                                    </p>
                                    <span className="text-xs text-[var(--color-fg-tertiary)] flex items-center justify-center gap-2 pt-2">
                                        <FaCopy size={12} />
                                        {copied ? "Copied!" : "Click to copy"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error message */}
                    {actionData?.error && (
                        <div className="p-3 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-sm text-center mt-4">
                            {actionData.error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-8 mt-4 border-t border-[var(--color-bg-tertiary)] relative z-10">
                        <button
                            onClick={prev}
                            className={`text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors ${step === 0 ? 'invisible' : ''}`}
                        >
                            Back
                        </button>

                        {step < totalSteps - 1 ? (
                            <button
                                onClick={next}
                                className="bg-[var(--color-fg)] text-[var(--color-bg)] px-6 py-2 rounded-full font-bold hover:opacity-90 transition-colors flex items-center gap-2"
                            >
                                Next <FaArrowRight size={12} />
                            </button>
                        ) : (
                            <Form method="post">
                                <input type="hidden" name="intent" value="complete_setup" />
                                <input type="hidden" name="openrouter_key" value={openrouterKey} />
                                <input type="hidden" name="spotify_client_id" value={spotifyClientId} />
                                <input type="hidden" name="spotify_client_secret" value={spotifyClientSecret} />
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white px-8 py-2 rounded-full font-bold hover:opacity-90 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    style={{ boxShadow: '0 10px 30px var(--color-primary)' }}
                                >
                                    {isSubmitting ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Get Started"
                                    )}
                                </button>
                            </Form>
                        )}
                    </div>

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-accent)]/10 blur-[80px] rounded-full pointer-events-none" />
                </div>

            </div>
        </div>
    );
}
