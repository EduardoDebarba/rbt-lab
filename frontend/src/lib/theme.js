import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rbt_lab_theme';

export function useThemeMode() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    function syncTheme(event) {
      if (event.detail && event.detail !== theme) {
        setTheme(event.detail);
      }
    }

    window.addEventListener('rbt-theme-change', syncTheme);
    return () => window.removeEventListener('rbt-theme-change', syncTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent('rbt-theme-change', { detail: theme }));
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme
  };
}
