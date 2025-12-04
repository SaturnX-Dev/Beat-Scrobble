import { useState, useEffect } from "react"
import { useAppContext } from "~/providers/AppProvider"
import { AsyncButton } from "../components/AsyncButton"
import AllTimeStats from "~/components/AllTimeStats"
import ActivityGrid from "~/components/ActivityGrid"
import LastPlays from "~/components/LastPlays"
import TopAlbums from "~/components/TopAlbums"
import TopArtists from "~/components/TopArtists"
import TopTracks from "~/components/TopTracks"
import { useTheme } from "~/hooks/useTheme"
import { themes, type Theme } from "~/styles/themes.css"
import { Copy, Download, Upload } from "lucide-react"

export default function ThemeHelper() {
    const initialTheme = {
        bg: "#0f172a",
        bgSecondary: "#1e293b",
        bgTertiary: "#334155",
        fg: "#f8fafc",
        fgSecondary: "#94a3b8",
        fgTertiary: "#64748b",
        primary: "#f43f5e",
        primaryDim: "#e11d48",
        accent: "#fb7185",
        accentDim: "#f43f5e",
        error: "#f87171",
        warning: "#fbbf24",
        success: "#4ade80",
        info: "#60a5fa",
    }

    const [custom, setCustom] = useState(JSON.stringify(initialTheme, null, "  "))
    const [activeTab, setActiveTab] = useState<"presets" | "manual" | "export">("presets");

    const { setCustomTheme, setTheme, theme } = useTheme()
    const { homeItems } = useAppContext();

    // Update custom text when theme changes
    useEffect(() => {
        // We can't easily get the *current* theme values if they are from a class, 
        // but we can try to read the computed styles or just leave it as the initial/last custom.
        // For now, let's just keep the custom state independent or update it if we could.
    }, [theme]);

    const handleCustomTheme = () => {
        try {
            const theme = JSON.parse(custom) as Theme
            setCustomTheme(theme)
        } catch (err) {
            console.error("Invalid JSON", err)
            alert("Invalid JSON")
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(custom);
        alert("Theme JSON copied to clipboard!");
    }

    const generateCSS = () => {
        try {
            const t = JSON.parse(custom) as Theme;
            const css = `
:root {
    --color-bg: ${t.bg};
    --color-bg-secondary: ${t.bgSecondary};
    --color-bg-tertiary: ${t.bgTertiary};
    --color-fg: ${t.fg};
    --color-fg-secondary: ${t.fgSecondary};
    --color-fg-tertiary: ${t.fgTertiary};
    --color-primary: ${t.primary};
    --color-primary-dim: ${t.primaryDim};
    --color-accent: ${t.accent};
    --color-accent-dim: ${t.accentDim};
    --color-error: ${t.error};
    --color-warning: ${t.warning};
    --color-success: ${t.success};
    --color-info: ${t.info};
}
`.trim();
            navigator.clipboard.writeText(css);
            alert("CSS variables copied to clipboard!");
        } catch (e) {
            alert("Invalid JSON to generate CSS");
        }
    }

    const applyAppleDark = () => {
        const appleDark: Theme = {
            bg: "#000000",
            bgSecondary: "#1c1c1e",
            bgTertiary: "#2c2c2e",
            fg: "#ffffff",
            fgSecondary: "#8e8e93",
            fgTertiary: "#48484a",
            primary: "#0a84ff",
            primaryDim: "#007aff",
            accent: "#5e5ce6",
            accentDim: "#5e5ce6",
            error: "#ff453a",
            warning: "#ff9f0a",
            success: "#32d74b",
            info: "#64d2ff"
        };
        setCustomTheme(appleDark);
        setCustom(JSON.stringify(appleDark, null, "  "));
    }

    const applyAppleLight = () => {
        const appleLight: Theme = {
            bg: "#f2f2f7",
            bgSecondary: "#ffffff",
            bgTertiary: "#e5e5ea",
            fg: "#000000",
            fgSecondary: "#8e8e93",
            fgTertiary: "#c7c7cc",
            primary: "#007aff",
            primaryDim: "#007aff",
            accent: "#5856d6",
            accentDim: "#5856d6",
            error: "#ff3b30",
            warning: "#ff9500",
            success: "#34c759",
            info: "#5ac8fa"
        };
        setCustomTheme(appleLight);
        setCustom(JSON.stringify(appleLight, null, "  "));
    }

    return (
        <div className="w-full h-full flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-[var(--color-fg)]">Appearance</h1>
                <p className="text-[var(--color-fg-secondary)]">Customize the look and feel of Beat Scrobble.</p>
            </div>

            <div className="flex gap-2 bg-[var(--color-bg-tertiary)]/30 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("presets")}
                    className={`px - 4 py - 2 rounded - lg text - sm font - bold transition - all ${activeTab === "presets" ? "bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"} `}
                >
                    Presets
                </button>
                <button
                    onClick={() => setActiveTab("manual")}
                    className={`px - 4 py - 2 rounded - lg text - sm font - bold transition - all ${activeTab === "manual" ? "bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"} `}
                >
                    Editor
                </button>
                <button
                    onClick={() => setActiveTab("export")}
                    className={`px - 4 py - 2 rounded - lg text - sm font - bold transition - all ${activeTab === "export" ? "bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"} `}
                >
                    Export/Import
                </button>
            </div>

            <div className="flex-1 glass-card rounded-3xl p-6 border border-[var(--color-bg-tertiary)]/50 shadow-xl relative overflow-hidden min-h-[400px]">

                {activeTab === "presets" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 relative z-10 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {/* Modern Presets */}
                        <div className="col-span-full">
                            <h3 className="text-lg font-bold text-[var(--color-fg)] mb-4">Modern</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <button onClick={() => setTheme("rose")} className="group relative overflow-hidden rounded-2xl aspect-video border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-lg">
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-300 to-pink-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-lg drop-shadow-md">Rose</span></div>
                                </button>
                                <button onClick={() => setTheme("slate")} className="group relative overflow-hidden rounded-2xl aspect-video border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-lg">
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-lg drop-shadow-md">Slate</span></div>
                                </button>
                            </div>
                        </div>

                        {/* Apple Presets */}
                        <div className="col-span-full">
                            <h3 className="text-lg font-bold text-[var(--color-fg)] mb-4">Apple Style</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <button onClick={applyAppleDark} className="group relative overflow-hidden rounded-2xl aspect-video border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-lg">
                                    <div className="absolute inset-0 bg-[#1c1c1e]"></div>
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-lg">Apple Dark</span></div>
                                </button>
                                <button onClick={applyAppleLight} className="group relative overflow-hidden rounded-2xl aspect-video border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-lg">
                                    <div className="absolute inset-0 bg-[#f2f2f7]"></div>
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-black font-bold text-lg">Apple Light</span></div>
                                </button>
                            </div>
                        </div>

                        {/* Classic Themes */}
                        <div className="col-span-full">
                            <h3 className="text-lg font-bold text-[var(--color-fg)] mb-4">Classic</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(themes).filter(([_, t]) => t && t.bg).map(([key, t]) => (
                                    <button
                                        key={key}
                                        onClick={() => setTheme(key)}
                                        className="group relative overflow-hidden rounded-2xl aspect-video border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-lg"
                                        style={{ backgroundColor: t.bg }}
                                    >
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                            <span className="font-bold text-lg capitalize" style={{ color: t.fg }}>{key}</span>
                                            <div className="flex gap-1">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primary }}></div>
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }}></div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "manual" && (
                    <div className="flex flex-col md:flex-row gap-8 h-full">
                        <div className="flex-1 flex flex-col gap-4">
                            <h3 className="text-xl font-bold text-[var(--color-fg)]">JSON Editor</h3>
                            <textarea
                                name="custom-theme"
                                onChange={(e) => setCustom(e.target.value)}
                                className="flex-1 bg-[var(--color-bg)] text-[var(--color-fg)] p-4 rounded-xl font-mono text-sm border border-[var(--color-bg-tertiary)] focus:border-[var(--color-primary)] outline-none resize-none"
                                value={custom}
                            />
                            <AsyncButton onClick={handleCustomTheme}>Apply Changes</AsyncButton>
                        </div>
                        <div className="w-full md:w-1/3 flex flex-col gap-4">
                            <h3 className="text-xl font-bold text-[var(--color-fg)]">Live Preview</h3>
                            <div className="bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-bg-tertiary)] space-y-2">
                                <div className="h-8 w-full bg-[var(--color-primary)] rounded flex items-center justify-center text-white text-xs font-bold">Primary</div>
                                <div className="h-8 w-full bg-[var(--color-accent)] rounded flex items-center justify-center text-white text-xs font-bold">Accent</div>
                                <div className="p-2 bg-[var(--color-bg-secondary)] rounded text-[var(--color-fg)] text-sm">Secondary BG & FG</div>
                                <div className="p-2 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-fg-secondary)] text-sm">Tertiary BG & FG</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "export" && (
                    <div className="flex flex-col gap-8 items-center justify-center h-full text-center">
                        <div className="max-w-md space-y-4">
                            <h3 className="text-2xl font-bold text-[var(--color-fg)]">Share your Theme</h3>
                            <p className="text-[var(--color-fg-secondary)]">Export your current configuration as JSON or CSS variables.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-tertiary)] transition-all group">
                                    <Copy className="text-[var(--color-primary)] group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-[var(--color-fg)]">Copy JSON</span>
                                </button>
                                <button onClick={generateCSS} className="flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-tertiary)] transition-all group">
                                    <Download className="text-[var(--color-accent)] group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-[var(--color-fg)]">Copy CSS</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Section */}
            <div className="w-full border-t border-[var(--color-bg-tertiary)] pt-10 mt-2">
                <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-fg)]">Component Preview</h2>
                <div className="flex flex-col gap-10 items-center">
                    <div className="flex gap-5 flex-wrap justify-center w-full">
                        <AllTimeStats />
                        <ActivityGrid />
                    </div>
                    <div className="flex flex-wrap 2xl:gap-20 xl:gap-10 justify-around gap-5 w-full">
                        <TopArtists period="all_time" limit={homeItems} />
                        <TopAlbums period="all_time" limit={homeItems} />
                        <TopTracks period="all_time" limit={homeItems} />
                        <LastPlays limit={Math.floor(homeItems * 2.5)} />
                    </div>
                </div>
            </div>
        </div>
    )
}