import { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import themes from "~/styles/themes.css";
import { AsyncButton } from "../AsyncButton";
import { CardAuraSelector } from "./CardAuraSelector";
import { ThemePaletteSelector } from "./ThemePaletteSelector";
import { CustomElementColors } from "./CustomElementColors";
import { CustomBackground } from "./CustomBackground";
import { Collapsible } from "../ui/Collapsible";
import { Clock, Palette, Settings2, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { setTheme, setCustomTheme, getCustomTheme, resetTheme } = useTheme();

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
    // Auto Mode Settings embedded in custom theme
    autoEnabled: false,
    dayStart: 6,
    nightStart: 18,
  };

  const [custom, setCustom] = useState(
    JSON.stringify(getCustomTheme() ?? initialTheme, null, "  ")
  );

  const [parsedTheme, setParsedTheme] = useState<any>(
    getCustomTheme() ?? initialTheme
  );

  useEffect(() => {
    try {
      const p = JSON.parse(custom);
      setParsedTheme(p);
    } catch (e) { /* ignore */ }
  }, [custom]);

  // Handle Auto Theme Logic
  useEffect(() => {
    if (!parsedTheme?.autoEnabled) return;

    const checkTime = () => {
      const hour = new Date().getHours();
      const isDay = hour >= (parsedTheme.dayStart || 6) && hour < (parsedTheme.nightStart || 18);

      // Define palettes
      const lightTheme = {
        bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
        fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
        primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
        error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa",
        autoEnabled: true, dayStart: parsedTheme.dayStart, nightStart: parsedTheme.nightStart // Preserve settings
      };

      const darkTheme = {
        bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
        fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
        primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
        error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff",
        autoEnabled: true, dayStart: parsedTheme.dayStart, nightStart: parsedTheme.nightStart // Preserve settings
      };

      // Only update if current colors don't match target target (avoid loops, but simplified here)
      // Ideally we check a 'mode' flag, but checking bg color is a rough proxy
      const target = isDay ? lightTheme : darkTheme;

      // Apply without triggering a save loop if possible, or just update CSS vars
      // For now, we update the custom theme context which saves it
      // To prevent infinite loops, check if bg matches
      if (getCustomTheme()?.bg !== target.bg) {
        setCustomTheme(target);
        setCustom(JSON.stringify(target, null, 2));
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute
    checkTime(); // Initial check

    return () => clearInterval(interval);
  }, [parsedTheme?.autoEnabled, parsedTheme?.dayStart, parsedTheme?.nightStart, setCustomTheme]);


  const handleCustomTheme = () => {
    try {
      const themeData = JSON.parse(custom);
      setCustomTheme(themeData);
      // setCustom is already updated via input
    } catch (err) {
      console.log(err);
    }
  };

  const updateField = (key: string, value: any) => {
    try {
      const current = JSON.parse(custom);
      const updated = { ...current, [key]: value };
      setCustom(JSON.stringify(updated, null, 2));
      setCustomTheme(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-header">Theme Settings</h2>
          <p className="text-[var(--color-fg-secondary)]">Customize the look and feel of your app</p>
        </div>
        <AsyncButton onClick={resetTheme} className="text-xs">Reset to Default</AsyncButton>
      </div>

      <div className="space-y-6">
        {/* Quick Selectors */}
        <ThemePaletteSelector setTheme={setTheme} setCustom={setCustom} setCustomTheme={setCustomTheme} />

        {/* Auto Mode Configuration */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-fg)]">Auto Day/Night Mode</h3>
                <p className="text-xs text-[var(--color-fg-secondary)]">Automatically switch themes based on time</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={parsedTheme?.autoEnabled || false}
                onChange={(e) => updateField('autoEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--color-bg-tertiary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          {parsedTheme?.autoEnabled && (
            <div className="grid grid-cols-2 gap-4 mt-4 animate-fade-in pl-11">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-fg-secondary)] flex items-center gap-1">
                  <Sun size={12} /> Day Start (Hour)
                </label>
                <input
                  type="number"
                  min="0" max="23"
                  value={parsedTheme.dayStart ?? 6}
                  onChange={(e) => updateField('dayStart', parseInt(e.target.value))}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--color-fg-secondary)] flex items-center gap-1">
                  <Moon size={12} /> Night Start (Hour)
                </label>
                <input
                  type="number"
                  min="0" max="23"
                  value={parsedTheme.nightStart ?? 18}
                  onChange={(e) => updateField('nightStart', parseInt(e.target.value))}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Custom Editor */}
        <Collapsible title="Custom Theme Editor" icon={<Palette size={20} />} subtitle="Fine-tune brand colors, UI elements and backgrounds">
          <div className="space-y-6">
            <div className="flex justify-end sticky top-0 z-10 bg-[var(--color-bg-secondary)]/95 backdrop-blur py-2 border-b border-[var(--color-bg-tertiary)] mb-4">
              <AsyncButton onClick={async () => {
                await handleCustomTheme();
              }} className="bg-[var(--color-primary)] text-white px-6 py-1.5 text-sm rounded-lg font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all">
                Save Preset
              </AsyncButton>
            </div>

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
                    const theme = parsedTheme;
                    return (
                      <div key={color.key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme[color.key]}
                          onChange={(e) => updateField(color.key, e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                        />
                        <div className="flex-1">
                          <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                          <input
                            type="text"
                            value={theme[color.key]}
                            onChange={(e) => updateField(color.key, e.target.value)}
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
                    const theme = parsedTheme;
                    return (
                      <div key={color.key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme[color.key]}
                          onChange={(e) => updateField(color.key, e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                        />
                        <div className="flex-1">
                          <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                          <input
                            type="text"
                            value={theme[color.key]}
                            onChange={(e) => updateField(color.key, e.target.value)}
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
                    const theme = parsedTheme;
                    return (
                      <div key={color.key} className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme[color.key]}
                          onChange={(e) => updateField(color.key, e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                        />
                        <div className="flex-1">
                          <label className="text-xs font-medium text-[var(--color-fg)] block">{color.label}</label>
                          <input
                            type="text"
                            value={theme[color.key]}
                            onChange={(e) => updateField(color.key, e.target.value)}
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
                      const theme = parsedTheme;
                      const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'theme.json';
                      a.click();
                    }}
                    className="flex-1 py-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
                  >
                    Download JSON
                  </button>
                  <button
                    onClick={() => {
                      const theme = parsedTheme;
                      const css = `:root {\n${Object.entries(theme).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v};`).join('\n')}\n}`;
                      navigator.clipboard.writeText(css);
                    }}
                    className="flex-1 py-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
                  >
                    Copy CSS
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Modules */}
            <div className="space-y-4 pt-4 border-t border-[var(--color-bg-tertiary)]">
              <CustomElementColors />
              <CustomBackground />
              <CardAuraSelector />
            </div>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
