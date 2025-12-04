import { useState } from "react";
import ThemeOptionLegacy from "./ThemeOption";
import themes from "~/styles/themes.css";

interface ThemePaletteSelectorProps {
    setTheme: (name: string) => void;
    setCustom: (value: string) => void;
    setCustomTheme: (theme: any) => void;
}

export function ThemePaletteSelector({ setTheme, setCustom, setCustomTheme }: ThemePaletteSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

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
                            {/* Dark Theme (Apple Dark) */}
                            <ThemeOptionLegacy
                                setTheme={(name: string) => {
                                    const darkTheme = {
                                        bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
                                        fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
                                        primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
                                        error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff"
                                    };
                                    setCustomTheme(darkTheme);
                                    setCustom(JSON.stringify(darkTheme, null, 2));
                                }}
                                theme={{
                                    bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
                                    fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
                                    primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
                                    error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff"
                                }}
                                themeName="Dark"
                            />
                            {/* Light Theme (Apple Light) */}
                            <ThemeOptionLegacy
                                setTheme={(name: string) => {
                                    const lightTheme = {
                                        bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
                                        fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
                                        primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
                                        error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa"
                                    };
                                    setCustomTheme(lightTheme);
                                    setCustom(JSON.stringify(lightTheme, null, 2));
                                }}
                                theme={{
                                    bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
                                    fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
                                    primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
                                    error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa"
                                }}
                                themeName="Light"
                            />
                            {Object.entries(themes)
                                .filter(([name]) => ["rose", "slate", "ocean", "forest", "sunset", "purple", "coral", "teal", "amber", "lavender"].includes(name))
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
                                .filter(([name]) => !["rose", "slate", "ocean", "forest", "sunset", "purple", "snow", "coral", "teal", "amber", "lavender"].includes(name))
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
