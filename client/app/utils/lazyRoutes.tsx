// NOTE: React 17+ no requiere `import React from 'react'` para JSX.
import { lazy, Suspense, type LazyExoticComponent, type ComponentType, type ReactNode } from 'react';

// Lazy-loaded route components for code splitting
// These routes are heavier and don't need to be in the initial bundle

export const LazyTimeline = lazy(() => import('../routes/Timeline'));
export const LazyPlaylists = lazy(() => import('../routes/Playlists'));
export const LazyProfile = lazy(() => import('../routes/Profile'));
export const LazyThemeHelper = lazy(() => import('../routes/ThemeHelper'));
export const LazyPublicProfile = lazy(() => import('../routes/PublicProfile'));

// Chart pages (data-heavy)
export const LazyAlbumChart = lazy(() => import('../routes/Charts/AlbumChart'));
export const LazyArtistChart = lazy(() => import('../routes/Charts/ArtistChart'));
export const LazyTrackChart = lazy(() => import('../routes/Charts/TrackChart'));
export const LazyListens = lazy(() => import('../routes/Charts/Listens'));

// Media item detail pages
export const LazyArtist = lazy(() => import('../routes/MediaItems/Artist'));
export const LazyAlbum = lazy(() => import('../routes/MediaItems/Album'));
export const LazyTrack = lazy(() => import('../routes/MediaItems/Track'));

// Loading fallback component
export function RouteLoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted">Loading...</span>
            </div>
        </div>
    );
}

// Wrapper for lazy routes with Suspense
export function withSuspense<P extends object>(
    LazyComponent: LazyExoticComponent<ComponentType<P>>,
    fallback: ReactNode = <RouteLoadingFallback />
) {
    return function SuspenseWrapper(props: P) {
        return (
            <Suspense fallback={fallback}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

// Pre-wrapped components ready to use
export const SuspendedTimeline = withSuspense(LazyTimeline);
export const SuspendedPlaylists = withSuspense(LazyPlaylists);
export const SuspendedProfile = withSuspense(LazyProfile);
export const SuspendedThemeHelper = withSuspense(LazyThemeHelper);
export const SuspendedPublicProfile = withSuspense(LazyPublicProfile);
export const SuspendedAlbumChart = withSuspense(LazyAlbumChart);
export const SuspendedArtistChart = withSuspense(LazyArtistChart);
export const SuspendedTrackChart = withSuspense(LazyTrackChart);
export const SuspendedListens = withSuspense(LazyListens);
export const SuspendedArtist = withSuspense(LazyArtist);
export const SuspendedAlbum = withSuspense(LazyAlbum);
export const SuspendedTrack = withSuspense(LazyTrack);
