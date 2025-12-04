import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type Theme, themes } from "~/styles/themes.css";
import { themeVars } from "~/styles/vars.css";
import { useAppContext } from "./AppProvider";

interface ThemeContextValue {
  themeName: string;
  theme: Theme;
  setTheme: (theme: string) => void;
  resetTheme: () => void;
  setCustomTheme: (theme: Theme) => void;
  getCustomTheme: () => Theme | undefined;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function toKebabCase(str: string) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function applyCustomThemeVars(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    if (key === "name") continue;
    root.style.setProperty(`--color-${toKebabCase(key)}`, value);
  }
}

function clearCustomThemeVars() {
  for (const cssVar of Object.values(themeVars)) {
    document.documentElement.style.removeProperty(cssVar);
  }
}

// Cache for custom theme (in-memory only, server is source of truth)
let cachedCustomTheme: Theme | undefined;

export function ThemeProvider({ children }: { children: ReactNode }) {
  let defaultTheme = useAppContext().defaultTheme;
  const [themeName, setThemeName] = useState(defaultTheme);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => themes[defaultTheme]);

  const saveThemeToServer = async (theme: Theme, name: string = "custom") => {
    try {
      await fetch("/apis/web/v1/user/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...theme, name }),
      });
    } catch (err) {
      console.error("Failed to save theme to server:", err);
    }
  };

  const setTheme = (newThemeName: string) => {
    setThemeName(newThemeName);
    if (newThemeName === "custom") {
      if (cachedCustomTheme) {
        setCurrentTheme(cachedCustomTheme);
        saveThemeToServer(cachedCustomTheme, "custom");
      } else {
        setThemeName(defaultTheme);
        setCurrentTheme(themes[defaultTheme]);
        saveThemeToServer(themes[defaultTheme], defaultTheme);
      }
    } else {
      const foundTheme = themes[newThemeName];
      if (foundTheme) {
        setCurrentTheme(foundTheme);
        saveThemeToServer(foundTheme, newThemeName);
      } else {
        setTheme(defaultTheme);
      }
    }
  };

  const resetTheme = () => {
    setThemeName(defaultTheme);
    setCurrentTheme(themes[defaultTheme]);
    cachedCustomTheme = undefined;
    saveThemeToServer(themes[defaultTheme], defaultTheme);
  };

  const setCustomTheme = useCallback((customTheme: Theme) => {
    cachedCustomTheme = customTheme;
    applyCustomThemeVars(customTheme);
    setThemeName("custom");
    setCurrentTheme(customTheme);
    saveThemeToServer(customTheme, "custom");
  }, []);

  const getCustomTheme = (): Theme | undefined => {
    return cachedCustomTheme;
  };

  useEffect(() => {
    // Fetch theme from server on mount
    const fetchServerTheme = async () => {
      try {
        const res = await fetch("/apis/web/v1/user/theme");
        if (res.ok && res.status !== 204) {
          const serverTheme: Theme & { name?: string } = await res.json();
          if (serverTheme && serverTheme.bg) {
            cachedCustomTheme = serverTheme;
            setCurrentTheme(serverTheme);
            setThemeName("custom");
            applyCustomThemeVars(serverTheme);
          }
        }
      } catch (err) {
        console.error("Failed to fetch theme from server:", err);
      }
    };

    fetchServerTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-theme", themeName);

    if (themeName === "custom") {
      applyCustomThemeVars(currentTheme);
    } else {
      clearCustomThemeVars();
    }
  }, [themeName, currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeName,
        theme: currentTheme,
        setTheme,
        resetTheme,
        setCustomTheme,
        getCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext };
