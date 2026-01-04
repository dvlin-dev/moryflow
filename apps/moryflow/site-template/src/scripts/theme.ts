/**
 * Theme initialization script
 * Injected into <head> to prevent flash of wrong theme
 */

export const themeScript = `
(function() {
  try {
    const theme = localStorage.getItem('moryflow-theme') || 'system';
    const isDark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export type Theme = 'light' | 'dark' | 'system';

/**
 * Get current theme from storage
 */
export function getTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  return (localStorage.getItem('moryflow-theme') as Theme) || 'system';
}

/**
 * Set theme and apply it
 */
export function setTheme(theme: Theme): void {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem('moryflow-theme', theme);
  applyTheme(theme);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Toggle theme: light → dark → system → light
 */
export function toggleTheme(): Theme {
  const current = getTheme();
  const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
  setTheme(next);
  return next;
}
