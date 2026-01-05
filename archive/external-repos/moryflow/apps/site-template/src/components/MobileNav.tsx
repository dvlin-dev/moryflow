/**
 * [PROPS]: { items: NavItem[] } - 导航项
 * [POS]: 移动端汉堡菜单导航
 */

import type { NavItem } from './Navigation';

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  return (
    <>
      {/* Hamburger button */}
      <button
        id="mobile-nav-toggle"
        type="button"
        aria-label="Toggle navigation"
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        id="mobile-nav-overlay"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 200,
        }}
      />

      {/* Mobile drawer */}
      <div
        id="mobile-nav-drawer"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80vw',
          background: 'var(--bg-primary)',
          zIndex: 201,
          overflowY: 'auto',
          transform: 'translateX(-100%)',
          transition: 'transform var(--duration-normal) var(--ease-out)',
        }}
      >
        <div style={{ padding: 'var(--space-4)' }}>
          <MobileNavList items={items} level={0} />
        </div>
      </div>
    </>
  );
}

interface MobileNavListProps {
  items: NavItem[];
  level: number;
}

function MobileNavList({ items, level }: MobileNavListProps) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {items.map((item, index) => (
        <li key={item.path || index}>
          {item.path ? (
            <a
              href={item.path}
              style={{
                display: 'block',
                padding: 'var(--space-3) var(--space-4)',
                paddingLeft: `calc(var(--space-4) + ${level * 16}px)`,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
              }}
            >
              {item.title}
            </a>
          ) : (
            <span
              style={{
                display: 'block',
                padding: 'var(--space-3) var(--space-4)',
                paddingLeft: `calc(var(--space-4) + ${level * 16}px)`,
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                marginTop: level === 0 ? 'var(--space-4)' : 0,
              }}
            >
              {item.title}
            </span>
          )}
          {item.children && item.children.length > 0 && (
            <MobileNavList items={item.children} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Mobile navigation script
 */
export const mobileNavScript = `
(function() {
  var toggle = document.getElementById('mobile-nav-toggle');
  var overlay = document.getElementById('mobile-nav-overlay');
  var drawer = document.getElementById('mobile-nav-drawer');
  if (!toggle || !overlay || !drawer) return;

  var isOpen = false;

  function open() {
    isOpen = true;
    overlay.style.display = 'block';
    drawer.style.display = 'block';
    requestAnimationFrame(function() {
      drawer.style.transform = 'translateX(0)';
    });
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    drawer.style.transform = 'translateX(-100%)';
    setTimeout(function() {
      if (!isOpen) {
        overlay.style.display = 'none';
        drawer.style.display = 'none';
      }
    }, 200);
    document.body.style.overflow = '';
  }

  toggle.onclick = function() {
    isOpen ? close() : open();
  };

  overlay.onclick = close;

  // Show button on mobile
  function checkMobile() {
    toggle.style.display = window.innerWidth < 1024 ? 'flex' : 'none';
  }

  window.addEventListener('resize', checkMobile);
  checkMobile();
})();
`;
