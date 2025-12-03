import { Home, List, Search, MoreHorizontal, Activity, User, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState } from "react";
import SearchModal from "~/components/modals/SearchModal";
import SettingsModal from "~/components/modals/SettingsModal";

export default function MobileBottomNav() {
    const location = useLocation();
    const [searchOpen, setSearchOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <SearchModal open={searchOpen} setOpen={setSearchOpen} />
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />

            {/* More Menu Dropdown */}
            {moreMenuOpen && (
                <>
                    <div
                        className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMoreMenuOpen(false)}
                    />
                    <div className="md:hidden fixed bottom-[92px] left-0 right-0 z-[60] flex justify-center px-4">
                        <div className="w-full max-w-md bg-[var(--color-bg)]/98 backdrop-blur-xl border border-[var(--color-bg-tertiary)] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                            <div className="p-2 space-y-1">
                                <Link
                                    to="/history"
                                    onClick={() => setMoreMenuOpen(false)}
                                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-150 ${isActive('/history')
                                        ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/15 shadow-sm'
                                        : 'text-[var(--color-fg)] hover:bg-[var(--color-bg-tertiary)]/50 active:bg-[var(--color-bg-tertiary)]'
                                        }`}
                                >
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isActive('/history')
                                        ? 'bg-[var(--color-primary)]/20'
                                        : 'bg-[var(--color-bg-secondary)]'
                                        }`}>
                                        <Activity size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-base block leading-tight">Stats</span>
                                        <span className="text-xs text-[var(--color-fg-secondary)] truncate block">View your listening stats</span>
                                    </div>
                                </Link>

                                <Link
                                    to="/profile"
                                    onClick={() => setMoreMenuOpen(false)}
                                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-150 ${isActive('/profile')
                                        ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/15 shadow-sm'
                                        : 'text-[var(--color-fg)] hover:bg-[var(--color-bg-tertiary)]/50 active:bg-[var(--color-bg-tertiary)]'
                                        }`}
                                >
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isActive('/profile')
                                        ? 'bg-[var(--color-primary)]/20'
                                        : 'bg-[var(--color-bg-secondary)]'
                                        }`}>
                                        <User size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-base block leading-tight">Profile</span>
                                        <span className="text-xs text-[var(--color-fg-secondary)] truncate block">Your listening profile</span>
                                    </div>
                                </Link>

                                <button
                                    onClick={() => {
                                        setMoreMenuOpen(false);
                                        setSettingsOpen(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-150 text-[var(--color-fg)] hover:bg-[var(--color-bg-tertiary)]/50 active:bg-[var(--color-bg-tertiary)]"
                                >
                                    <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] flex-shrink-0">
                                        <Settings size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-base block leading-tight">Settings</span>
                                        <span className="text-xs text-[var(--color-fg-secondary)] truncate block">App preferences</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

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

                    <button
                        onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                        className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 ${moreMenuOpen || isActive('/history') || isActive('/profile')
                            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                            : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-fg)]'
                            }`}
                    >
                        <MoreHorizontal size={22} strokeWidth={moreMenuOpen ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </div>
        </>
    );
}