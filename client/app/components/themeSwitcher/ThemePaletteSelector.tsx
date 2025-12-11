import { useState } from "react";
import ThemeOptionLegacy from "./ThemeOption";
import { themes } from "~/styles/themes.css";

interface ThemePaletteSelectorProps {
    setTheme: (name: string) => void;
    setCustom: (value: string) => void;
    setCustomTheme: (theme: any) => void;
}

export function ThemePaletteSelector({ setTheme, setCustom, setCustomTheme }: ThemePaletteSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const MODERN_THEME_NAMES = [
        // Base & Monochrome
        "modernLight", "modernDark", "slate", "prismLight", "prismSoft", "prismDark", "graphite", "porcelain", "lowSaturation", "platinum", "obsidian", "marble", "champagne", "cocoa",

        // Pink & Red
        "ruby", "rose", "coral", "blossom", "cottonCandy", "velvet", "magentaFlash", "ember", "carnival", "noirBordeaux", "roseQuartz", "vaporwave", "rgbFusion", "kawaiiGamer",

        // Orange, Peach & Yellow & Gold
        "tangerine", "sunset", "amber", "sunflower", "marshmallow", "marshmallowDark", "macaroon", "sorbet", "firefly", "aurum", "onyxGold", "synthwaveSunset",

        // Green
        "limePulse", "emeraldCore", "pistache", "pistacheDark", "matcha", "aurora", "moss", "forestNight", "neonMatrix", "toxicLime", "chromaRush",

        // Teal & Cyan
        "aquaSplash", "teal", "lagoon", "lagoonDark", "glacier", "oceanic", "tropic", "cyberpunk", "glitch", "cybercyan", "holoGrid",

        // Blue
        "cobalt", "sapphire", "cloud", "cloudDark", "midnight", "frost", "spectrum", "ink", "royal", "porcelainBlue", "arcadeNeon",

        // Purple & Violet
        "violetBeam", "purple", "mist", "mistDark", "lilac", "nebula", "eclipse", "ultravioletPulse"
    ];

    // Helper to extract hue from hex
    const getHue = (hex: string) => {
        // Remove #
        hex = hex.replace('#', '');

        // Parse r, g, b
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;

        if (max === min) {
            h = 0; // achromatic
        } else {
            const d = max - min;
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return h * 360;
    };

    const getLightness = (hex: string) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return (max + min) / 2;
    };

    // Sort themes by hue (buckets) then lightness
    const sortedModernThemes = Object.entries(themes)
        .filter(([name]) => MODERN_THEME_NAMES.includes(name))
        .sort(([, a], [, b]) => {
            const getSaturation = (hex: string) => {
                hex = hex.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const d = max - min;
                const l = (max + min) / 2;
                if (max === min) return 0;
                return l > 0.5 ? d / (2 - max - min) : d / (max + min);
            };

            const hueA = getHue(a.primary);
            const hueB = getHue(b.primary);

            const satA = getSaturation(a.primary);
            const satB = getSaturation(b.primary);

            // Create a specialized bucket for Neutrals (Greyscale Primaries)
            // If saturation is very low (< 0.1), move to beginning (Bucket -1)
            const isNeutralA = satA < 0.1;
            const isNeutralB = satB < 0.1;

            if (isNeutralA && !isNeutralB) return -1;
            if (!isNeutralA && isNeutralB) return 1;

            // Group into 12 hue buckets (30 degrees each)
            const bucketA = Math.floor(hueA / 30);
            const bucketB = Math.floor(hueB / 30);

            if (bucketA !== bucketB) {
                return bucketA - bucketB;
            }

            // If in same hue range, sort by background lightness (Light -> Dark)
            const lightA = getLightness(a.bg);
            const lightB = getLightness(b.bg);

            // Descending lightness = Lightest first (1.0) -> Darkest last (0.0)
            return lightB - lightA;
        });

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 border border-[var(--color-bg-tertiary)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-2 group"
            >
                <div className="text-left">
                    <h3 className="text-sm font-bold text-[var(--color-fg)]">Theme Palettes</h3>
                    <p className="text-xs text-[var(--color-fg-secondary)]">Choose from curated color schemes</p>
                </div>
                <div className={`p-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-fg-secondary)] group-hover:text-[var(--color-primary)] transition-colors ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </button>

            {isExpanded && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Modern Themes (Rainbow Sorted) */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Rainbow Palette</h4>
                        <div className="grid grid-cols-2 items-center gap-2">
                            {sortedModernThemes.map(([name, themeData]) => (
                                <ThemeOptionLegacy
                                    setTheme={(themeName: string) => {
                                        setTheme(themeName);
                                        const selectedTheme = themes[themeName];
                                        if (selectedTheme) {
                                            setCustom(JSON.stringify(selectedTheme, null, 2));
                                        }
                                    }}
                                    key={name}
                                    theme={themeData}
                                    themeName={name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Classic Themes */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Classic & Monochrome</h4>
                        <div className="grid grid-cols-2 items-center gap-2">
                            {Object.entries(themes)
                                .filter(([name]) => !MODERN_THEME_NAMES.includes(name) && !["snow"].includes(name))
                                .map(([name, themeData]) => (
                                    <ThemeOptionLegacy
                                        setTheme={(themeName: string) => {
                                            setTheme(themeName);
                                            const selectedTheme = themes[themeName];
                                            if (selectedTheme) {
                                                setCustom(JSON.stringify(selectedTheme, null, 2));
                                            }
                                        }}
                                        key={name}
                                        theme={themeData}
                                        themeName={name}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
