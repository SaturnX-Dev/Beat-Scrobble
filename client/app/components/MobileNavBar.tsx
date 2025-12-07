import { Home, List, Search, MoreHorizontal, Music, User } from "lucide-react";
import { Link, useLocation } from "react-router";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export default function MobileNavBar() {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: List, label: "Timeline", path: "/timeline" },
        // Search is special, maybe links to search page or open modal? For now /search
        { icon: Search, label: "Search", path: "/search" },
    ];

    return (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <nav className="bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl border border-[var(--color-bg-tertiary)]/50 rounded-2xl shadow-premium px-4 py-3 flex items-center justify-around">
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

                {/* More Menu */}
                <PopoverPrimitive.Root>
                    <PopoverPrimitive.Trigger asChild>
                        <button className={`flex flex-col items-center gap-1 transition-colors text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] outline-none`}>
                            <MoreHorizontal size={22} />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </PopoverPrimitive.Trigger>
                    <PopoverPrimitive.Portal>
                        <PopoverPrimitive.Content
                            className="w-40 mb-2 mr-2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-xl border border-[var(--color-bg-tertiary)] text-[var(--color-fg)] p-2 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 data-[side=top]:slide-in-from-bottom-2"
                            sideOffset={5}
                            align="end"
                        >
                            <div className="flex flex-col gap-1">
                                <Link to="/playlists" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)]/50 text-sm transition-colors">
                                    <Music size={16} /> Playlists
                                </Link>
                                <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)]/50 text-sm transition-colors">
                                    <User size={16} /> Profile
                                </Link>
                            </div>
                        </PopoverPrimitive.Content>
                    </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
            </nav>
        </div>
    );
}
