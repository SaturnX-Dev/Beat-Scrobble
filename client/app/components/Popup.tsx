import React, { type PropsWithChildren, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    inner: React.ReactNode
    position: string
    space: number
    extraClasses?: string
    hint?: string
    className?: string
}

export default function Popup({ inner, position, space, extraClasses, className, children }: PropsWithChildren<Props>) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;

            if (position === 'top') {
                top = rect.top - space;
                left = rect.left + rect.width / 2;
            } else if (position === 'right') {
                top = rect.top + rect.height / 2;
                left = rect.right + space;
            } else if (position === 'bottom') {
                top = rect.bottom + space;
                left = rect.left + rect.width / 2;
            } else if (position === 'left') {
                top = rect.top + rect.height / 2;
                left = rect.left - space;
            }

            setCoords({ top, left });
        }
    }, [isVisible, position, space]);

    const tooltip = isVisible ? (
        <div
            className={`
                fixed
                ${extraClasses ?? ''}
                bg-[var(--color-bg)] text-[var(--color-fg)] border border-[var(--color-bg-tertiary)]
                px-3 py-2 rounded-lg
                transition-opacity duration-100
                opacity-100
                z-[9999] text-center
                flex
                whitespace-nowrap
                max-w-xs
                shadow-lg
                pointer-events-none
            `}
            style={{
                top: coords.top,
                left: coords.left,
                transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
            }}
        >
            {inner}
        </div>
    ) : null;

    return (
        <div
            ref={triggerRef}
            className={`relative inline-block ${className || ''}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {typeof document !== 'undefined' && createPortal(tooltip, document.body)}
        </div>
    );
}
