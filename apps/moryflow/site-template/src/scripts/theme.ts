/**
 * [PROVIDES]: THEME_INIT_SCRIPT/THEME_TOGGLE_SCRIPT + Theme helpers
 * [DEPENDS]: browser localStorage + matchMedia
 * [POS]: site-template 主题脚本真源（sync.ts 与开发预览共享）
 */

export const THEME_INIT_SCRIPT = `(function(){try{var theme=localStorage.getItem('moryflow-theme')||'system';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=theme==='dark'||(theme==='system'&&prefersDark);document.documentElement.classList.toggle('dark',isDark)}catch(_error){}})()`;

export const THEME_TOGGLE_SCRIPT = `(function(){var btn=document.getElementById('theme-toggle');if(!btn)return;var media=matchMedia('(prefers-color-scheme:dark)');function getTheme(){return localStorage.getItem('moryflow-theme')||'system'}function isDarkTheme(theme){return theme==='dark'||(theme==='system'&&media.matches)}function applyTheme(theme){localStorage.setItem('moryflow-theme',theme);document.documentElement.classList.toggle('dark',isDarkTheme(theme))}function getNextTheme(current){switch(current){case'light':return'dark';case'dark':return'system';default:return'light'}}btn.onclick=function(){applyTheme(getNextTheme(getTheme()))};media.addEventListener('change',function(){if(getTheme()==='system'){applyTheme('system')}})})()`;

// Backward-compatible alias for any preview-only imports.
export const themeScript = THEME_INIT_SCRIPT;
export const themeToggleScript = THEME_TOGGLE_SCRIPT;

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
  let next: Theme;
  switch (current) {
    case 'light':
      next = 'dark';
      break;
    case 'dark':
      next = 'system';
      break;
    default:
      next = 'light';
      break;
  }
  setTheme(next);
  return next;
}
