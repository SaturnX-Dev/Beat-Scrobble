import { useState, useEffect } from 'react';

export function useAuraStyle(size: 'small' | 'large' = 'small', cardId?: string) {
    const [auraClass, setAuraClass] = useState(() => {
        if (typeof window === 'undefined') return 'card-aura-small';

        // Check for per-card style first
        if (cardId) {
            const perCardStyles = JSON.parse(localStorage.getItem('card-aura-per-card-styles') || '{}');
            if (perCardStyles[cardId]) {
                const suffix = size === 'small' ? '-small' : '';
                return `card-aura-${perCardStyles[cardId]}${suffix}`;
            }
        }

        // Fall back to global style
        const stored = localStorage.getItem('card-aura-style');
        const style = stored || 'circle';
        const suffix = size === 'small' ? '-small' : '';

        return style === 'circle'
            ? `card-aura${suffix}`
            : `card-aura-${style}${suffix}`;
    });

    useEffect(() => {
        const updateAuraClass = () => {
            // Check for per-card style first
            if (cardId) {
                const perCardStyles = JSON.parse(localStorage.getItem('card-aura-per-card-styles') || '{}');
                if (perCardStyles[cardId]) {
                    const suffix = size === 'small' ? '-small' : '';
                    setAuraClass(`card-aura-${perCardStyles[cardId]}${suffix}`);
                    return;
                }
            }

            // Fall back to global style
            const style = document.documentElement.getAttribute('data-aura-style') || 'circle';
            const suffix = size === 'small' ? '-small' : '';

            const newClass = style === 'circle'
                ? `card-aura${suffix}`
                : `card-aura-${style}${suffix}`;

            setAuraClass(newClass);
        };

        // Initial setup
        const stored = localStorage.getItem('card-aura-style');
        if (stored) {
            document.documentElement.setAttribute('data-aura-style', stored);
        }
        updateAuraClass();

        // Listen for changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-aura-style') {
                    updateAuraClass();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-aura-style'],
        });

        // Listen for per-card style changes
        const handleStorageChange = () => {
            updateAuraClass();
        };
        window.addEventListener('aura-settings-changed', handleStorageChange);

        return () => {
            observer.disconnect();
            window.removeEventListener('aura-settings-changed', handleStorageChange);
        };
    }, [size, cardId]);

    return auraClass;
}
