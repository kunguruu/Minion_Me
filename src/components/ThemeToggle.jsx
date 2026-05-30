import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/useTheme';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 z-[120] inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="h-4 w-4 text-minion-yellow" /> : <Moon className="h-4 w-4 text-minion-blue" />}
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}

export default ThemeToggle;
