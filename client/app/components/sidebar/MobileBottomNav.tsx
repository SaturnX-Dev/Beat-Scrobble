import { Home, List, Search, User, Activity } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState } from "react";
import SearchModal from "~/components/modals/SearchModal";

export default function MobileBottomNav() {
    const location = useLocation();
    const [searchOpen, setSearchOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <SearchModal open={searchOpen} setOpen={setSearchOpen} />

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)]/95 backdrop-blur-xl border-t border-[var(--color-bg-tertiary)] safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-around px-2 py-3">
                    <Link
                        to="/"
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 ${isActive('/') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]'}`}
                    >
                        <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>

                    <Link
                        to="/timeline"
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 ${isActive('/timeline') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]'}`}
                    >
                        <List size={22} strokeWidth={isActive('/timeline') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Timeline</span>
                    </Link>

                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]"
                    >
                        <Search size={22} />
                        <span className="text-[10px] font-medium">Search</span>
                    </button>

                    <Link
                        to="/history"
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 ${isActive('/history') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]'}`}
                    >
                        <Activity size={22} strokeWidth={isActive('/history') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Stats</span>
                    </Link>

                    <Link
                        to="/profile"
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 ${isActive('/profile') ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]'}`}
                    >
                        <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </div>
            </div>
        </>
    );
}
