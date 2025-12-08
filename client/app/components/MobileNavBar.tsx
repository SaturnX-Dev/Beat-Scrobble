import { Home, List, Search, MoreHorizontal, Music, User, ArrowLeft, Settings2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState } from "react";
import SettingsModal from "./modals/SettingsModal";
import SearchModal from "./modals/SearchModal";

export default function MobileNavBar() {
    const location = useLocation();
    const [view, setView] = useState<'main' | 'more'>('main');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navItemClass = (path: string) => `flex flex-col items-center gap-1 transition-colors ${isActive(path)
        ? "text-[var(--color-primary)]"
        : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
        }`;

    const buttonClass = "flex flex-col items-center gap-1 transition-colors text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] outline-none";

    // Helper to reset view when clicking a link in the "More" menu
    const handleLinkClick = () => {
        setView('main');
    };

    return (
        <div className="fixed bottom-6 left-4 right-4 md:hidden z-50">
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
            <SearchModal open={searchOpen} setOpen={setSearchOpen} />

            <nav className="bg-[var(--color-bg-secondary)]/95 backdrop-blur-md border border-[var(--color-bg-tertiary)] rounded-2xl shadow-premium h-16 overflow-hidden relative">
                <div
                    className="absolute top-0 left-0 h-full w-[200%] flex transition-transform duration-300 ease-out"
                    style={{ transform: view === 'main' ? 'translateX(0%)' : 'translateX(-50%)' }}
                >
                    {/* Main View (First Half) */}
                    <div className="w-1/2 h-full flex items-center justify-around px-2">
                        <Link to="/" className={navItemClass("/")}>
                            <Home size={22} strokeWidth={isActive("/") ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">Home</span>
                        </Link>

                        <Link to="/timeline" className={navItemClass("/timeline")}>
                            <List size={22} strokeWidth={isActive("/timeline") ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">Timeline</span>
                        </Link>

                        <button onClick={() => setSearchOpen(true)} className={buttonClass}>
                            <Search size={22} />
                            <span className="text-[10px] font-medium">Search</span>
                        </button>

                        <button onClick={() => setView('more')} className={buttonClass}>
                            <MoreHorizontal size={22} />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </div>

                    {/* More View (Second Half) */}
                    <div className="w-1/2 h-full flex items-center justify-around px-2">
                        <button onClick={() => setView('main')} className={buttonClass}>
                            <ArrowLeft size={22} />
                            <span className="text-[10px] font-medium">Back</span>
                        </button>

                        <Link to="/playlists" onClick={handleLinkClick} className={navItemClass("/playlists")}>
                            <Music size={22} strokeWidth={isActive("/playlists") ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">Playlists</span>
                        </Link>

                        <Link to="/profile" onClick={handleLinkClick} className={navItemClass("/profile")}>
                            <User size={22} strokeWidth={isActive("/profile") ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">Profile</span>
                        </Link>

                        <button onClick={() => { setSettingsOpen(true); handleLinkClick(); }} className={buttonClass}>
                            <Settings2 size={22} />
                            <span className="text-[10px] font-medium">Config</span>
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
}

