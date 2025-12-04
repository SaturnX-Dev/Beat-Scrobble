import { useAuraStyle } from "~/hooks/useAuraStyle";
import { useEffect, useState } from "react";
import { usePreferences } from "~/hooks/usePreferences";

interface CardAuraProps {
    size?: 'small' | 'large';
    id?: string; // ID to identify the component (e.g., 'now-playing', 'recent-activity')
    className?: string; // Additional classes
}

export default function CardAura({ size = 'small', id, className = '' }: CardAuraProps) {
    const auraClass = useAuraStyle(size, id);
    const [isEnabled, setIsEnabled] = useState(true);
    const [isTargetEnabled, setIsTargetEnabled] = useState(true);
    const { getPreference, preferences } = usePreferences();

    useEffect(() => {
        const checkEnabled = () => {
            // Check global enable from server preferences
            const globalEnabled = getPreference('card-aura-enabled', true);
            setIsEnabled(globalEnabled);

            // Check specific target enable if ID is provided
            if (id) {
                const targets = getPreference('card-aura-targets', ['dashboard']);
                setIsTargetEnabled(targets.includes(id));
            } else {
                // If no ID provided, assume it's always enabled if global is enabled
                setIsTargetEnabled(true);
            }
        };

        checkEnabled();

        // Listen for changes to update reactively
        const handleSettingsChange = () => {
            checkEnabled();
        };

        window.addEventListener('aura-settings-changed', handleSettingsChange);

        return () => {
            window.removeEventListener('aura-settings-changed', handleSettingsChange);
        };
    }, [id, getPreference, preferences]);

    if (!isEnabled || !isTargetEnabled) return null;

    return (
        <div
            className={`${auraClass} ${className}`}
            style={{ top: '50%', left: '50%' }}
        />
    );
}
