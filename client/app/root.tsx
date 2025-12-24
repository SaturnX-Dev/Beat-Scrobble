import {
  isRouteErrorResponse,
  Outlet,
  useRouteError,
  useLocation,
  Scripts,
  Links,
  Meta,
  ScrollRestoration,
} from "react-router";
import { type ReactNode, useMemo, useState, useEffect } from "react";


import type { Route } from "./+types/root";
import './themes.css'
import "~/styles/themes.css.ts";
import "./app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { ThemeProvider } from './providers/ThemeProvider';
import Sidebar from "./components/sidebar/Sidebar";
import MobileNavBar from "./components/MobileNavBar";
import { AppProvider } from "./providers/AppProvider";
import GlobalBackground from "./components/GlobalBackground";
import { SpotifyProvider } from "./providers/SpotifyProvider";
import { usePresenceHeartbeat } from "./hooks/usePresenceHeartbeat";
import { useScrollRestoration } from "./hooks/useScrollRestoration";

// Create stable QueryClient instance outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (garbage collection)
      staleTime: 1000 * 60 * 5, // 5 minutes (data remains fresh)
    },
  },
});

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// Layout sin componentes de React Router que requieren contexto
// (Links, Scripts, ScrollRestoration, Meta no funcionan con ssr: false)
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#1e1816" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Favicons */}
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Beat Scrobble" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* SEO */}
        <title>Beat Scrobble</title>
        <meta name="description" content="Self-Hosted Music Scrobbling" />

        {/* Google Fonts - Inline since Links component doesn't work with ssr:false */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" />
      </head>
      <body className="min-h-screen">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}



export default function App() {
  // Presence heartbeat for AI Now Playing optimization
  usePresenceHeartbeat();
  // Scroll restoration (reemplazo de ScrollRestoration de react-router)
  useScrollRestoration();
  const location = useLocation();

  // Hide sidebar on auth pages and public profiles
  const isAuthPage = location.pathname === '/login' || location.pathname === '/onboarding' || location.pathname.startsWith('/u/');

  // Persister using IndexedDB (async)
  const [persister, setPersister] = useState<any>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPersister(
        createAsyncStoragePersister({
          storage: {
            getItem: get,
            setItem: set,
            removeItem: del,
          },
        })
      );
    }
  }, []);

  // Track if persister is ready (avoid hydration mismatch)
  // With async persister, we don't strictly need to wait for IS_READY in the same way,
  // but it's good practice to render PersistQueryClientProvider only when persister is available.
  const isReady = !!persister;

  // Register service worker for PWA
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Content to render inside providers
  const content = (
    <SpotifyProvider>
      <GlobalBackground />
      {!isAuthPage && <MobileNavBar />}
      <div className="flex-col flex sm:flex-row min-h-screen relative z-10">
        {!isAuthPage && <Sidebar />}
        <div className={`flex flex-col items-center mx-auto w-full transition-all duration-300 ${isAuthPage ? 'ml-0 pb-0' : 'ml-0 pb-20 sm:pb-0 sm:ml-20'}`}>
          <Outlet />
        </div>
      </div>
    </SpotifyProvider>
  );

  return (
    <>
      <AppProvider>
        <ThemeProvider>
          {isReady && persister ? (
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister }}
            >
              {content}
            </PersistQueryClientProvider>
          ) : (
            /* Use regular QueryClientProvider during initial hydration to avoid #310 error */
            <QueryClientProvider client={queryClient}>
              {content}
            </QueryClientProvider>
          )}
        </ThemeProvider>
      </AppProvider>
    </>
  );
}

export function HydrateFallback() {
  return null
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404
      ? "The requested page could not be found."
      : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }


  const title = `${message} - Beat Scrobble`

  return (
    <AppProvider>
      <ThemeProvider>
        <title>{title}</title>
        <div className="flex">
          <Sidebar />
          <div className="w-full flex flex-col">
            <main className="pt-16 p-4 container mx-auto flex-grow">
              <div className="flex gap-4 items-end">
                <img className="w-[200px] rounded" src="../yuu.jpg" />
                <div>
                  <h1>{message}</h1>
                  <p>{details}</p>
                </div>
              </div>
              {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                  <code>{stack}</code>
                </pre>
              )}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </AppProvider>
  );
}
