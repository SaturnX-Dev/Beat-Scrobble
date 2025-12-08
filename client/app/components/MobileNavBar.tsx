import { Link, useLocation } from "react-router";
import { Home, List, Search, MoreHorizontal, Music, User, Settings2, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import SettingsModal from "./modals/SettingsModal";
import SearchModal from "./modals/SearchModal";

interface Props {
    className?: string;
}

export default function MobileNavBar({ className }: Props) {
    const loc = useLocation();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // If on /mediaitem route -> hide navbar? Or allow back?
    // Usually a pure mobile app hides bottom bar on detail views or keeps it.
    // Let's keep it for now.

    const isActive = (p: string) => {
        if (p === "/" && loc.pathname === "/") return true;
        if (p !== "/" && loc.pathname.startsWith(p)) return true;
        return false;
    }

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)] border-t border-[var(--color-bg-tertiary)] pb-safe-area ${className}`}>
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
            <SearchModal open={searchOpen} setOpen={setSearchOpen} />

            <nav className="flex items-center justify-around h-16 px-2">
                <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/") ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}>
                    <Home size={22} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link to="/timeline" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/timeline") ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}>
                    <List size={22} />
                    <span className="text-[10px] font-medium">Timeline</span>
                </Link>

                {/* Search Button (Triggers Modal) */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className={`flex flex-col items-center gap-1 transition-colors ${searchOpen ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}
                >
                    <Search size={22} />
                    <span className="text-[10px] font-medium">Search</span>
                </button>

                <Link to="/playlists" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/playlists") ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}>
                    <Music size={22} />
                    <span className="text-[10px] font-medium">Playlists</span>
                </Link>

                <Link to="/profile" className={`flex flex-col items-center gap-1 transition-colors ${isActive("/profile") ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}>
                    <User size={22} />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className={`flex flex-col items-center gap-1 transition-colors ${settingsOpen ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)]"}`}
                    >
                        <Settings2 size={22} />
                        <span className="text-[10px] font-medium">Config</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
