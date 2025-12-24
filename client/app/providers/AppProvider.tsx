import { getCfg, type User } from "api/api";
import { useEffect, useState, type ReactNode } from "react";
import NotificationModal from "app/components/modals/NotificationModal";
import { AppContext, type AppContextType } from "./AppContext";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [defaultTheme, setDefaultTheme] = useState<string | undefined>(
    undefined
  );
  const [serverVersion, setServerVersion] = useState<string>("unknown");
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
          // Auth Guard: If not logged in, redirect to login (except public routes)
          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            // Public paths that don't require authentication
            const publicPaths = [
              "/login",
              "/u/",  // Public profiles
            ];

            const isPublicPath = publicPaths.some(p =>
              p.endsWith("/") ? path.startsWith(p) : path === p
            );

            if (!isPublicPath) {
              // Not on a public path and not logged in - redirect to login
              window.location.href = "/login?redirectTo=" + encodeURIComponent(path);
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
      if (cfg) {
        if (cfg.default_theme && cfg.default_theme !== "") {
          setDefaultTheme(cfg.default_theme);
        } else {
          // Auto-detect based on system preference
          const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDefaultTheme(isDarkMode ? "slate" : "snow");
        }
        if (cfg.version) {
          setServerVersion(cfg.version);
        }
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
    serverVersion,
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
