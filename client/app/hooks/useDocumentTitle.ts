import { useEffect } from 'react';

/**
 * Hook profesional para manejar títulos de documento dinámicos
 * Compatible con React Router v7 en modo SPA (ssr: false)
 * 
 * @param title - El título de la página (sin el sufijo de app)
 * @param suffix - Sufijo opcional, default: "Beat Scrobble"
 */
export function useDocumentTitle(title?: string, suffix: string = 'Beat Scrobble') {
    useEffect(() => {
        const previousTitle = document.title;

        if (title) {
            document.title = `${title} - ${suffix}`;
        } else {
            document.title = suffix;
        }

        // Cleanup: restaurar título anterior al desmontar
        return () => {
            document.title = previousTitle;
        };
    }, [title, suffix]);
}

/**
 * Hook para establecer meta description dinámicamente
 */
export function useMetaDescription(description: string) {
    useEffect(() => {
        let metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement;
        const previousDescription = metaTag?.content;

        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'description';
            document.head.appendChild(metaTag);
        }

        metaTag.content = description;

        return () => {
            if (previousDescription !== undefined) {
                metaTag.content = previousDescription;
            }
        };
    }, [description]);
}

/**
 * Hook combinado para título y descripción
 */
export function useDocumentHead(title?: string, description?: string) {
    useDocumentTitle(title);
    if (description) {
        useMetaDescription(description);
    }
}
