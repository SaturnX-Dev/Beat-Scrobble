import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Music, User, Disc, Clock, X, Share2, Download } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";
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

export default function YearlyRecapModal({ open, setOpen, year }: Props) {
    const currentYear = year || new Date().getFullYear();
    const [step, setStep] = useState(0);
    const { savePreference, getPreference } = usePreferences();

    const { data: recapData, isLoading, error } = useQuery({
        queryKey: ['yearly-recap', currentYear],
        queryFn: async () => {
            const res = await fetch(`/apis/web/v1/yearly-recap?year=${currentYear}`);
            if (!res.ok) throw new Error('Failed to load recap');
            return res.json() as Promise<YearlyRecapData>;
        },
        enabled: open,
    });

    // Auto-advance steps for animation effect
    useEffect(() => {
        if (open && recapData && step < 5) {
            const timer = setTimeout(() => setStep(s => s + 1), 800);
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
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days} days`;
        }
        return `${hours} hours`;
    };

    const steps = [
        // Step 0: Total Scrobbles
        {
            bg: "from-purple-600 to-pink-600",
            content: (
                <div className="text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-300 animate-pulse" />
                    <p className="text-lg text-white/80 mb-2">In {currentYear}, you listened to</p>
                    <p className="text-6xl font-bold text-white mb-2">
                        {recapData?.totalScrobbles.toLocaleString()}
                    </p>
                    <p className="text-xl text-white/90">songs</p>
                </div>
            ),
        },
        // Step 1: Listening Time
        {
            bg: "from-blue-600 to-cyan-600",
            content: (
                <div className="text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-cyan-300" />
                    <p className="text-lg text-white/80 mb-2">That's</p>
                    <p className="text-5xl font-bold text-white mb-2">
                        {formatHours(recapData?.totalMinutes || 0)}
                    </p>
                    <p className="text-xl text-white/90">of pure music</p>
                </div>
            ),
        },
        // Step 2: Top Artist
        {
            bg: "from-green-600 to-emerald-600",
            content: (
                <div className="text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
                    <p className="text-lg text-white/80 mb-3">Your top artist was</p>
                    {recapData?.topArtist.image && (
                        <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-4 border-white/30">
                            <img src={imageUrl(recapData.topArtist.image, "medium")} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <p className="text-3xl font-bold text-white mb-1">{recapData?.topArtist.name}</p>
                    <p className="text-white/80">{recapData?.topArtist.playCount} plays</p>
                </div>
            ),
        },
        // Step 3: Top Album
        {
            bg: "from-orange-600 to-red-600",
            content: (
                <div className="text-center">
                    <Disc className="w-16 h-16 mx-auto mb-4 text-orange-300" />
                    <p className="text-lg text-white/80 mb-3">Your favorite album</p>
                    {recapData?.topAlbum.image && (
                        <div className="w-28 h-28 mx-auto mb-3 rounded-lg overflow-hidden border-4 border-white/30 shadow-xl">
                            <img src={imageUrl(recapData.topAlbum.image, "medium")} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <p className="text-2xl font-bold text-white mb-1">{recapData?.topAlbum.title}</p>
                    <p className="text-white/80">{recapData?.topAlbum.artist}</p>
                </div>
            ),
        },
        // Step 4: Top Track
        {
            bg: "from-pink-600 to-purple-600",
            content: (
                <div className="text-center">
                    <Music className="w-16 h-16 mx-auto mb-4 text-pink-300" />
                    <p className="text-lg text-white/80 mb-3">Your #1 song</p>
                    <p className="text-3xl font-bold text-white mb-1">{recapData?.topTrack.name}</p>
                    <p className="text-xl text-white/80">{recapData?.topTrack.artist}</p>
                    <p className="text-white/60 mt-2">{recapData?.topTrack.playCount} plays</p>
                </div>
            ),
        },
        // Step 5: Summary
        {
            bg: "from-indigo-600 to-violet-600",
            content: (
                <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
                    <p className="text-2xl font-bold text-white mb-4">Your {currentYear} in Music</p>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{recapData?.uniqueArtists}</p>
                            <p className="text-xs text-white/80">Artists</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{recapData?.uniqueAlbums}</p>
                            <p className="text-xs text-white/80">Albums</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3">
                            <p className="text-2xl font-bold text-white">{recapData?.uniqueTracks}</p>
                            <p className="text-xs text-white/80">Tracks</p>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm font-medium flex items-center gap-2">
                            <Share2 size={16} />
                            Share
                        </button>
                        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm font-medium flex items-center gap-2">
                            <Download size={16} />
                            Save
                        </button>
                    </div>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <Modal isOpen={open} onClose={() => setOpen(false)} maxW={500} h={500}>
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                    <div className="text-center text-white">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 animate-spin" />
                        <p className="text-lg">Loading your recap...</p>
                    </div>
                </div>
            </Modal>
        );
    }

    if (error || !recapData) {
        return (
            <Modal isOpen={open} onClose={() => setOpen(false)} maxW={500} h={300}>
                <div className="flex flex-col items-center justify-center h-full p-6">
                    <p className="text-[var(--color-fg-secondary)] mb-4">
                        Unable to load your yearly recap. You may not have enough listening data for {currentYear}.
                    </p>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        );
    }

    const currentStep = steps[Math.min(step, steps.length - 1)];

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} maxW={400} h={500} className="!p-0 overflow-hidden">
            <div className={`relative h-full bg-gradient-to-br ${currentStep.bg} flex flex-col items-center justify-center p-8 transition-all duration-500`}>
                {/* Close button */}
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="animate-in fade-in duration-300">
                    {currentStep.content}
                </div>

                {/* Navigation dots */}
                <div className="absolute bottom-6 flex gap-2">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                                }`}
                        />
                    ))}
                </div>

                {/* Skip/Next button */}
                {step < steps.length - 1 && (
                    <button
                        onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}
                        className="absolute bottom-6 right-6 text-white/80 hover:text-white text-sm"
                    >
                        Skip →
                    </button>
                )}
            </div>
        </Modal>
    );
}
