import { Home, List, Activity, User } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useState, useEffect } from "react";
import SidebarSettings from "./SidebarSettings";
import SidebarItem from "./SidebarItem";
import SidebarSearch from "./SidebarSearch";
import SettingsModal from "../modals/SettingsModal";
import MobileBottomNav from "./MobileBottomNav";

export default function Sidebar() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const location = useLocation();
    const iconSize = 24;

    const isActive = (path: string) => location.pathname === path;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement;
            const isTyping = active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                (active as HTMLElement).isContentEditable
            );

            if (!isTyping && e.key === '\\') {
                e.preventDefault();
                setSettingsOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />

            {/* Desktop Sidebar - Vertical Left */}
            <div className="hidden md:flex z-50 flex-col justify-between items-center fixed top-0 left-0 h-screen w-20 border-r border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-xl py-8 transition-all duration-150 shadow-premium">
                <div className="flex flex-col gap-6 items-center w-full">
                    <SidebarItem
                        to="/"
                        icon={Home}
                        isActive={isActive('/')}
                        keyHint="Home"
                    />
                    <SidebarItem
                        to="/timeline"
                        icon={List}
                        isActive={isActive('/timeline')}
                        keyHint="Timeline"
                    />
                    <SidebarItem
                        to="/history"
                        icon={Activity}
                        isActive={isActive('/history')}
                        keyHint="History"
                    />
                    <SidebarItem
                        to="/profile"
                        icon={User}
                        isActive={isActive('/profile')}
                        keyHint="Profile"
                    />
                </div>

                <div className="flex flex-col gap-6 items-center">
                    <SidebarSearch />
                    <SidebarSettings onClick={() => setSettingsOpen(true)} />
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </>
    );
}