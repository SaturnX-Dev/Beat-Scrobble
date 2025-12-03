import { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import themes from "~/styles/themes.css";
import ThemeOptionLegacy, { ThemeOption } from "./ThemeOption";
import { AsyncButton } from "../AsyncButton";

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
          {(() => {
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
                        {Object.entries(themes)
                          .filter(([name]) => ["rose", "slate", "ocean", "forest", "sunset", "purple", "snow", "coral", "teal", "amber", "lavender"].includes(name))
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

                    {/* Apple Style */}
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Apple Style</h4>
                      <div className="grid grid-cols-2 items-center gap-2">
                        <ThemeOptionLegacy
                          setTheme={(name: string) => {
                            const appleTheme = {
                              bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
                              fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
                              primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
                              error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff"
                            };
                            setCustomTheme(appleTheme);
                            setCustom(JSON.stringify(appleTheme, null, 2));
                          }}
                          theme={{
                            bg: "#000000", bgSecondary: "#1c1c1e", bgTertiary: "#2c2c2e",
                            fg: "#ffffff", fgSecondary: "#8e8e93", fgTertiary: "#48484a",
                            primary: "#0a84ff", primaryDim: "#007aff", accent: "#5e5ce6", accentDim: "#5e5ce6",
                            error: "#ff453a", warning: "#ff9f0a", success: "#32d74b", info: "#64d2ff"
                          }}
                          themeName="Apple Dark"
                        />
                        <ThemeOptionLegacy
                          setTheme={(name: string) => {
                            const appleTheme = {
                              bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
                              fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
                              primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
                              error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa"
                            };
                            setCustomTheme(appleTheme);
                            setCustom(JSON.stringify(appleTheme, null, 2));
                          }}
                          theme={{
                            bg: "#f2f2f7", bgSecondary: "#ffffff", bgTertiary: "#e5e5ea",
                            fg: "#000000", fgSecondary: "#8e8e93", fgTertiary: "#c7c7cc",
                            primary: "#007aff", primaryDim: "#007aff", accent: "#5856d6", accentDim: "#5856d6",
                            error: "#ff3b30", warning: "#ff9500", success: "#34c759", info: "#5ac8fa"
                          }}
                          themeName="Apple Light"
                        />
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
          })()}

          {/* Future Features - Advanced Section */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-fg-secondary)] mb-2 uppercase tracking-wider">Advanced</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const theme = JSON.parse(event.target?.result as string);
                        setCustom(JSON.stringify(theme, null, 2));
                        setCustomTheme(theme);
                        alert('Theme imported!');
                      } catch { alert('Invalid file'); }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }} className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors text-sm" title="Import JSON">
                📥 Import
              </button>
              <button onClick={() => {
                const url = `${window.location.origin}/?theme=${btoa(custom)}`;
                navigator.clipboard.writeText(url);
              }} className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors text-sm" title="Share URL">
                🔗 Share
              </button>
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
                const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const autoTheme = dark ? 'slate' : 'snow';
                setTheme(autoTheme);
                const selectedTheme = themes[autoTheme];
                if (selectedTheme) {
                  setCustom(JSON.stringify(selectedTheme, null, 2));
                }
              }} className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-primary)] transition-colors text-sm" title="Auto Mode">
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

        {/* Primary Dim Application Selector */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 border border-[var(--color-bg-tertiary)]">
          <h3 className="text-sm font-bold text-[var(--color-fg)] mb-3">Primary Dim Usage</h3>
          <p className="text-xs text-[var(--color-fg-secondary)] mb-3">Select which elements use Primary Dim color for hover/active states</p>
          <div className="grid grid-cols-2 gap-2">
            {['Cards', 'Buttons', 'Links', 'Backgrounds'].map((element) => {
              const storageKey = `primaryDim-${element.toLowerCase()}`;
              const storedValue = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
              const initialChecked = storedValue === 'true' || (storedValue === null && element === 'Buttons');
              const [checked, setChecked] = useState(initialChecked);

              // Apply on mount using useEffect
              useEffect(() => {
                if (typeof window !== 'undefined' && checked) {
                  document.documentElement.style.setProperty(`--primary-dim-${element.toLowerCase()}`, 'var(--color-primary-dim)');
                }
              }, []);

              return (
                <label key={element} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)]/30 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[var(--color-bg-tertiary)] bg-[var(--color-bg)] checked:bg-[var(--color-primary)] cursor-pointer"
                    checked={checked}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setChecked(newValue);
                      localStorage.setItem(storageKey, String(newValue));

                      if (newValue) {
                        document.documentElement.style.setProperty(`--primary-dim-${element.toLowerCase()}`, 'var(--color-primary-dim)');
                      } else {
                        document.documentElement.style.removeProperty(`--primary-dim-${element.toLowerCase()}`);
                      }
                    }}
                  />
                  <span className="text-sm text-[var(--color-fg)]">{element}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Card Aura Variation Selector */}
        {/* Card Aura Variation Selector */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-4 border border-[var(--color-bg-tertiary)]">
          {(() => {
            const storageKey = 'card-aura-style';
            const enabledKey = 'card-aura-enabled';
            const opacityKey = 'card-aura-opacity';
            const targetsKey = 'card-aura-targets';

            const storedValue = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
            const storedEnabled = typeof window !== 'undefined' ? localStorage.getItem(enabledKey) !== 'false' : true;
            const storedOpacity = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(opacityKey) || '0.3') : 0.3;
            const storedTargets = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(targetsKey) || '["dashboard"]') : ['dashboard'];

            const [selectedAura, setSelectedAura] = useState(storedValue || 'circle');
            const [isEnabled, setIsEnabled] = useState(storedEnabled);
            const [opacity, setOpacity] = useState(storedOpacity);
            const [targets, setTargets] = useState<string[]>(storedTargets);
            const [isExpanded, setIsExpanded] = useState(false);

            const auraStyles = [
              { id: 'circle', name: 'Circle', desc: 'Classic circular aura' },
              { id: 'ellipse-h', name: 'Horizontal', desc: 'Wide ellipse' },
              { id: 'ellipse-v', name: 'Vertical', desc: 'Tall ellipse' },
              { id: 'blob-1', name: 'Blob 1', desc: 'Organic shape 1' },
              { id: 'blob-2', name: 'Blob 2', desc: 'Organic shape 2' },
              { id: 'diamond', name: 'Diamond', desc: 'Rotated diamond' },
              { id: 'wave', name: 'Wave', desc: 'Horizontal wave' },
              { id: 'square', name: 'Square', desc: 'Soft square' },
              // New Styles
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

            useEffect(() => {
              if (typeof window !== 'undefined') {
                document.documentElement.setAttribute('data-aura-style', selectedAura);
                document.documentElement.style.setProperty('--aura-opacity', opacity.toString());
              }
            }, [selectedAura, opacity]);

            const updateSettings = (newEnabled: boolean, newOpacity: number, newTargets: string[]) => {
              localStorage.setItem(enabledKey, newEnabled.toString());
              localStorage.setItem(opacityKey, newOpacity.toString());
              localStorage.setItem(targetsKey, JSON.stringify(newTargets));

              // Dispatch event for CardAura components
              window.dispatchEvent(new Event('aura-settings-changed'));
            };

            const selectedStyle = auraStyles.find(s => s.id === selectedAura) || auraStyles[0];

            return (
              <div>
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
                    {(() => {
                      const perCardKey = 'card-aura-per-card-styles';
                      const storedPerCard = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(perCardKey) || '{}') : {};
                      const [perCardStyles, setPerCardStyles] = useState<Record<string, string>>(storedPerCard);
                      const [expandedCard, setExpandedCard] = useState<string | null>(null);

                      useEffect(() => {
                        localStorage.setItem(perCardKey, JSON.stringify(perCardStyles));
                        // Dispatch event for CardAura components to update
                        window.dispatchEvent(new Event('aura-settings-changed'));
                      }, [perCardStyles]);

                      return (
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
                      );
                    })()}

                    {/* Style Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {auraStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => {
                            setSelectedAura(style.id);
                            localStorage.setItem(storageKey, style.id);
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
          })()}
        </div>

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
