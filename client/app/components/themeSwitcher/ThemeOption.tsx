import type { Theme } from "~/styles/themes.css";

interface Props {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    onClick: () => void;
}

export function ThemeOption({ name, primaryColor, secondaryColor, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className="relative overflow-hidden rounded-md h-16 border-2 border-transparent hover:border-[var(--color-primary)] transition-all shadow-md group"
            style={{ backgroundColor: secondaryColor }}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold drop-shadow-md" style={{ color: primaryColor }}>
                    {name}
                </span>
            </div>
        </button>
    );
}

// Keep old default export for compatibility
export default function ThemeOptionLegacy({ theme, themeName, setTheme }: { theme: Theme, themeName: string, setTheme: Function }) {
    const capitalizeFirstLetter = (s: string) => {
        // Convert camelCase to Title Case with spaces
        return s
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    // Safety check for undefined theme
    if (!theme || !theme.bg) {
        return null;
    }

    return (
        <div
            onClick={() => setTheme(themeName)}
            className="rounded-lg p-3 hover:cursor-pointer flex flex-col gap-2 border-2 transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{ background: theme.bg, color: theme.fg, borderColor: theme.bgSecondary }}
        >
            {/* Theme Name - full width, no truncation */}
            <div className="text-xs font-semibold leading-tight" style={{ color: theme.fg }}>
                {capitalizeFirstLetter(themeName)}
            </div>
            {/* Color Swatches */}
            <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-md flex-shrink-0 shadow-sm border border-black/10" style={{ background: theme.bgSecondary }}></div>
                <div className="w-6 h-6 rounded-md flex-shrink-0 shadow-sm border border-black/10" style={{ background: theme.fgSecondary }}></div>
                <div className="w-6 h-6 rounded-md flex-shrink-0 shadow-sm border border-black/10" style={{ background: theme.primary }}></div>
            </div>
        </div>
    )
}