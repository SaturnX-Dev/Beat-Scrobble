
import { useState } from "react";
import { Form, useActionData, useNavigation, redirect, type ActionFunctionArgs } from "react-router";
import { FaArrowRight, FaCheck, FaMusic, FaSpotify, FaPalette, FaKey } from "react-icons/fa";

export const meta = () => {
    return [
        { title: "Welcome - Beat Scrobble" },
    ];
};

export async function clientAction({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "complete_setup") {
        // Save setup_completed to user preferences
        try {
            const res = await fetch("http://localhost:4110/apis/web/v1/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setup_completed: true,
                    // We could also save other keys here if we extracted them from formData
                })
            });

            if (res.ok) {
                return redirect("/");
            }
        } catch (e) {
            console.error(e);
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
                    className={`h-2 rounded-full transition-all duration-300 ${i <= current ? 'w-8 bg-purple-500' : 'w-2 bg-white/10'
                        }`}
                />
            ))}
        </div>
    )
}

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const totalSteps = 4;
    const navigation = useNavigation();

    const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-white">
            <div className="w-full max-w-2xl p-8">

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FaMusic className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Setup Beat Scrobble</h1>
                        <p className="text-gray-400 text-sm">Let's get your instance ready.</p>
                    </div>
                </div>

                <StepIndicator current={step} total={totalSteps} />

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                    {/* Step Content */}
                    <div className="relative z-10 transition-opacity duration-300">
                        {step === 0 && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Welcome!</h2>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Beat Scrobble is your premium, self-hosted music analytics platform.
                                    <br /><br />
                                    In the next few steps, we'll configure your primary data sources and aesthetic preferences so you can start tracking your listening habits immediately.
                                </p>
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-blue-200">
                                    <FaCheck className="mt-1" />
                                    <p className="text-sm">You are currently logged in as the Administrator. You have full control over this instance.</p>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center gap-3">
                                    <FaKey className="text-2xl text-purple-400" />
                                    <h2 className="text-2xl font-bold">AI Configuration</h2>
                                </div>
                                <p className="text-gray-400">
                                    Beat Scrobble uses AI to generate critiques and playlists.
                                    We recommend <strong>OpenRouter</strong> for the best compatibility.
                                </p>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">OpenRouter API Key</label>
                                        <input type="password" placeholder="sk-or-..." className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all" />
                                        <p className="text-xs text-gray-500">Required for "Comet AI" features.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center gap-3">
                                    <FaSpotify className="text-2xl text-green-400" />
                                    <h2 className="text-2xl font-bold">Spotify Integration</h2>
                                </div>
                                <p className="text-gray-400">
                                    Connect Spotify to fetch high-res artwork, metadata, and audio features.
                                    This does <strong>not</strong> require Premium.
                                </p>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Client ID</label>
                                        <input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500/50 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Client Secret</label>
                                        <input type="password" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500/50 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="flex items-center gap-3">
                                    <FaPalette className="text-2xl text-pink-400" />
                                    <h2 className="text-2xl font-bold">Finishing Touches</h2>
                                </div>
                                <p className="text-gray-400">
                                    You're all set! A unique API Key has been generated for you to use with clients like Pano Scrobbler or MultiScrobbler.
                                </p>

                                <div className="p-6 bg-black/30 rounded-xl border border-white/20 text-center space-y-2 relative group cursor-pointer hover:bg-black/40 transition-colors">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest">Your API Key</span>
                                    <p className="font-mono text-xl text-yellow-400 break-all select-all">
                                        bs_sk_8923748923748923...
                                    </p>
                                    <span className="text-xs text-gray-600 block pt-2">Click to copy</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-8 mt-4 border-t border-white/5 relative z-10">
                        <button
                            onClick={prev}
                            className={`text-gray-400 hover:text-white transition-colors ${step === 0 ? 'invisible' : ''}`}
                        >
                            Back
                        </button>

                        {step < totalSteps - 1 ? (
                            <button
                                onClick={next}
                                className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                Next <FaArrowRight size={12} />
                            </button>
                        ) : (
                            <Form method="post">
                                <input type="hidden" name="intent" value="complete_setup" />
                                <button
                                    type="submit"
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-2 rounded-full font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-105"
                                >
                                    Get Started
                                </button>
                            </Form>
                        )}
                    </div>

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
                </div>

            </div>
        </div>
    );
}
