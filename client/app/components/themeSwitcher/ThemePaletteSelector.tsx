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
        // Base
        "modernLight", "modernDark", "slate",

        // Pink & Red
        "rose", "coral", "blossom", "blossomDark", "cottonCandy", "velvet",

        // Orange, Peach & Yellow
        "sunset", "amber", "marshmallow", "marshmallowDark", "macaroon", "embers", "sorbet", "firefly",

        // Green
        "forest", "pistache", "pistacheDark", "matcha", "aurora",

        // Teal & Cyan
        "teal", "lagoon", "lagoonDark", "glacier",

        // Blue
        "ocean", "cloud", "cloudDark", "abyss",

        // Purple & Violet
        "purple", "lavender", "mist", "mistDark", "lilac", "nebula"
    ];

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
                    {/* Modern Themes */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Modern</h4>
                        <div className="grid grid-cols-2 items-center gap-2">
                            {Object.entries(themes)
                                .filter(([name]) => MODERN_THEME_NAMES.includes(name))
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

                    {/* Classic Themes */}
                    <div>
                        <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Classic</h4>
                        <div className="grid grid-cols-2 items-center gap-2">
                            {Object.entries(themes)
                                .filter(([name]) => !MODERN_THEME_NAMES.includes(name) && !["snow"].includes(name)) // Snow is manually excluded if needed, or included in classic logic
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
