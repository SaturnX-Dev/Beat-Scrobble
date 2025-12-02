import React from "react";
import Popup from "../Popup";
import { Link } from "react-router";
import { type LucideIcon } from "lucide-react";

interface Props {
    to: string;
    icon: LucideIcon;
    isActive: boolean;
    keyHint: string;
    onClick?: () => void;
}

export default function SidebarItem({ to, icon: Icon, isActive, keyHint, onClick }: Props) {
    const iconSize = 24;

    const content = (
        <div
            className={`p-3 rounded-xl transition-all duration-150 group relative ${isActive ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
        >
            <Icon size={iconSize} className="transition-transform duration-150 group-hover:scale-110" />
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
        </div>
    );

    const popupInner = (
        <div className="flex items-center gap-2">
            <span>{keyHint}</span>
        </div>
    );

    return (
        <Popup position="right" space={10} inner={popupInner}>
            {onClick ? (
                <button onClick={onClick} className="block w-full text-left">
                    {content}
                </button>
            ) : (
                <Link to={to} className="block">
                    {content}
                </Link>
            )}
        </Popup>
    );
}