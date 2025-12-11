// NOTE: React 17+ no requiere `import React from 'react'` para JSX.
import { getCfg, type User } from "api/api";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import NotificationModal from "app/components/modals/NotificationModal";

interface AppContextType {
  user: User | null | undefined;
  configurableHomeActivity: boolean;
  homeItems: number;
  defaultTheme: string;
  setConfigurableHomeActivity: (value: boolean) => void;
  setHomeItems: (value: number) => void;
  setUsername: (value: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [defaultTheme, setDefaultTheme] = useState<string | undefined>(
    undefined
  );
  const [configurableHomeActivity, setConfigurableHomeActivity] =
    useState<boolean>(false);
  const [homeItems, setHomeItems] = useState<number>(0);

  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  const setUsername = (value: string) => {
    if (!user) {
      return;
    }
    setUser({ ...user, username: value });
  };

  useEffect(() => {
    fetch("/apis/web/v1/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setUser(null);
          // Auth Guard: If not logged in and not on public pages, redirect to login
          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            // Public paths: /login, maybe /u/ (public profiles) if we allow them
            // The user requirement says "cuando se abre la app por pimera ves oh se ve el dominio no carga nada ... pagina de login obligatoria"
            // So we enforce login everywhere except /login and public profiles /u/*
            if (
              path !== "/login" &&
              !path.startsWith("/u/") &&
              !path.startsWith("/register") // in case we add register route separate
            ) {
              window.location.href = "/login?redirectTo=" + path;
            }
          }
        } else {
          setUser(data);

          // Fetch preferences to check setup status
          fetch("/apis/web/v1/user/preferences")
            .then(res => res.json())
            .then(prefs => {
              if (typeof window !== "undefined") {
                const path = window.location.pathname;
                // If not setup and not on onboarding page, redirect
                if (!prefs.setup_completed && path !== "/onboarding" && path !== "/login") {
                  window.location.href = "/onboarding";
                }
                // If setup IS completed and we are on onboarding, redirect home? 
                // Maybe not, user might want to revisit onboarding (though usually it's a separate settings page)
                // But for "Primer uso", yes.
              }
            })
            .catch(err => console.error("Failed to check setup status", err));

          // If logged in and on login page, redirect to home
          if (typeof window !== "undefined" && window.location.pathname === "/login") {
            window.location.href = "/";
          }
        }
      })
      .catch(() => {
        setUser(null);
        // Same auth guard on error
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path !== "/login" && !path.startsWith("/u/")) {
            window.location.href = "/login";
          }
        }
      });

    setConfigurableHomeActivity(true);
    setHomeItems(12);

    getCfg().then((cfg) => {
      // console.log(cfg);
      if (cfg && cfg.default_theme && cfg.default_theme !== "") {
        setDefaultTheme(cfg.default_theme);
      } else {
        setDefaultTheme("yuu");
      }
    });

    // Heartbeat Polling for Notifications
    const interval = setInterval(() => {
      fetch("/apis/web/v1/presence/ping", { method: "POST" })
        .then(r => r.json())
        .then(data => {
          if (data.notifications && data.notifications.length > 0) {
            const notif = data.notifications[0]; // Handle first one for now
            setNotification({
              type: notif.type === "success" ? "success" : "error",
              title: "System Notification", // Customize based on ID ideally
              message: notif.message
            });
          }
        })
        .catch(() => { });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Block rendering the app until config is loaded
  if (user === undefined || defaultTheme === undefined) {
    return null;
  }

  const contextValue: AppContextType = {
    user,
    configurableHomeActivity,
    homeItems,
    defaultTheme,
    setConfigurableHomeActivity,
    setHomeItems,
    setUsername,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {notification && (
        <NotificationModal
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </AppContext.Provider>
  );
};
