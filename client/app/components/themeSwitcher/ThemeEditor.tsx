import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { type Theme } from "~/styles/themes.css";

// Group definitions for CSS variables
const THEME_GROUPS: Record<string, { label: string; keys: (keyof Theme)[]; isColor: boolean }> = {
    core: {
        label: 'Core Colors',
        keys: ['bg', 'bgSecondary', 'bgTertiary', 'fg', 'fgSecondary', 'fgTertiary', 'primary', 'primaryDim', 'accent', 'accentDim', 'error', 'warning', 'info', 'success'],
        isColor: true
    },
    borders: {
        label: 'Borders',
        keys: ['border', 'borderSecondary', 'borderFocus'],
        isColor: true
    },
    shadows: {
        label: 'Shadows',
        keys: ['shadow', 'shadowHover', 'shadowGlow'],
        isColor: true
    },
    gradients: {
        label: 'Gradients',
        keys: ['gradientStart', 'gradientEnd', 'gradientAngle'],
        isColor: false  // mixed
    },
    aura: {
        label: 'Aura Effects',
        keys: ['auraOpacity', 'auraBlur', 'auraSize'],
        isColor: false
    },
    typography: {
        label: 'Typography',
        keys: ['fontPrimary', 'fontSecondary', 'headerWeight', 'bodyWeight'],
        isColor: false
    },
    radius: {
        label: 'Border Radius',
        keys: ['radiusSm', 'radiusMd', 'radiusLg'],
        isColor: false
    },
    animation: {
        label: 'Animations',
        keys: ['transitionSpeed', 'transitionEase'],
        isColor: false
    },
    links: {
        label: 'Links',
        keys: ['link', 'linkHover', 'linkActive'],
        isColor: true
    },
    overlay: {
        label: 'Overlays',
        keys: ['overlay', 'overlayDim', 'backdropBlur'],
        isColor: false  // mixed
    },
    charts: {
        label: 'Chart Colors',
        keys: ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6'],
        isColor: true
    },
    glass: {
        label: 'Glass Effects',
        keys: ['glassOpacity', 'glassBorder'],
        isColor: false  // mixed
    },
};

// Variables that should use color picker
const COLOR_VARS = new Set([
    'bg', 'bgSecondary', 'bgTertiary', 'fg', 'fgSecondary', 'fgTertiary',
    'primary', 'primaryDim', 'accent', 'accentDim', 'error', 'warning', 'info', 'success',
    'border', 'borderSecondary', 'borderFocus', 'shadow', 'shadowHover', 'shadowGlow',
    'gradientStart', 'gradientEnd', 'link', 'linkHover', 'linkActive',
    'overlay', 'overlayDim', 'chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6', 'glassBorder'
]);

function formatLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

interface ThemeEditorProps {
    theme: any; // Using any for flexibility with partial themes, but conceptually Theme
    onUpdate: (key: string, value: any) => void;
}

export function ThemeEditor({ theme, onUpdate }: ThemeEditorProps) {
    // Default Core Colors to expanded
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        core: true
    });

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const renderInput = (key: keyof Theme) => {
        const value = theme[key] || "";
        const isColor = COLOR_VARS.has(key);

        if (isColor) {
            // Try to extract hex color
            const hexMatch = String(value).match(/#[0-9a-fA-F]{6}/);
            const hexColor = hexMatch ? hexMatch[0] : '#000000';

            return (
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={hexColor}
                        onChange={(e) => onUpdate(key, e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onUpdate(key, e.target.value)}
                        className="flex-1 bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded px-2 py-1 text-xs font-mono min-w-0"
                    />
                </div>
            );
        }

        // Default text input for non-color values
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => onUpdate(key, e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-bg-tertiary)] rounded px-2 py-1.5 text-xs font-mono"
            />
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-bg-tertiary)] pb-2 mb-4">
                <h3 className="text-sm font-bold text-[var(--color-fg)]">Theme Editor</h3>
                <p className="text-xs text-[var(--color-fg-secondary)]">Edit all theme variables</p>
            </div>

            {/* Groups */}
            <div className="space-y-2">
                {Object.entries(THEME_GROUPS).map(([groupId, group]) => {
                    const isGroupExpanded = expandedGroups[groupId];

                    return (
                        <div
                            key={groupId}
                            className="bg-[var(--color-bg)]/50 rounded-lg border border-[var(--color-bg-tertiary)]/50 overflow-hidden"
                        >
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(groupId)}
                                className="w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-tertiary)]/20 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{group.label}</span>
                                    <span className="text-xs text-[var(--color-fg-tertiary)]">
                                        ({group.keys.length})
                                    </span>
                                </div>
                                {isGroupExpanded ? (
                                    <ChevronUp size={16} className="text-[var(--color-fg-tertiary)]" />
                                ) : (
                                    <ChevronDown size={16} className="text-[var(--color-fg-tertiary)]" />
                                )}
                            </button>

                            {/* Group Content */}
                            {isGroupExpanded && (
                                <div className="p-3 pt-0 space-y-3 border-t border-[var(--color-bg-tertiary)]/30">
                                    {/* Variables Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                        {group.keys.map(key => (
                                            <div key={key} className="space-y-1">
                                                <label className="text-xs text-[var(--color-fg-secondary)] flex items-center gap-1">
                                                    {formatLabel(key)}
                                                </label>
                                                {renderInput(key)}
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
