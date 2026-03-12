import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ThemePreferences,
  ThemeContextValue,
  ThemeMode,
  ThemeDensity,
  BackgroundPattern,
  LayoutMode,
  DEFAULT_THEME,
  ACCENT_COLORS,
} from '../types/theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Safe hook that returns defaults when outside provider
export function useThemeSafe(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: DEFAULT_THEME,
      resolvedMode: 'light',
      setMode: () => {},
      setAccentColor: () => {},
      setDensity: () => {},
      setFontFamily: () => {},
      setBackgroundPattern: () => {},
      setReducedMotion: () => {},
      setLayout: () => {},
      resetToDefaults: () => {},
    };
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Load from localStorage first for instant hydration
  const [theme, setTheme] = useState<ThemePreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    try {
      const saved = localStorage.getItem('nodebench-theme');
      if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };

      // NOTE(coworker): Legacy support — some tests/older builds persisted a plain
      // `theme=dark|light` key without the full ThemePreferences payload.
      const legacyMode = localStorage.getItem('theme');

      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      if (legacyMode === 'dark' || legacyMode === 'light') {
        return { ...DEFAULT_THEME, mode: legacyMode, reducedMotion: prefersReducedMotion };
      }

      return { ...DEFAULT_THEME, reducedMotion: prefersReducedMotion };
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Resolve system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Follow OS reduced-motion changes at runtime.
  // Only applies when the user has not persisted an explicit preference — once
  // they toggle it manually in Settings, their choice takes precedence.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('nodebench-theme')) {
        setTheme(prev => ({ ...prev, reducedMotion: e.matches }));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode = useMemo(() => {
    if (theme.mode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return theme.mode;
  }, [theme.mode, systemPrefersDark]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Dark mode class
    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Accent color CSS variables
    const accent = ACCENT_COLORS.find(c => c.name === theme.accentColor) || ACCENT_COLORS[0];
    root.style.setProperty('--accent-color', accent.value);
    root.style.setProperty('--accent-color-hover', accent.hoverValue);
    root.style.setProperty('--accent-color-light', accent.lightValue);

    // Density
    root.dataset.density = theme.density;

    // Reduced motion
    if (theme.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Persist to localStorage
    localStorage.setItem('nodebench-theme', JSON.stringify(theme));
    localStorage.setItem('theme', resolvedMode); // Legacy support
  }, [theme, resolvedMode]);

  // Setters
  const setMode = useCallback((mode: ThemeMode) => {
    setTheme(prev => ({ ...prev, mode }));
  }, []);

  const setAccentColor = useCallback((accentColor: string) => {
    setTheme(prev => ({ ...prev, accentColor }));
  }, []);

  const setDensity = useCallback((density: ThemeDensity) => {
    setTheme(prev => ({ ...prev, density }));
  }, []);

  const setFontFamily = useCallback((fontFamily: string) => {
    setTheme(prev => ({ ...prev, fontFamily }));
  }, []);

  const setBackgroundPattern = useCallback((backgroundPattern: BackgroundPattern) => {
    setTheme(prev => ({ ...prev, backgroundPattern }));
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setTheme(prev => ({ ...prev, reducedMotion }));
  }, []);

  const setLayout = useCallback((layout: LayoutMode) => {
    setTheme(prev => ({ ...prev, layout }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  const value: ThemeContextValue = useMemo(() => ({
    theme,
    resolvedMode,
    setMode,
    setAccentColor,
    setDensity,
    setFontFamily,
    setBackgroundPattern,
    setReducedMotion,
    setLayout,
    resetToDefaults,
  }), [theme, resolvedMode, setMode, setAccentColor, setDensity, setFontFamily, setBackgroundPattern, setReducedMotion, setLayout, resetToDefaults]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
