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



    // Helper to extract HSL from hex
    const getHSL = (hex: string) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }

        return { h, s, l };
    };

    // Sort themes helper
    const sortThemes = (themeEntries: [string, any][]) => {
        return themeEntries.sort(([, a], [, b]) => {
            const hslA = getHSL(a.primary);
            const hslB = getHSL(b.primary);

            // 1. Hue Sorting (Ascending 0-360)
            const bucketSize = 15;
            const bucketA = Math.floor(hslA.h / bucketSize);
            const bucketB = Math.floor(hslB.h / bucketSize);

            if (bucketA !== bucketB) {
                return bucketA - bucketB;
            }

            // 2. Saturation Sorting (Descending - more vibrant first)
            if (Math.abs(hslA.s - hslB.s) > 0.05) {
                return hslB.s - hslA.s;
            }

            // 3. Lightness Sorting (Descending)
            return hslB.l - hslA.l;
        });
    };

    // Calculate background lightness to determine if theme is Dark or Light
    const isDarkTheme = (bgHex: string) => {
        const { l } = getHSL(bgHex);
        return l < 0.5;
    };

    const allThemes = Object.entries(themes);
    const darkThemes = sortThemes(allThemes.filter(([, t]) => isDarkTheme(t.bg)));
    const lightThemes = sortThemes(allThemes.filter(([, t]) => !isDarkTheme(t.bg)));

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
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Dark Themes */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Dark</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 items-center gap-2">
                            {darkThemes.map(([name, themeData]) => (
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

                    {/* Light Themes */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Light</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 items-center gap-2">
                            {lightThemes.map(([name, themeData]) => (
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
    )
}

