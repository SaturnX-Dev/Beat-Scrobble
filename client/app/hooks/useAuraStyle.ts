import { useState, useEffect } from 'react';

export function useAuraStyle(size: 'small' | 'large' = 'small') {
    const [auraClass, setAuraClass] = useState(() => {
        if (typeof window === 'undefined') return 'card-aura-small';

        const stored = localStorage.getItem('card-aura-style');
        const style = stored || 'circle';
        const suffix = size === 'small' ? '-small' : '';

        return style === 'circle'
            ? `card-aura${suffix}`
            : `card-aura-${style}${suffix}`;
    });

    useEffect(() => {
        const updateAuraClass = () => {
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

        return () => observer.disconnect();
    }, [size]);

    return auraClass;
}
