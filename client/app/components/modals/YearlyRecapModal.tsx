import { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Music, User, Disc, Clock, X, Share2, Download, TrendingUp, Calendar, Headphones, Check, Loader2 } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";
import { useAppContext } from "~/providers/AppProvider";
import { imageUrl } from "api/api";

interface YearlyRecapData {
    year: number;
    totalScrobbles: number;
    totalMinutes: number;
    uniqueArtists: number;
    uniqueAlbums: number;
    uniqueTracks: number;
    topArtist: {
        id: number;
        name: string;
        image?: string;
        playCount: number;
    };
    topAlbum: {
        id: number;
        title: string;
        artist: string;
        image?: string;
        playCount: number;
    };
    topTrack: {
        id: number;
        name: string;
        artist: string;
        playCount: number;
    };
    topGenres: string[];
    mostActiveMonth: string;
}

interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    year?: number;
}

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, start: boolean = true) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);

    useEffect(() => {
        if (!start) return;

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (end - startValue) * eased);

            setCount(current);
            countRef.current = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [end, duration, start]);

    return count;
}

export default function YearlyRecapModal({ open, setOpen, year }: Props) {
    const currentYear = year || new Date().getFullYear();
    const [step, setStep] = useState(0);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const { savePreference, getPreference } = usePreferences();
    const { user } = useAppContext();

    const { data: recapData, isLoading, error } = useQuery({
        queryKey: ['yearly-recap', currentYear],
        queryFn: async () => {
            const res = await fetch(`/apis/web/v1/yearly-recap?year=${currentYear}`);
            if (!res.ok) throw new Error('Failed to load recap');
            return res.json() as Promise<YearlyRecapData>;
        },
        enabled: open,
    });

    // Auto-advance steps (20 seconds per slide)
    useEffect(() => {
        if (open && recapData && step < 7) {
            const timer = setTimeout(() => setStep(s => s + 1), 20000);
            return () => clearTimeout(timer);
        }
    }, [open, recapData, step]);

    // Reset step when modal opens
    useEffect(() => {
        if (open) setStep(0);
    }, [open]);

    // Mark as viewed
    useEffect(() => {
        if (open && recapData) {
            savePreference(`yearly_recap_viewed_${currentYear}`, true);
        }
    }, [open, recapData, currentYear, savePreference]);

    const formatHours = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
        }
        return `${hours} hours`;
    };

    // Share recap link (requires public profile enabled)
    const handleShare = async () => {
        const publicProfile = getPreference('public_profile_enabled', false);
        if (!publicProfile) {
            alert('Enable public profile sharing in settings to share your recap.');
            return;
        }

        const hostname = getPreference('share_hostname', window.location.origin);
        const username = user?.username || 'user';
        const url = `${hostname}/u/${username}?recap=${currentYear}`;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for older browsers
            alert(`Share this link: ${url}`);
        }
    };

    // Save recap as image
    const handleSave = async () => {
        if (!contentRef.current) return;

        setSaving(true);

        try {
            // Use html-to-image or canvas API
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(contentRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#0c0c0c',
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `recap-${currentYear}-${step + 1}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to save image:', err);
            alert('Unable to save image. Try taking a screenshot instead.');
        } finally {
            setSaving(false);
        }
    };

    // Animated count values
    const animatedScrobbles = useCountUp(recapData?.totalScrobbles || 0, 2500, step === 1);
    const animatedArtists = useCountUp(recapData?.uniqueArtists || 0, 2000, step === 2);

    const steps = [
        // Step 0: Intro Animation
        {
            bg: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            content: (
                <div className="text-center">
                    <div className="relative mb-6">
                        <Sparkles className="w-20 h-20 mx-auto text-yellow-300" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                        <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-yellow-300/20 blur-xl" style={{ animation: 'pulse 2s ease-in-out infinite 0.5s' }} />
                    </div>
                    <p className="text-2xl font-bold text-white mb-2">Your {currentYear}</p>
                    <p className="text-4xl font-black text-white tracking-tight">Music Recap</p>
                    <p className="text-white/70 mt-4 text-sm">Let's see what you listened to</p>
                </div>
            ),
        },
        // Step 1: Total Scrobbles with counter
        {
            bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            content: (
                <div className="text-center">
                    <Headphones className="w-16 h-16 mx-auto mb-6 text-white/90" />
                    <p className="text-lg text-white/80 mb-3">This year you played</p>
                    <p className="text-7xl font-black text-white mb-2 tabular-nums tracking-tight">
                        {animatedScrobbles.toLocaleString()}
                    </p>
                    <p className="text-2xl text-white/90 font-medium">songs</p>
                    <p className="text-white/60 text-sm mt-4">That's incredible!</p>
                </div>
            ),
        },
        // Step 2: Artists Explored
        {
            bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            content: (
                <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-6 text-white/90" />
                    <p className="text-lg text-white/80 mb-3">You explored</p>
                    <p className="text-7xl font-black text-white mb-2 tabular-nums">
                        {animatedArtists.toLocaleString()}
                    </p>
                    <p className="text-2xl text-white/90 font-medium">different artists</p>
                    <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xl font-bold text-white">{recapData?.uniqueAlbums}</p>
                            <p className="text-xs text-white/70">Albums</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xl font-bold text-white">{recapData?.uniqueTracks}</p>
                            <p className="text-xs text-white/70">Tracks</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-xl font-bold text-white">{formatHours(recapData?.totalMinutes || 0)}</p>
                            <p className="text-xs text-white/70">Listened</p>
                        </div>
                    </div>
                </div>
            ),
        },
        // Step 3: Top Artist
        {
            bg: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
            content: (
                <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-white/80" />
                    <p className="text-lg text-white/80 mb-4">Your #1 artist was</p>
                    {recapData?.topArtist?.image && (
                        <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                            <img src={imageUrl(recapData.topArtist.image, "medium")} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <p className="text-3xl font-black text-white mb-2">{recapData?.topArtist?.name}</p>
                    <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mt-2">
                        <Music size={16} className="text-white" />
                        <span className="text-white font-semibold">{recapData?.topArtist?.playCount} plays</span>
                    </div>
                </div>
            ),
        },
        // Step 4: Top Album
        {
            bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            content: (
                <div className="text-center">
                    <Disc className="w-12 h-12 mx-auto mb-4 text-white/80" style={{ animation: 'spin 8s linear infinite' }} />
                    <p className="text-lg text-white/80 mb-4">Your favorite album</p>
                    {recapData?.topAlbum?.image && (
                        <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl" style={{ transform: 'rotate(-3deg)' }}>
                            <img src={imageUrl(recapData.topAlbum.image, "medium")} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <p className="text-2xl font-black text-white mb-1">{recapData?.topAlbum?.title}</p>
                    <p className="text-white/80">{recapData?.topAlbum?.artist}</p>
                    <p className="text-white/60 text-sm mt-2">{recapData?.topAlbum?.playCount} plays</p>
                </div>
            ),
        },
        // Step 5: Top Track
        {
            bg: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
            content: (
                <div className="text-center">
                    <Music className="w-16 h-16 mx-auto mb-6 text-white/90" />
                    <p className="text-lg text-white/80 mb-4">Your #1 song</p>
                    <p className="text-3xl font-black text-white mb-2">{recapData?.topTrack?.name}</p>
                    <p className="text-xl text-white/80">{recapData?.topTrack?.artist}</p>
                    <div className="mt-6 bg-white/20 rounded-2xl p-4 inline-block">
                        <p className="text-4xl font-black text-white">{recapData?.topTrack?.playCount}</p>
                        <p className="text-white/70 text-sm">times played</p>
                    </div>
                </div>
            ),
        },
        // Step 6: Most Active Month
        {
            bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            content: (
                <div className="text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-6 text-white/90" />
                    <p className="text-lg text-white/80 mb-4">Your most active month</p>
                    <p className="text-5xl font-black text-white mb-2">{recapData?.mostActiveMonth}</p>
                    <p className="text-white/70 mt-4">You were really vibing!</p>
                </div>
            ),
        },
        // Step 7: Final Summary
        {
            bg: "linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)",
            content: (
                <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
                    <p className="text-2xl font-black text-white mb-6">Your {currentYear} Wrapped</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl p-4 border border-white/10">
                            <p className="text-2xl font-bold text-white">{recapData?.totalScrobbles?.toLocaleString()}</p>
                            <p className="text-xs text-white/70">Scrobbles</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-white/10">
                            <p className="text-2xl font-bold text-white">{formatHours(recapData?.totalMinutes || 0)}</p>
                            <p className="text-xs text-white/70">Listened</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-white/10">
                            <p className="text-2xl font-bold text-white">{recapData?.uniqueArtists}</p>
                            <p className="text-xs text-white/70">Artists</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-4 border border-white/10">
                            <p className="text-2xl font-bold text-white">{recapData?.uniqueTracks}</p>
                            <p className="text-xs text-white/70">Tracks</p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleShare}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-semibold flex items-center gap-2 border border-white/10 transition-all"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
                            {copied ? 'Copied!' : 'Share'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-full text-white text-sm font-semibold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <Modal isOpen={open} onClose={() => setOpen(false)} maxW={500} h={700} className="max-md:!w-screen max-md:!h-screen max-md:!max-w-none max-md:!rounded-none">
                <div
                    className="flex items-center justify-center h-full rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                    <div className="text-center text-white">
                        <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ animation: 'spin 2s linear infinite' }} />
                        <p className="text-lg font-medium">Loading your recap...</p>
                    </div>
                </div>
            </Modal>
        );
    }

    if (error || !recapData) {
        return (
            <Modal isOpen={open} onClose={() => setOpen(false)} maxW={500} h={400} className="max-md:!w-screen max-md:!h-auto max-md:!max-w-none">
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <p className="text-[var(--color-fg-secondary)] mb-4 text-center">
                        Unable to load your yearly recap. You may not have enough listening data for {currentYear}.
                    </p>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        );
    }

    const currentStep = steps[Math.min(step, steps.length - 1)];
    const progress = ((step + 1) / steps.length) * 100;

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} maxW={500} h={700} className="!p-0 overflow-hidden max-md:!w-screen max-md:!h-screen max-md:!max-w-none max-md:!rounded-none">
            <div
                ref={contentRef}
                className="relative h-full flex flex-col items-center justify-center p-8 transition-all duration-700"
                style={{ background: currentStep.bg }}
            >
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Collage Images (blurred, low opacity) */}
                    {recapData?.topArtist?.image && (
                        <div
                            className="absolute opacity-20"
                            style={{
                                top: '-10%',
                                right: '-5%',
                                width: '200px',
                                height: '200px',
                                backgroundImage: `url(${imageUrl(recapData.topArtist.image, 'medium')})`,
                                backgroundSize: 'cover',
                                borderRadius: '50%',
                                filter: 'blur(40px)',
                                animation: 'float 12s ease-in-out infinite',
                            }}
                        />
                    )}
                    {recapData?.topAlbum?.image && (
                        <div
                            className="absolute opacity-20"
                            style={{
                                bottom: '-5%',
                                left: '-10%',
                                width: '250px',
                                height: '250px',
                                backgroundImage: `url(${imageUrl(recapData.topAlbum.image, 'medium')})`,
                                backgroundSize: 'cover',
                                borderRadius: '30%',
                                filter: 'blur(50px)',
                                animation: 'float 15s ease-in-out infinite reverse',
                            }}
                        />
                    )}

                    {/* Glowing orbs */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '300px',
                            height: '300px',
                            top: '10%',
                            left: '-15%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                            animation: 'float 8s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '200px',
                            height: '200px',
                            bottom: '20%',
                            right: '-10%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
                            animation: 'float 10s ease-in-out infinite reverse',
                        }}
                    />
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '150px',
                            height: '150px',
                            top: '60%',
                            left: '70%',
                            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                            animation: 'float 6s ease-in-out infinite 2s',
                        }}
                    />

                    {/* Floating Particles */}
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: `${3 + Math.random() * 5}px`,
                                height: `${3 + Math.random() * 5}px`,
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                opacity: 0.3 + Math.random() * 0.4,
                                animation: `float ${5 + Math.random() * 10}s ease-in-out infinite ${Math.random() * 5}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Progress bar */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Close button */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="relative z-10 w-full" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
                    {currentStep.content}
                </div>

                {/* Navigation dots */}
                <div className="absolute bottom-6 flex gap-2 z-10">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${i === step
                                ? 'bg-white w-8'
                                : i < step
                                    ? 'bg-white/60 w-2'
                                    : 'bg-white/30 w-2 hover:bg-white/50'
                                }`}
                        />
                    ))}
                </div>

                {/* Skip/Next button */}
                {step < steps.length - 1 && (
                    <button
                        onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}
                        className="absolute bottom-6 right-6 text-white/70 hover:text-white text-sm font-medium transition-colors z-10"
                    >
                        Skip →
                    </button>
                )}
            </div>
        </Modal>
    );
}
