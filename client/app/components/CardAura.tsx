import { useAuraStyle } from "~/hooks/useAuraStyle";
import { useEffect, useState } from "react";

interface CardAuraProps {
    size?: 'small' | 'large';
    id?: string; // ID to identify the component (e.g., 'now-playing', 'recent-activity')
    className?: string; // Additional classes
}

export default function CardAura({ size = 'small', id, className = '' }: CardAuraProps) {
    const auraClass = useAuraStyle(size);
    const [isEnabled, setIsEnabled] = useState(true);
    const [isTargetEnabled, setIsTargetEnabled] = useState(true);

    useEffect(() => {
        const checkEnabled = () => {
            // Check global enable
            const globalEnabled = localStorage.getItem('card-aura-enabled') !== 'false';
            setIsEnabled(globalEnabled);

            // Check specific target enable if ID is provided
            if (id) {
                const targets = JSON.parse(localStorage.getItem('card-aura-targets') || '[]');
                // If targets list is empty, default to enabled for backward compatibility or user preference?
                // Let's say if list exists, we check. If not, maybe default to false for new items?
                // Actually, let's default to true if not in list but list is empty? No, explicit selection is better.
                // But for 'dashboard-cards' (which are the original ones), they should probably be enabled by default or separate.
                // Let's treat 'dashboard-cards' as a special case or just another ID.

                // If targets array includes the ID, it's enabled.
                setIsTargetEnabled(targets.includes(id));
            } else {
                // If no ID provided (e.g. legacy usage in DashboardMetrics), assume it's always enabled if global is enabled
                // OR we can assign IDs to DashboardMetrics cards too.
                setIsTargetEnabled(true);
            }
        };

        checkEnabled();

        // Listen for storage changes to update reactively
        const handleStorageChange = () => {
            checkEnabled();
        };

        window.addEventListener('storage', handleStorageChange);
        // Custom event for same-window updates
        window.addEventListener('aura-settings-changed', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('aura-settings-changed', handleStorageChange);
        };
    }, [id]);

    if (!isEnabled || !isTargetEnabled) return null;

    return (
        <div
            className={`${auraClass} ${className}`}
            style={{ top: '50%', left: '50%' }}
        />
    );
}
