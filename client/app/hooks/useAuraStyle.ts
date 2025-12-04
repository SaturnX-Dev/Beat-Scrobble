import { useState, useEffect } from 'react';
import { usePreferences } from './usePreferences';

export function useAuraStyle(size: 'small' | 'large' = 'small', cardId?: string) {
    const { getPreference } = usePreferences();

    const [auraClass, setAuraClass] = useState(() => {
        if (typeof window === 'undefined') return 'card-aura-small';
        return size === 'small' ? 'card-aura-small' : 'card-aura';
    });

    useEffect(() => {
        const updateAuraClass = () => {
            // Check for per-card style first
            const perCardStyles = getPreference('card-aura-per-card-styles', {});
            if (cardId && perCardStyles[cardId]) {
                const suffix = size === 'small' ? '-small' : '';
                setAuraClass(`card-aura-${perCardStyles[cardId]}${suffix}`);
                return;
            }

            // Fall back to global style from data attribute (set by ThemeProvider)
            const style = document.documentElement.getAttribute('data-aura-style') ||
                getPreference('card-aura-style', 'circle');
            const suffix = size === 'small' ? '-small' : '';

            const newClass = style === 'circle'
                ? `card-aura${suffix}`
                : `card-aura-${style}${suffix}`;

            setAuraClass(newClass);
        };

        // Initial setup - apply stored style from preferences
        const storedStyle = getPreference('card-aura-style', 'circle');
        if (storedStyle && typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-aura-style', storedStyle);
        }
        updateAuraClass();

        // Listen for changes via data attribute
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
        const handleSettingsChange = () => {
            updateAuraClass();
        };
        window.addEventListener('aura-settings-changed', handleSettingsChange);

        return () => {
            observer.disconnect();
            window.removeEventListener('aura-settings-changed', handleSettingsChange);
        };
    }, [size, cardId, getPreference]);

    return auraClass;
}
