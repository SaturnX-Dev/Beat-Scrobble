import { usePreferences } from "~/hooks/usePreferences";
import { useEffect, useState } from "react";

export default function GlobalBackground() {
    const { preferences, getPreference } = usePreferences();
    const [backgroundType, setBackgroundType] = useState<'none' | 'image' | 'video'>('none');
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [opacity, setOpacity] = useState(50);

    // Update state when preferences change
    useEffect(() => {
        const type = getPreference('customBackgroundType', 'none') as 'none' | 'image' | 'video';
        const url = getPreference('customBackgroundUrl', '');
        const op = getPreference('background_opacity', 50);

        setBackgroundType(type);
        setBackgroundUrl(url);
        setOpacity(op);

        console.log('[GlobalBackground] Preferences updated:', { type, url: url ? 'SET' : 'EMPTY', opacity: op });
    }, [preferences, getPreference]);

    // Don't show if no background is set
    if (backgroundType === 'none' || !backgroundUrl) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
        >
            <div
                className="absolute inset-0 w-full h-full transition-opacity duration-500"
                style={{ opacity: opacity / 100 }}
            >
                {backgroundType === 'video' ? (
                    <video
                        src={backgroundUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <img
                        src={backgroundUrl}
                        alt="Background"
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-black/20" />
        </div>
    );
}
