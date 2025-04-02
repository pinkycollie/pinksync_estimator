import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useSidebarState } from '@/hooks/useSidebarState';

type AppContextType = {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { isOpen, toggleSidebar } = useSidebarState();

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        sidebarOpen: isOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
