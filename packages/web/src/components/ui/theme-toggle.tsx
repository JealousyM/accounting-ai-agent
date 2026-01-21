'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, Theme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

const themeIcons: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const CurrentIcon = themeIcons[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        'flex items-center justify-center p-2 rounded-md',
        'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
        className
      )}
      aria-label={`Current theme: ${themeLabels[theme]}. Click to cycle.`}
      title={`Theme: ${themeLabels[theme]}`}
    >
      <CurrentIcon className="w-4 h-4" />
    </button>
  );
}
