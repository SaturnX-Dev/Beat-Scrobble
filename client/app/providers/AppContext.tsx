import { createContext, useContext } from "react";
import type { User } from "api/api";

export interface AppContextType {
    user: User | null | undefined;
    configurableHomeActivity: boolean;
    homeItems: number;
    defaultTheme: string;
    serverVersion: string;
    setConfigurableHomeActivity: (value: boolean) => void;
    setHomeItems: (value: number) => void;
    setUsername: (value: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};
