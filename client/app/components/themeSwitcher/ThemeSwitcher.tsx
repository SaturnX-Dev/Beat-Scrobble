import { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import themes from "~/styles/themes.css";
import { AsyncButton } from "../AsyncButton";
import { CardAuraSelector } from "./CardAuraSelector";
import { ThemePaletteSelector } from "./ThemePaletteSelector";
import { ThemeEditor } from "./ThemeEditor";
import { CustomBackground } from "./CustomBackground";
import { Collapsible } from "../ui/Collapsible";
import { Clock, Palette, Settings2, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { setTheme, setCustomTheme, getCustomTheme, resetTheme } = useTheme();

  const initialTheme = {
    ...themes.modernDark, // Default to modernDark
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

      // Define palettes using imported themes
      const lightTheme = {
        ...themes.modernLight,
        autoEnabled: true, dayStart: parsedTheme.dayStart, nightStart: parsedTheme.nightStart // Preserve settings
      };

      const darkTheme = {
        ...themes.modernDark,
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
            {/* Reordered Layout as requested */}
            <div className="space-y-6">
              <CardAuraSelector />

              <CustomBackground />

              <ThemeEditor
                theme={parsedTheme}
                onUpdate={updateField}
              />
            </div>

            {/* Export Buttons */}
            <div className="pt-4 border-t border-[var(--color-bg-tertiary)] flex gap-2">
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
                className="flex-1 py-1.5 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
              >
                Download JSON
              </button>
              <button
                onClick={() => {
                  const theme = parsedTheme;
                  const css = `:root {\n${Object.entries(theme).map(([k, v]) => `  --color-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v};`).join('\n')}\n}`;
                  navigator.clipboard.writeText(css);
                }}
                className="flex-1 py-1.5 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-xs font-bold text-[var(--color-fg-secondary)] border border-[var(--color-bg-tertiary)]"
              >
                Copy CSS
              </button>
            </div>

            {/* Import Section */}
            <div className="pt-4 border-t border-[var(--color-bg-tertiary)]">
              <Collapsible title="Import Theme code" icon={<Settings2 size={14} />} subtitle="Paste JSON config here">
                <div className="space-y-3 pt-2">
                  <textarea
                    className="w-full h-24 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded-lg p-3 text-[10px] font-mono text-[var(--color-fg-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                    placeholder='Paste theme JSON here: { "bg": "#...", ... }'
                    onChange={(e) => {
                      // Auto-validate visually could go here, but we'll validate on click
                    }}
                    id="theme-import-input"
                  />
                  <AsyncButton
                    onClick={async () => {
                      const input = (document.getElementById('theme-import-input') as HTMLTextAreaElement).value;
                      try {
                        const imported = JSON.parse(input);
                        if (!imported.bg || !imported.primary) {
                          alert("Invalid Theme: Missing 'bg' or 'primary' colors.");
                          return;
                        }
                        setCustomTheme(imported);
                        setCustom(JSON.stringify(imported, null, 2));
                        (document.getElementById('theme-import-input') as HTMLTextAreaElement).value = ''; // clear
                      } catch (e) {
                        alert("Invalid JSON: Please check your syntax.");
                      }
                    }}
                    className="w-full py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-bg-tertiary)] hover:border-transparent rounded-lg text-xs font-bold transition-all text-[var(--color-fg)]"
                  >
                    Apply Preset
                  </AsyncButton>
                </div>
              </Collapsible>
            </div>

          </div>
        </Collapsible>
      </div>
    </div>
  );
}
