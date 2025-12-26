/**
 * Theme System Types
 * Defines all theme-related types for the application
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeDensity = 'comfortable' | 'compact' | 'spacious';

export type BackgroundPattern = 'none' | 'dots' | 'grid' | 'lines' | 'noise';

export interface ThemeAccentColor {
  name: string;
  value: string;
  hoverValue: string;
  lightValue: string;
}

export const ACCENT_COLORS: ThemeAccentColor[] = [
  { name: 'blue', value: '#3B82F6', hoverValue: '#2563EB', lightValue: '#DBEAFE' },
  { name: 'purple', value: '#8B5CF6', hoverValue: '#7C3AED', lightValue: '#EDE9FE' },
  { name: 'green', value: '#10B981', hoverValue: '#059669', lightValue: '#D1FAE5' },
  { name: 'orange', value: '#F97316', hoverValue: '#EA580C', lightValue: '#FFEDD5' },
  { name: 'pink', value: '#EC4899', hoverValue: '#DB2777', lightValue: '#FCE7F3' },
  { name: 'teal', value: '#14B8A6', hoverValue: '#0D9488', lightValue: '#CCFBF1' },
  { name: 'red', value: '#EF4444', hoverValue: '#DC2626', lightValue: '#FEE2E2' },
  { name: 'indigo', value: '#6366F1', hoverValue: '#4F46E5', lightValue: '#E0E7FF' },
];

export const FONT_FAMILIES = [
  { name: 'System', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { name: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { name: 'Geist', value: '"Geist", system-ui, sans-serif' },
  { name: 'Mono', value: '"JetBrains Mono", "Fira Code", monospace' },
];

export interface ThemePreferences {
  mode: ThemeMode;
  accentColor: string;
  density: ThemeDensity;
  fontFamily: string;
  backgroundPattern: BackgroundPattern;
  reducedMotion: boolean;
}

export const DEFAULT_THEME: ThemePreferences = {
  mode: 'system',
  accentColor: 'blue',
  density: 'comfortable',
  fontFamily: 'System',
  backgroundPattern: 'none',
  reducedMotion: false,
};

export interface ThemeContextValue {
  theme: ThemePreferences;
  resolvedMode: 'light' | 'dark'; // Actual mode after resolving 'system'
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: ThemeDensity) => void;
  setFontFamily: (font: string) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setReducedMotion: (reduced: boolean) => void;
  resetToDefaults: () => void;
}

