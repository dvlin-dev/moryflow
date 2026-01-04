/**
 * [PROPS]: none
 * [POS]: 主题切换按钮，支持 light/dark/system 三态
 *
 * Note: SSG 模式下只渲染占位符，实际交互由内联脚本处理
 */

export function ThemeToggle() {
  return (
    <button
      id="theme-toggle"
      type="button"
      aria-label="Toggle theme"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        transition: 'var(--transition-colors)',
      }}
    >
      {/* Sun icon - shown in dark mode */}
      <svg
        className="theme-icon-light"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'none' }}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      {/* Moon icon - shown in light mode */}
      <svg
        className="theme-icon-dark"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}

/**
 * Theme toggle script (injected after ThemeToggle)
 * Handles click events and icon visibility
 */
export const themeToggleScript = `
(function() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  var lightIcon = btn.querySelector('.theme-icon-light');
  var darkIcon = btn.querySelector('.theme-icon-dark');

  function updateIcons() {
    var isDark = document.documentElement.classList.contains('dark');
    if (lightIcon) lightIcon.style.display = isDark ? 'block' : 'none';
    if (darkIcon) darkIcon.style.display = isDark ? 'none' : 'block';
  }

  function getTheme() {
    return localStorage.getItem('moryflow-theme') || 'system';
  }

  function setTheme(theme) {
    localStorage.setItem('moryflow-theme', theme);
    var isDark = theme === 'dark' ||
      (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    updateIcons();
  }

  btn.onclick = function() {
    var current = getTheme();
    var next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  updateIcons();

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getTheme() === 'system') {
      setTheme('system');
    }
  });
})();
`;
