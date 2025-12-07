
import { NavLink } from "react-router";
import { Home, User, Search, Library, Settings } from "lucide-react";

export default function MobileNavBar() {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe-area-inset-bottom bg-[var(--color-bg)]/80 backdrop-blur-md border-t border-[var(--color-bg-tertiary)] shadow-lg-up">
            <div className="flex justify-around items-center h-16 px-2">
                <MobileNavItem to="/" icon={Home} label="Home" />
                <MobileNavItem to="/listens" icon={Search} label="Activity" />
                <MobileNavItem to="/playlists" icon={Library} label="Library" />
                <MobileNavItem to="/profile" icon={User} label="Profile" />
                <MobileNavItem to="/theme-helper" icon={Settings} label="Config" />
            </div>
        </div>
    );
}

function MobileNavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${isActive ? "text-[var(--color-primary)]" : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <Icon
                        size={24}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`transition-transform duration-300 ${isActive ? "scale-110" : "scale-100"}`}
                        fill={isActive ? "currentColor" : "none"}
                        fillOpacity={isActive ? 0.2 : 0}
                    />
                    <span className="text-[10px] font-medium tracking-wide">{label}</span>
                </>
            )}
        </NavLink>
    );
}
