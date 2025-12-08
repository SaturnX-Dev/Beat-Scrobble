/**
 * ⚠️ ADVERTENCIA: NO MODIFICAR ESTE COMPONENTE SIN AUTORIZACIÓN DEL USUARIO ⚠️
 * 
 * Este componente de navegación móvil está finalizado y funcionando correctamente.
 * No realizar cambios a menos que el usuario lo indique explícitamente.
 */

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

    const resetToMain = () => setView('main');

    // Unified button/link styles - completely isolated from global CSS
    const itemStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        color: active ? 'var(--color-primary)' : 'rgba(180, 180, 180, 1)',
        textDecoration: 'none',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 12px',
        minWidth: '60px',
        flex: '1 1 0%',
        transition: 'transform 0.15s ease-out, color 0.15s ease-out',
    });

    const labelStyle: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.025em',
        whiteSpace: 'nowrap',
    };

    return (
        <>
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} />
            <SearchModal open={searchOpen} setOpen={setSearchOpen} />

            {/* Floating Pill Container - OUTSIDE the flex layout */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '16px',
                    right: '16px',
                    zIndex: 9999,
                }}
                className="md:hidden"
            >
                <nav
                    style={{
                        width: '100%',
                        height: '64px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid color-mix(in srgb, var(--color-bg-tertiary) 50%, transparent)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    {/* Slider Track */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '200%',
                            display: 'flex',
                            flexDirection: 'row',
                            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            transform: view === 'main' ? 'translateX(0%)' : 'translateX(-50%)',
                        }}
                    >
                        {/* MAIN VIEW */}
                        <div
                            style={{
                                width: '50%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-evenly',
                            }}
                        >
                            <Link to="/" style={itemStyle(isActive("/"))}>
                                <Home size={22} strokeWidth={isActive("/") ? 2.5 : 2} />
                                <span style={labelStyle}>Home</span>
                            </Link>
                            <Link to="/timeline" style={itemStyle(isActive("/timeline"))}>
                                <List size={22} strokeWidth={isActive("/timeline") ? 2.5 : 2} />
                                <span style={labelStyle}>Timeline</span>
                            </Link>
                            <button onClick={() => setSearchOpen(true)} style={itemStyle(false)}>
                                <Search size={22} />
                                <span style={labelStyle}>Search</span>
                            </button>
                            <button onClick={() => setView('more')} style={itemStyle(false)}>
                                <MoreHorizontal size={22} />
                                <span style={labelStyle}>More</span>
                            </button>
                        </div>

                        {/* MORE VIEW */}
                        <div
                            style={{
                                width: '50%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-evenly',
                            }}
                        >
                            <button onClick={resetToMain} style={itemStyle(false)}>
                                <ArrowLeft size={22} />
                                <span style={labelStyle}>Back</span>
                            </button>
                            <Link to="/playlists" onClick={resetToMain} style={itemStyle(isActive("/playlists"))}>
                                <Music size={22} strokeWidth={isActive("/playlists") ? 2.5 : 2} />
                                <span style={labelStyle}>Playlists</span>
                            </Link>
                            <Link to="/profile" onClick={resetToMain} style={itemStyle(isActive("/profile"))}>
                                <User size={22} strokeWidth={isActive("/profile") ? 2.5 : 2} />
                                <span style={labelStyle}>Profile</span>
                            </Link>
                            <button onClick={() => { setSettingsOpen(true); resetToMain(); }} style={itemStyle(false)}>
                                <Settings2 size={22} />
                                <span style={labelStyle}>Config</span>
                            </button>
                        </div>
                    </div>
                </nav>
            </div>
        </>
    );
}
