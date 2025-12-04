import { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import themes from "~/styles/themes.css";
import ThemeOptionLegacy, { ThemeOption } from "./ThemeOption";
import { AsyncButton } from "../AsyncButton";
import { CardAuraSelector } from "./CardAuraSelector";
import { ThemePaletteSelector } from "./ThemePaletteSelector";
import { CustomElementColors } from "./CustomElementColors";
import { CustomBackground } from "./CustomBackground";

export function ThemeSwitcher() {
  const { setTheme } = useTheme();
  const initialTheme = {
    bg: "#1e1816",
    bgSecondary: "#2f2623",
    bgTertiary: "#453733",
    fg: "#f8f3ec",
    fgSecondary: "#d6ccc2",
    fgTertiary: "#b4a89c",
    primary: "#f5a97f",
    primaryDim: "#d88b65",
    accent: "#f9db6d",
    accentDim: "#d9bc55",
    error: "#e26c6a",
    warning: "#f5b851",
    success: "#8fc48f",
    info: "#87b8dd",
  };

  const { setCustomTheme, getCustomTheme, resetTheme } = useTheme();
  const [custom, setCustom] = useState(
    JSON.stringify(getCustomTheme() ?? initialTheme, null, "  ")
  );

  const handleCustomTheme = () => {
    console.log(custom);
    try {
      const themeData = JSON.parse(custom);
      setCustomTheme(themeData);
      setCustom(JSON.stringify(themeData, null, "  "));
      console.log(themeData);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2>Select Theme</h2>
          <div className="mb-3">
            <AsyncButton onClick={resetTheme}>Reset</AsyncButton>
          </div>
        </div>

        <div className="space-y-6">
          {/* Modern Themes - Collapsible */}
          <ThemePaletteSelector setTheme={setTheme} setCustom={setCustom} setCustomTheme={setCustomTheme} />

          {/* Future Features - Advanced Section */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Advanced</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const themeStore = window.open('https://github.com/topics/color-scheme', '_blank');
                }}
                className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors text-sm"
                title="Marketplace"
              >
                🏪 Themes
              </button>
              <button onClick={() => {
                const hour = new Date().getHours();
                const isDaytime = hour >= 6 && hour < 18;
                // Dark theme (Apple Dark)
                const darkTheme = {
                  bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
                  fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
                  primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
                  error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff"
                };
                // Light theme (Apple Light)
                const lightTheme = {
                  bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
                  fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
                  primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
                  error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa"
                };
                const autoTheme = isDaytime ? lightTheme : darkTheme;
                setCustomTheme(autoTheme);
                setCustom(JSON.stringify(autoTheme, null, 2));
              }} className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors text-sm" title="Auto Mode (Day/Night)">
                🌓 Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Theme Editor - Clean Design */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Custom Theme</h2>
            <p className="text-sm text-[var(--color-fg-secondary)] mt-1">Create your own style</p>
          </div>
          <AsyncButton onClick={async () => {
            await handleCustomTheme();
          }} className="bg-[var(--color-primary)] text-[var(--color-bg)] px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">
            Save
          </AsyncButton>
        </div>

        {/* Custom Element Colors - Collapsible */}
        <CustomElementColors />

        {/* Custom Background - Collapsible */}
        <CustomBackground />

        {/* Card Aura Variation Selector */}
        <CardAuraSelector />

        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-6 border border-[var(--color-bg-tertiary)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Brand Colors */}
            <div>
              <h3 className="text-xs font-bold text-[var(--color-fg-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--color-bg-tertiary)] pb-2">Brand</h3>
              <div className="space-y-3">
                {[
                  { key: 'primary', label: 'Primary' },
                  { key: 'primaryDim', label: 'Primary Dim' },
                  { key: 'accent', label: 'Accent' },
                  { key: 'accentDim', label: 'Accent Dim' },
                ].map((color) => {
                  const theme = JSON.parse(custom);
                  return (
                    <div key={color.key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={theme[color.key]}
                        onChange={(e) => {
                          const updated = { ...theme, [color.key]: e.target.value };
                          setCustom(JSON.stringify(updated, null, 2));
                          setCustomTheme(updated);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                        <input
                          type="text"
                          value={theme[color.key]}
                          onChange={(e) => {
                            const updated = { ...theme, [color.key]: e.target.value };
                            setCustom(JSON.stringify(updated, null, 2));
                            setCustomTheme(updated);
                          }}
                          className="w-full bg-transparent text-[var(--color-fg-secondary)] text-[10px] font-mono outline-none border-none p-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UI Colors */}
            <div>
              <h3 className="text-xs font-bold text-[var(--color-fg-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--color-bg-tertiary)] pb-2">Interface</h3>
              <div className="space-y-3">
                {[
                  { key: 'bg', label: 'Background' },
                  { key: 'bgSecondary', label: 'Surface' },
                  { key: 'bgTertiary', label: 'Border/Highlight' },
                  { key: 'fg', label: 'Text Primary' },
                  { key: 'fgSecondary', label: 'Text Secondary' },
                  { key: 'fgTertiary', label: 'Text Muted' },
                ].map((color) => {
                  const theme = JSON.parse(custom);
                  return (
                    <div key={color.key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={theme[color.key]}
                        onChange={(e) => {
                          const updated = { ...theme, [color.key]: e.target.value };
                          setCustom(JSON.stringify(updated, null, 2));
                          setCustomTheme(updated);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                        <input
                          type="text"
                          value={theme[color.key]}
                          onChange={(e) => {
                            const updated = { ...theme, [color.key]: e.target.value };
                            setCustom(JSON.stringify(updated, null, 2));
                            setCustomTheme(updated);
                          }}
                          className="w-full bg-transparent text-[var(--color-fg-secondary)] text-[10px] font-mono outline-none border-none p-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex flex-col h-full">
              <h3 className="text-xs font-bold text-[var(--color-fg-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--color-bg-tertiary)] pb-2">Status</h3>
              <div className="space-y-3 mb-6">
                {[
                  { key: 'success', label: 'Success' },
                  { key: 'error', label: 'Error' },
                  { key: 'warning', label: 'Warning' },
                  { key: 'info', label: 'Info' },
                ].map((color) => {
                  const theme = JSON.parse(custom);
                  return (
                    <div key={color.key} className="flex items-center gap-3">
                      <input
                        type="color"
                        value={theme[color.key]}
                        onChange={(e) => {
                          const updated = { ...theme, [color.key]: e.target.value };
                          setCustom(JSON.stringify(updated, null, 2));
                          setCustomTheme(updated);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                        <input
                          type="text"
                          value={theme[color.key]}
                          onChange={(e) => {
                            const updated = { ...theme, [color.key]: e.target.value };
                            setCustom(JSON.stringify(updated, null, 2));
                            setCustomTheme(updated);
                          }}
                          className="w-full bg-transparent text-[var(--color-fg-secondary)] text-[10px] font-mono outline-none border-none p-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--color-bg-tertiary)] flex gap-2">
                <button
                  onClick={() => {
                    const theme = JSON.parse(custom);
                    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'theme.json';
                    a.click();
                  }}
                  className="flex-1 py-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
                >
                  JSON
                </button>
                <button
                  onClick={() => {
                    const theme = JSON.parse(custom);
                    const css = `:root {\n${Object.entries(theme).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v};`).join('\n')}\n}`;
                    navigator.clipboard.writeText(css);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
                >
                  CSS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
