import { useState, useEffect } from 'react';
import { themes, type Theme } from 'app/styles/themes.css';
import { ChevronDown, ChevronUp, RotateCcw, Palette } from 'lucide-react';

// Group definitions for the UI
const themeGroups = {
    'Core Colors': ['bg', 'bgSecondary', 'bgTertiary', 'fg', 'fgSecondary', 'fgTertiary', 'primary', 'primaryDim', 'accent', 'accentDim', 'error', 'warning', 'info', 'success'] as const,
    'Borders': ['border', 'borderSecondary', 'borderFocus'] as const,
    'Shadows': ['shadow', 'shadowHover', 'shadowGlow'] as const,
    'Gradients': ['gradientStart', 'gradientEnd', 'gradientAngle'] as const,
    'Aura Effects': ['auraOpacity', 'auraBlur', 'auraSize'] as const,
    'Typography': ['fontPrimary', 'fontSecondary', 'headerWeight', 'bodyWeight'] as const,
    'Border Radius': ['radiusSm', 'radiusMd', 'radiusLg'] as const,
    'Animations': ['transitionSpeed', 'transitionEase'] as const,
    'Links': ['link', 'linkHover', 'linkActive'] as const,
    'Overlays': ['overlay', 'overlayDim', 'backdropBlur'] as const,
    'Chart Colors': ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6'] as const,
    'Glass Effects': ['glassOpacity', 'glassBorder'] as const,
};

type ThemeKey = keyof Theme;

// Variables that should use color picker
const colorVars = new Set([
    'bg', 'bgSecondary', 'bgTertiary', 'fg', 'fgSecondary', 'fgTertiary',
    'primary', 'primaryDim', 'accent', 'accentDim', 'error', 'warning', 'info', 'success',
    'border', 'borderSecondary', 'borderFocus', 'shadow', 'shadowHover', 'shadowGlow',
    'gradientStart', 'gradientEnd', 'link', 'linkHover', 'linkActive',
    'overlay', 'overlayDim', 'chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6', 'glassBorder'
]);

// Variables that should use slider (0-1 or percentage)
const sliderVars = new Set(['auraOpacity', 'glassOpacity']);
// Variables that should use px/rem slider
const sizeVars = new Set(['auraBlur', 'auraSize', 'radiusSm', 'radiusMd', 'radiusLg', 'backdropBlur', 'transitionSpeed']);

interface ThemeEditorProps {
    currentTheme: string;
    customOverrides: Partial<Theme>;
    onSave: (overrides: Partial<Theme>) => void;
}

export default function ThemeEditor({ currentTheme, customOverrides, onSave }: ThemeEditorProps) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [localOverrides, setLocalOverrides] = useState<Partial<Theme>>(customOverrides);
    const baseTheme = themes[currentTheme] || themes.slate;

    useEffect(() => {
        setLocalOverrides(customOverrides);
    }, [customOverrides]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleChange = (key: ThemeKey, value: string) => {
        const newOverrides = { ...localOverrides, [key]: value };
        setLocalOverrides(newOverrides);
        onSave(newOverrides);
        // Apply immediately via CSS custom property
        document.documentElement.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    };

    const resetGroup = (group: string) => {
        const groupKeys = themeGroups[group as keyof typeof themeGroups];
        const newOverrides = { ...localOverrides };
        groupKeys.forEach(key => {
            delete newOverrides[key as ThemeKey];
            // Reset CSS variable to theme default
            const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            document.documentElement.style.removeProperty(cssVar);
        });
        setLocalOverrides(newOverrides);
        onSave(newOverrides);
    };

    const resetAll = () => {
        setLocalOverrides({});
        onSave({});
        // Remove all custom properties
        Object.keys(baseTheme).forEach(key => {
            const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            document.documentElement.style.removeProperty(cssVar);
        });
    };

    const getValue = (key: ThemeKey): string => {
        return (localOverrides[key] ?? baseTheme[key]) as string;
    };

    const renderInput = (key: ThemeKey) => {
        const value = getValue(key);
        const isColor = colorVars.has(key);
        const isSlider = sliderVars.has(key);
        const isSize = sizeVars.has(key);

        if (isColor) {
            // Extract hex color from value (may have opacity suffix)
            const hexMatch = value.match(/#[0-9a-fA-F]{6}/);
            const hexColor = hexMatch ? hexMatch[0] : '#000000';

            return (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={hexColor}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded px-2 py-1 text-xs font-mono"
                    />
                </div>
            );
        }

        if (isSlider) {
            const numValue = parseFloat(value) || 0;
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={numValue}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="flex-1"
                    />
                    <span className="text-xs font-mono w-12">{numValue.toFixed(2)}</span>
                </div>
            );
        }

        if (isSize) {
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded px-2 py-1 text-xs font-mono"
                    placeholder={baseTheme[key] as string}
                />
            );
        }

        // Default text input
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded px-2 py-1 text-xs font-mono"
            />
        );
    };

    const formatLabel = (key: string): string => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-sm font-medium">Custom Element Colors</span>
                </div>
                <button
                    onClick={resetAll}
                    className="flex items-center gap-1 text-xs text-[var(--color-fg-tertiary)] hover:text-[var(--color-primary)] transition-colors"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset All
                </button>
            </div>

            {/* Groups */}
            <div className="space-y-2">
                {Object.entries(themeGroups).map(([groupName, keys]) => {
                    const isExpanded = expandedGroups[groupName];
                    const hasOverrides = keys.some(k => localOverrides[k as ThemeKey] !== undefined);

                    return (
                        <div
                            key={groupName}
                            className="bg-[var(--color-bg-secondary)]/50 rounded-lg border border-[var(--color-bg-tertiary)]/50 overflow-hidden"
                        >
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupName)}
                                className="w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-tertiary)]/30 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{groupName}</span>
                                    {hasOverrides && (
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                                    )}
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-[var(--color-fg-tertiary)]" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-[var(--color-fg-tertiary)]" />
                                )}
                            </button>

                            {/* Group Content */}
                            {isExpanded && (
                                <div className="p-3 pt-0 space-y-3 border-t border-[var(--color-bg-tertiary)]/30">
                                    {/* Reset group button */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => resetGroup(groupName)}
                                            className="text-xs text-[var(--color-fg-tertiary)] hover:text-[var(--color-primary)] transition-colors"
                                        >
                                            Reset {groupName}
                                        </button>
                                    </div>

                                    {/* Variables */}
                                    <div className="grid gap-3">
                                        {keys.map(key => (
                                            <div key={key} className="space-y-1">
                                                <label className="text-xs text-[var(--color-fg-secondary)]">
                                                    {formatLabel(key)}
                                                </label>
                                                {renderInput(key as ThemeKey)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
