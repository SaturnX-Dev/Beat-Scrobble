// NOTE: React 17+ no requiere `import React from 'react'` para JSX.
import { useState, useRef, type ReactNode, type TouchEvent, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableListItemProps {
    children: ReactNode;
    onDelete: () => void;
    disabled?: boolean;
}

export default function SwipeableListItem({ children, onDelete, disabled = false }: SwipeableListItemProps) {
    const [translateX, setTranslateX] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const startX = useRef(0);
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const SWIPE_THRESHOLD = 80;

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (disabled) return;
        startX.current = e.touches[0].clientX;
        isDragging.current = true;
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        startX.current = e.clientX;
        isDragging.current = true;
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!isDragging.current || disabled) return;
        const currentX = e.touches[0].clientX;
        const diff = startX.current - currentX;
        if (diff > 0) {
            setTranslateX(Math.min(diff, 120));
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current || disabled) return;
        const diff = startX.current - e.clientX;
        if (diff > 0) {
            setTranslateX(Math.min(diff, 120));
        }
    };

    const handleEnd = () => {
        isDragging.current = false;
        if (translateX > SWIPE_THRESHOLD) {
            setShowConfirm(true);
        }
        setTranslateX(0);
    };

    const handleConfirmDelete = () => {
        setShowConfirm(false);
        onDelete();
    };

    const handleCancelDelete = () => {
        setShowConfirm(false);
    };

    return (
        <>
            <div
                ref={containerRef}
                className="relative overflow-hidden rounded-xl"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
            >
                {/* Delete background */}
                <div
                    className="absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l from-red-600 to-red-500 px-6 transition-opacity"
                    style={{ opacity: translateX > 20 ? 1 : 0 }}
                >
                    <Trash2 size={24} className="text-white" />
                </div>

                {/* Main content */}
                <div
                    className="relative bg-[var(--color-bg)] transition-transform duration-150"
                    style={{
                        transform: `translateX(-${translateX}px)`,
                        transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
                    }}
                >
                    {children}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[var(--color-bg-tertiary)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-fg)]">Delete Scrobble?</h3>
                                <p className="text-sm text-[var(--color-fg-secondary)]">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancelDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-fg)] font-medium hover:bg-[var(--color-bg)] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
