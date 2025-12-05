import { usePreferences } from "~/hooks/usePreferences";
import { useLocation } from "react-router";

export default function GlobalBackground() {
    const { getPreference } = usePreferences();
    // const location = useLocation();

    // Get background image and opacity from preferences
    const backgroundImage = getPreference('background_image', null);
    const opacity = getPreference('background_opacity', 50); // Default 50%

    // Don't show if no image is set
    if (!backgroundImage) return null;

    // Check if we are on a public profile page (which might have its own background)
    // The user said "el background no se ve... se supone que el back ground se ve al fondo de todo"
    // If we are on a public profile, we might want to suppress this global background 
    // if the public profile has its own. But for now, let's assume global overrides 
    // or sits behind. 
    // Actually, if I'm viewing a public profile, I should probably see *their* background if implemented.
    // But the user's request was about *their* background not being visible.
    // Let's implement it globally for now.

    return (
        <div
            className="fixed inset-0 w-full h-full z-[-1] pointer-events-none overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg)' }} // Fallback
        >
            <div
                className="absolute inset-0 w-full h-full transition-opacity duration-500"
                style={{ opacity: opacity / 100 }}
            >
                <img
                    src={backgroundImage}
                    alt="Background"
                    className="w-full h-full object-cover blur-[2px] scale-105"
                />
            </div>
            {/* Overlay to ensure text readability if needed, though opacity handles most of it */}
            <div className="absolute inset-0 bg-black/40" />
        </div>
    );
}
