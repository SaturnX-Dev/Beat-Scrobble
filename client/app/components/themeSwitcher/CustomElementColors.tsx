import { useState, useEffect } from "react";
import { ChevronDown, Palette } from "lucide-react";
import { usePreferences } from "~/hooks/usePreferences";

interface ColorElement {
    id: string;
    label: string;
    description: string;
    cssVar: string;
}

const COLOR_ELEMENTS: ColorElement[] = [
    { id: 'cards', label: 'Cards', description: 'Card backgrounds and hover states', cssVar: '--custom-cards' },
    { id: 'buttons', label: 'Buttons', description: 'Primary and secondary buttons', cssVar: '--custom-buttons' },
    { id: 'links', label: 'Links', description: 'Hyperlinks and clickable text', cssVar: '--custom-links' },
    { id: 'backgrounds', label: 'Backgrounds', description: 'Page and section backgrounds', cssVar: '--custom-backgrounds' },
    { id: 'icons', label: 'Icons', description: 'Icon colors and accents', cssVar: '--custom-icons' },
    { id: 'navbars', label: 'Navbars', description: 'Navigation bar elements', cssVar: '--custom-navbars' },
    { id: 'tooltips', label: 'Tooltips', description: 'Tooltip backgrounds and text', cssVar: '--custom-tooltips' },
    { id: 'badges', label: 'Badges', description: 'Status badges and tags', cssVar: '--custom-badges' },
    { id: 'progress', label: 'Progress', description: 'Progress bars and indicators', cssVar: '--custom-progress' },
    { id: 'inputs', label: 'Inputs', description: 'Input fields and form elements', cssVar: '--custom-inputs' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

export function CustomElementColors() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [elements, setElements] = useState<Record<string, { enabled: boolean; color: string }>>({});
    const { getPreference, savePreference } = usePreferences();

    // Load from server preferences on mount
    useEffect(() => {
        const loadFromServer = () => {
            const stored: Record<string, { enabled: boolean; color: string }> = {};
            const serverData = getPreference('customElementColors', {});

            COLOR_ELEMENTS.forEach(el => {
                const elData = serverData[el.id] || { enabled: false, color: '#0a84ff' };
                stored[el.id] = elData;

                // Apply if enabled
                if (elData.enabled && typeof document !== 'undefined') {
                    document.documentElement.style.setProperty(el.cssVar, elData.color);
                }
            });
            setElements(stored);
        };

        loadFromServer();
    }, [getPreference]);

    const updateElement = (id: string, key: 'enabled' | 'color', value: boolean | string) => {
        const el = COLOR_ELEMENTS.find(e => e.id === id);
        if (!el) return;

        const updated = {
            ...elements,
            [id]: { ...elements[id], [key]: value }
        };
        setElements(updated);

        // Save to server
        savePreference('customElementColors', updated);

        // Apply or remove CSS variable
        if (key === 'enabled') {
            if (value) {
                document.documentElement.style.setProperty(el.cssVar, updated[id].color);
            } else {
                document.documentElement.style.removeProperty(el.cssVar);
            }
        } else if (key === 'color' && updated[id].enabled) {
            document.documentElement.style.setProperty(el.cssVar, value as string);
        }
    };

    return (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-bg-tertiary)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] group-hover:bg-[var(--color-primary)]/10 transition-colors">
                        <Palette size={18} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-[var(--color-fg)]">Custom Element Colors</h3>
                        <p className="text-xs text-[var(--color-fg-secondary)]">Customize colors for specific UI elements</p>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-[var(--color-fg-secondary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-[var(--color-fg-tertiary)]">
                        Enable custom colors for different UI elements. Supports HEX color codes.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {COLOR_ELEMENTS.map((element) => {
                            const state = elements[element.id] || { enabled: false, color: '#0a84ff' };
                            const rgb = hexToRgb(state.color);

                            return (
                                <div
                                    key={element.id}
                                    className={`p-3 rounded-lg border transition-all ${state.enabled
                                            ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5'
                                            : 'border-[var(--color-bg-tertiary)] bg-[var(--color-bg)]'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="text-sm font-medium text-[var(--color-fg)]">{element.label}</span>
                                            <p className="text-[10px] text-[var(--color-fg-tertiary)]">{element.description}</p>
                                        </div>
                                        <button
                                            onClick={() => updateElement(element.id, 'enabled', !state.enabled)}
                                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${state.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                                                }`}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${state.enabled ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {state.enabled && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="color"
                                                value={state.color}
                                                onChange={(e) => updateElement(element.id, 'color', e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
                                            />
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={state.color.toUpperCase()}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (!val.startsWith('#')) val = '#' + val;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                                            updateElement(element.id, 'color', val);
                                                        }
                                                    }}
                                                    placeholder="#FFFFFF"
                                                    className="w-full px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded text-xs font-mono"
                                                />
                                                {rgb && (
                                                    <p className="text-[9px] text-[var(--color-fg-tertiary)] mt-0.5">
                                                        RGB: {rgb.r}, {rgb.g}, {rgb.b}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
