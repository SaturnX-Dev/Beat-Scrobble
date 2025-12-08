import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import { type ReactNode } from "react";

import type { Route } from "./+types/root";
import './themes.css'
import "~/styles/themes.css.ts";
import "./app.css";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ThemeProvider } from './providers/ThemeProvider';
import Sidebar from "./components/sidebar/Sidebar";
import MobileNavBar from "./components/MobileNavBar";
import { AppProvider } from "./providers/AppProvider";
import GlobalBackground from "./components/GlobalBackground";
import { SpotifyProvider } from "./providers/SpotifyProvider";
import { usePresenceHeartbeat } from "./hooks/usePresenceHeartbeat";

// Create a client with GC time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (garbage collection)
      staleTime: 1000 * 60 * 5, // 5 minutes (data remains fresh)
    },
  },
});

// Create localStorage persister
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

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
        <Meta />
        <Links />
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

  // Register service worker for PWA
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }

  return (
    <>
      <AppProvider>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
          >
            <SpotifyProvider>
              <GlobalBackground />
              <MobileNavBar />
              <div className="flex-col flex sm:flex-row min-h-screen relative z-10">
                <Sidebar />
                <div className="flex flex-col items-center mx-auto w-full ml-0 pb-20 sm:pb-0 sm:ml-20 transition-all duration-300">
                  <Outlet />
                </div>
              </div>
            </SpotifyProvider>
          </PersistQueryClientProvider>
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
