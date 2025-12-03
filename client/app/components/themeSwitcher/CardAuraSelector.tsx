import { useState, useEffect } from "react";

const auraStyles = [
    { id: 'circle', name: 'Circle', desc: 'Classic circular aura' },
    { id: 'ellipse-h', name: 'Horizontal', desc: 'Wide ellipse' },
    { id: 'ellipse-v', name: 'Vertical', desc: 'Tall ellipse' },
    { id: 'blob-1', name: 'Blob 1', desc: 'Organic shape 1' },
    { id: 'blob-2', name: 'Blob 2', desc: 'Organic shape 2' },
    { id: 'diamond', name: 'Diamond', desc: 'Rotated diamond' },
    { id: 'wave', name: 'Wave', desc: 'Horizontal wave' },
    { id: 'square', name: 'Square', desc: 'Soft square' },
    { id: 'lava', name: 'Lava Lamp', desc: 'Morphing blob' },
    { id: 'dna', name: 'DNA Helix', desc: 'Rotating spiral' },
    { id: 'splat', name: 'Splat', desc: 'Organic splash' },
    { id: 'star', name: 'Star Burst', desc: 'Pulsing star' },
    { id: 'amoeba', name: 'Amoeba', desc: 'Living organism' },
    { id: 'cloud', name: 'Cloud', desc: 'Floating cloud' },
    { id: 'drop', name: 'Liquid Drop', desc: 'Bouncing drop' },
    { id: 'infinity', name: 'Infinity', desc: 'Rotating symbol' },
    { id: 'plasma', name: 'Plasma Ball', desc: 'Flickering energy' },
    { id: 'spiral', name: 'Spiral', desc: 'Conic spiral' },
    { id: 'nebula', name: 'Nebula', desc: 'Space swirl' },
    { id: 'glitch', name: 'Glitch', desc: 'Digital error' },
    { id: 'heartbeat', name: 'Heartbeat', desc: 'Pulsing heart' },
    { id: 'jelly', name: 'Jelly', desc: 'Wobbly texture' },
    { id: 'breathing', name: 'Breathing', desc: 'Calm pulse' },
    { id: 'portal', name: 'Portal', desc: 'Dimensional gate' },
    { id: 'liquid-metal', name: 'Liquid Metal', desc: 'Flowing metal' },
    { id: 'electricity', name: 'Electricity', desc: 'Zap effect' },
    { id: 'tornado', name: 'Tornado', desc: 'Twisting wind' },
    { id: 'bubble', name: 'Bubble Pop', desc: 'Popping bubble' },
    { id: 'warp', name: 'Warp Speed', desc: 'Fast motion' },
    { id: 'earthquake', name: 'Earthquake', desc: 'Shaking ground' },
    { id: 'quantum', name: 'Quantum', desc: 'Flickering particle' },
    { id: 'smoke', name: 'Smoke', desc: 'Rising smoke' },
];

const availableTargets = [
    { id: 'dashboard', name: 'Dashboard Cards' },
    { id: 'now-playing', name: 'Now Playing Card' },
    { id: 'recent-activity', name: 'Recent Activity' },
    { id: 'top-items', name: 'Top Items Lists' },
];

export function CardAuraSelector() {
    const [selectedAura, setSelectedAura] = useState(() =>
        typeof window !== 'undefined' ? localStorage.getItem('card-aura-style') || 'circle' : 'circle'
    );
    const [isEnabled, setIsEnabled] = useState(() =>
        typeof window !== 'undefined' ? localStorage.getItem('card-aura-enabled') !== 'false' : true
    );
    const [opacity, setOpacity] = useState(() =>
        typeof window !== 'undefined' ? parseFloat(localStorage.getItem('card-aura-opacity') || '0.3') : 0.3
    );
    const [targets, setTargets] = useState<string[]>(() =>
        typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('card-aura-targets') || '["dashboard"]') : ['dashboard']
    );
    const [perCardStyles, setPerCardStyles] = useState<Record<string, string>>(() =>
        typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('card-aura-per-card-styles') || '{}') : {}
    );
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            document.documentElement.setAttribute('data-aura-style', selectedAura);
            document.documentElement.style.setProperty('--aura-opacity', opacity.toString());
        }
    }, [selectedAura, opacity]);

    useEffect(() => {
        localStorage.setItem('card-aura-per-card-styles', JSON.stringify(perCardStyles));
        window.dispatchEvent(new Event('aura-settings-changed'));
    }, [perCardStyles]);

    const updateSettings = (newEnabled: boolean, newOpacity: number, newTargets: string[]) => {
        localStorage.setItem('card-aura-enabled', newEnabled.toString());
        localStorage.setItem('card-aura-opacity', newOpacity.toString());
        localStorage.setItem('card-aura-targets', JSON.stringify(newTargets));
        window.dispatchEvent(new Event('aura-settings-changed'));
    };

    const selectedStyle = auraStyles.find(s => s.id === selectedAura) || auraStyles[0];

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 border border-[var(--color-bg-tertiary)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-2 group"
            >
                <div className="text-left">
                    <h3 className="text-sm font-bold text-[var(--color-fg)]">Card Aura Style</h3>
                    <p className="text-xs text-[var(--color-fg-secondary)]">
                        Current: <span className="text-[var(--color-primary)] font-medium">{selectedStyle.name}</span>
                    </p>
                </div>
                <div className={`p-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-fg-secondary)] group-hover:text-[var(--color-primary)] transition-colors ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </button>

            {isExpanded && (
                <div className="animate-in slide-in-from-top-2 duration-200 space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-bg-tertiary)]">
                        <span className="text-sm font-medium text-[var(--color-fg)]">Enable Card Aura</span>
                        <button
                            onClick={() => {
                                const newVal = !isEnabled;
                                setIsEnabled(newVal);
                                updateSettings(newVal, opacity, targets);
                            }}
                            className={`w-10 h-6 rounded-full transition-colors relative ${isEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-4' : ''}`} />
                        </button>
                    </div>

                    {/* Opacity Slider */}
                    <div className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-bg-tertiary)]">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-medium text-[var(--color-fg)]">Opacity</span>
                            <span className="text-xs text-[var(--color-fg-secondary)]">{Math.round(opacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setOpacity(val);
                                updateSettings(isEnabled, val, targets);
                            }}
                            className="w-full accent-[var(--color-primary)]"
                        />
                    </div>

                    {/* Target Selector */}
                    <div className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-bg-tertiary)]">
                        <p className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Apply to:</p>
                        <div className="space-y-2">
                            {availableTargets.map(target => (
                                <label key={target.id} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${targets.includes(target.id) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-fg-secondary)] group-hover:border-[var(--color-fg)]'}`}>
                                        {targets.includes(target.id) && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={targets.includes(target.id)}
                                        onChange={() => {
                                            const newTargets = targets.includes(target.id)
                                                ? targets.filter(t => t !== target.id)
                                                : [...targets, target.id];
                                            setTargets(newTargets);
                                            updateSettings(isEnabled, opacity, newTargets);
                                        }}
                                    />
                                    <span className="text-xs text-[var(--color-fg)]">{target.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Per-Card Aura Style Selector */}
                    <div className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-bg-tertiary)]">
                        <p className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Per-Card Styles:</p>
                        <div className="space-y-2">
                            {availableTargets.map(target => (
                                <div key={target.id} className="border border-[var(--color-bg-tertiary)] rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => setExpandedCard(expandedCard === target.id ? null : target.id)}
                                        className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] transition-colors"
                                    >
                                        <span className="text-xs text-[var(--color-fg)]">{target.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-[var(--color-fg-secondary)]">
                                                {perCardStyles[target.id] || 'Default'}
                                            </span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expandedCard === target.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </button>
                                    {expandedCard === target.id && (
                                        <div className="p-2 bg-[var(--color-bg-secondary)] grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                                            <button
                                                onClick={() => {
                                                    const newStyles = { ...perCardStyles };
                                                    delete newStyles[target.id];
                                                    setPerCardStyles(newStyles);
                                                }}
                                                className={`p-1 text-[10px] rounded border text-center ${!perCardStyles[target.id] ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]'}`}
                                            >
                                                Default
                                            </button>
                                            {auraStyles.map(style => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => setPerCardStyles({ ...perCardStyles, [target.id]: style.id })}
                                                    className={`p-1 text-[10px] rounded border text-center truncate ${perCardStyles[target.id] === style.id ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]'}`}
                                                    title={style.name}
                                                >
                                                    {style.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Style Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        {auraStyles.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => {
                                    setSelectedAura(style.id);
                                    localStorage.setItem('card-aura-style', style.id);
                                    document.documentElement.setAttribute('data-aura-style', style.id);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all ${selectedAura === style.id
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm'
                                    : 'bg-[var(--color-bg)] border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)]/50'
                                    }`}
                            >
                                <p className="text-sm font-bold text-[var(--color-fg)]">{style.name}</p>
                                <p className="text-xs text-[var(--color-fg-secondary)] mt-0.5">{style.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
