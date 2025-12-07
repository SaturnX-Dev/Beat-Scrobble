import { Home, List, Search, MoreHorizontal, Music, User, Settings2, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState, useRef } from "react";
import SettingsModal from "./modals/SettingsModal";

export default function MobileNavBar() {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Swipe Logic
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        handleSwipe();
    };

    const handleSwipe = () => {
        const threshold = 50;
        const diff = touchEndX.current - touchStartX.current;

        if (Math.abs(diff) > threshold) {
            // Swipe Right (diff > 0) -> Expand (per user request)
            if (diff > 0 && !isExpanded) {
                setIsExpanded(true);
            }
            // Swipe Left (diff < 0) -> Contract (per user request)
            if (diff < 0 && isExpanded) {
                setIsExpanded(false);
            }
        }
    };

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: List, label: "Timeline", path: "/timeline" },
        // Search is special, maybe links to search page or open modal? For now /search
        { icon: Search, label: "Search", path: "/search" },
    ];

    return (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
            <nav
                className="bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl border border-[var(--color-bg-tertiary)]/50 rounded-2xl shadow-premium px-4 py-3 relative overflow-hidden h-[66px]"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Primary Menu */}
                <div
                    className={`absolute inset-0 flex items-center justify-around transition-transform duration-300 ease-in-out px-4 ${isExpanded ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
                        }`}
                >
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive(item.path)
                                ? "text-[var(--color-primary)]"
                                : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
                                }`}
                        >
                            <item.icon size={22} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    ))}
                    <button
                        onClick={() => setIsExpanded(true)}
                        className={`flex flex-col items-center gap-1 transition-colors text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] outline-none`}
                    >
                        <MoreHorizontal size={22} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>

                {/* Secondary Menu (Expanded) */}
                <div
                    className={`absolute inset-0 flex items-center justify-around transition-transform duration-300 ease-in-out px-4 ${isExpanded ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
                        }`}
                >
                    <button
                        onClick={() => setIsExpanded(false)}
                        className={`flex flex-col items-center gap-1 transition-colors text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] outline-none`}
                    >
                        <ChevronLeft size={22} />
                        <span className="text-[10px] font-medium">Back</span>
                    </button>

                    <Link to="/playlists" className="flex flex-col items-center gap-1 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors">
                        <Music size={22} />
                        <span className="text-[10px] font-medium">Playlists</span>
                    </Link>

                    <Link to="/profile" className="flex flex-col items-center gap-1 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors">
                        <User size={22} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>

                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="flex flex-col items-center gap-1 text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors"
                    >
                        <Settings2 size={22} />
                        <span className="text-[10px] font-medium">Config</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
