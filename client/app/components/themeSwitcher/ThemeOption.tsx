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
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Safety check for undefined theme
    if (!theme || !theme.bg) {
        return null;
    }

    return (
        <div onClick={() => setTheme(themeName)} className="rounded-md p-3 sm:p-5 hover:cursor-pointer flex gap-4 items-center border-2" style={{ background: theme.bg, color: theme.fg, borderColor: theme.bgSecondary }}>
            <div className="text-xs sm:text-sm">{capitalizeFirstLetter(themeName)}</div>
            <div className="w-[50px] h-[30px] rounded-md" style={{ background: theme.bgSecondary }}></div>
            <div className="w-[50px] h-[30px] rounded-md" style={{ background: theme.fgSecondary }}></div>
            <div className="w-[50px] h-[30px] rounded-md" style={{ background: theme.primary }}></div>
        </div>
    )
}