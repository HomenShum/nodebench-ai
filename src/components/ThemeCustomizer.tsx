import React from 'react';
import { Sun, Moon, Monitor, Check, RotateCcw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ACCENT_COLORS, FONT_FAMILIES, ThemeMode, ThemeDensity, BackgroundPattern } from '../types/theme';

export function ThemeCustomizer() {
  const {
    theme,
    resolvedMode,
    setMode,
    setAccentColor,
    setDensity,
    setFontFamily,
    setBackgroundPattern,
    setReducedMotion,
    resetToDefaults,
  } = useTheme();

  const modeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const densityOptions: { value: ThemeDensity; label: string }[] = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact' },
    { value: 'spacious', label: 'Spacious' },
  ];

  const patternOptions: { value: BackgroundPattern; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'dots', label: 'Dots' },
    { value: 'grid', label: 'Grid' },
    { value: 'lines', label: 'Lines' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Mode */}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
          Appearance
        </label>
        <div className="flex gap-2">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                theme.mode === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-stone-200 hover:border-stone-300 dark:border-stone-600 dark:hover:border-stone-500'
              }`}
            >
              {option.icon}
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Currently using: {resolvedMode} mode
        </p>
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
          Accent Color
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setAccentColor(color.name)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                theme.accentColor === color.name ? 'ring-2 ring-offset-2 ring-gray-400' : ''
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {theme.accentColor === color.name && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
          Density
        </label>
        <div className="flex gap-2">
          {densityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDensity(option.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                theme.density === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-stone-200 hover:border-stone-300 dark:border-stone-600 dark:hover:border-stone-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
          Font
        </label>
        <select
          value={theme.fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm dark:border-stone-600 dark:bg-stone-800"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.name} value={font.name}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reduced Motion */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Reduce Motion
          </label>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Minimize animations for accessibility
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReducedMotion(!theme.reducedMotion)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            theme.reducedMotion ? 'bg-blue-500' : 'bg-stone-200 dark:bg-stone-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              theme.reducedMotion ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

