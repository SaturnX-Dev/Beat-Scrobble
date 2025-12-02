import React from "react";
import Popup from "../Popup";
import { Link } from "react-router";
import { type LucideIcon } from "lucide-react";

interface Props {
    to?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    keyHint?: string;
    onClick?: () => void;
    children?: React.ReactNode;
    name?: string;
    space?: number;
    modal?: React.ReactNode;
}

export default function SidebarItem({
    to,
    icon: Icon,
    isActive,
    keyHint,
    onClick,
    children,
    name,
    space = 10,
    modal
}: Props) {
    const iconSize = 24;

    const content = (
        <div
            className={`p-3 rounded-xl transition-all duration-150 group relative ${isActive ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-fg-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]'}`}
        >
            {Icon ? (
                <Icon size={iconSize} className="transition-transform duration-150 group-hover:scale-110" />
            ) : (
                <div className="transition-transform duration-150 group-hover:scale-110">
                    {children}
                </div>
            )}
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
        </div>
    );

    const popupInner = (
        <div className="flex items-center gap-2">
            {name && <span className="font-medium">{name}</span>}
            {keyHint && (
                <span className={`text-xs ${name ? 'opacity-70' : ''}`}>
                    {keyHint}
                </span>
            )}
        </div>
    );

    return (
        <>
            <Popup position="right" space={space} inner={popupInner}>
                {onClick ? (
                    <button onClick={onClick} className="block w-full text-left">
                        {content}
                    </button>
                ) : (
                    to ? (
                        <Link to={to} className="block">
                            {content}
                        </Link>
                    ) : (
                        <div className="block">
                            {content}
                        </div>
                    )
                )}
            </Popup>
            {modal}
        </>
    );
}