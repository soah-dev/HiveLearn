'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const STORAGE_KEY = 'homework-hub-dark-mode';

const ThemeContext = createContext<ThemeContextType>({ darkMode: false, toggleDarkMode: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in app/layout.tsx applies the saved theme to <html>
  // before first paint, so on the client the DOM class is the source of truth.
  // Nothing theme-dependent renders during SSR (Navbar renders null while auth
  // loads), so initializing from the DOM here causes no hydration mismatch.
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Keep the DOM class and localStorage in sync with React state
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_KEY, String(darkMode));
    } catch {
      // storage unavailable (private mode) — theme still applies for this page
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
