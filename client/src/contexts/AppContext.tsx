import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const defaultContext: AppContextType = {
  theme: 'system',
  setTheme: () => {},
};

const AppContext = createContext<AppContextType>(defaultContext);

export const useAppContext = () => useContext(AppContext);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    // Initialize theme from localStorage if available
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Update localStorage and apply theme changes
    if (theme) {
      localStorage.setItem('theme', theme);
      
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};