'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('fresco-theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
      // Also set/remove dark class for Tailwind dark: variant
      if (stored === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('fresco-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // Also set/remove dark class for Tailwind dark: variant
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Return a default during SSR or before mounting
  if (!context) {
    return {
      theme: 'light' as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
