import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Hook para restaurar scroll - alternativa a ScrollRestoration
 * que funciona con React Router v7 en modo SPA (ssr: false)
 * 
 * Comportamiento:
 * - Guarda posición de scroll por pathname
 * - Restaura al volver atrás
 * - Scroll to top en navegación nueva
 */

const scrollPositions = new Map<string, number>();

export function useScrollRestoration() {
    const location = useLocation();
    const key = location.pathname;

    useEffect(() => {
        // Guardar posición actual antes de salir
        const handleBeforeUnload = () => {
            scrollPositions.set(key, window.scrollY);
        };

        // Guardar al hacer scroll
        const handleScroll = () => {
            scrollPositions.set(key, window.scrollY);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Restaurar posición al entrar a la página
        const savedPosition = scrollPositions.get(key);
        if (savedPosition !== undefined) {
            // Pequeño delay para que el contenido se renderice primero
            requestAnimationFrame(() => {
                window.scrollTo(0, savedPosition);
            });
        } else {
            // Nueva página - ir al top
            window.scrollTo(0, 0);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [key]);
}

/**
 * Hook simple que solo hace scroll to top al cambiar de ruta
 */
export function useScrollToTop() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);
}
