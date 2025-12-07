import { useState, useEffect } from "react";
import { imageUrl } from "api/api";
import { Image as ImageIcon } from "lucide-react";

interface OptimizedImageProps {
    id: string; // Image ID (UUID or 'default')
    size: "small" | "medium" | "large" | "full";
    alt: string;
    className?: string; // Additional classes
    fill?: boolean; // If true, absolute fill parent
}

export default function OptimizedImage({
    id,
    size,
    alt,
    className = "",
    fill = false
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset state when ID changes
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [id]);

    const src = imageUrl(id, size);

    return (
        <div
            className={`
                relative overflow-hidden bg-[var(--color-bg-tertiary)]
                ${fill ? "absolute inset-0 w-full h-full" : ""}
                ${className}
            `}
        >
            {/* Skeleton / Placeholder */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-[var(--color-bg-tertiary)] z-10">
                    <ImageIcon className="w-1/3 h-1/3 text-[var(--color-fg-tertiary)] opacity-20" />
                </div>
            )}

            {/* Actual Image */}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`
                    transition-opacity duration-300 ease-in-out
                    ${fill ? "w-full h-full object-cover" : ""}
                    ${isLoaded ? "opacity-100" : "opacity-0"}
                `}
            />

            {/* Error Fallback */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-tertiary)] z-20">
                    <ImageIcon className="w-1/3 h-1/3 text-[var(--color-fg-tertiary)] opacity-50" />
                </div>
            )}
        </div>
    );
}
