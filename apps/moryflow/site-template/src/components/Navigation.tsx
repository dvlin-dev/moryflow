/**
 * [PROPS]: { items: NavItem[], currentPath?: string } - 导航项和当前路径
 * [POS]: 侧边导航组件，用于多页面布局
 */

export interface NavItem {
  title: string;
  path?: string;
  children?: NavItem[];
}

interface NavigationProps {
  items: NavItem[];
  currentPath?: string;
}

export function Navigation({ items, currentPath = '' }: NavigationProps) {
  return (
    <nav
      style={{
        padding: 'var(--space-4)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <NavList items={items} currentPath={currentPath} level={0} />
    </nav>
  );
}

interface NavListProps {
  items: NavItem[];
  currentPath: string;
  level: number;
}

function NavList({ items, currentPath, level }: NavListProps) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {items.map((item, index) => (
        <NavItemComponent
          key={item.path || index}
          item={item}
          currentPath={currentPath}
          level={level}
        />
      ))}
    </ul>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  currentPath: string;
  level: number;
}

function NavItemComponent({ item, currentPath, level }: NavItemComponentProps) {
  const isActive = item.path === currentPath;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <li>
      {item.path ? (
        <a
          href={item.path}
          style={{
            display: 'block',
            padding: 'var(--space-2) var(--space-3)',
            paddingLeft: `calc(var(--space-3) + ${level * 12}px)`,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isActive ? 'var(--font-medium)' : 'var(--font-normal)',
            background: isActive ? 'var(--bg-tertiary)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            transition: 'var(--transition-colors)',
          }}
        >
          {item.title}
        </a>
      ) : (
        <span
          style={{
            display: 'block',
            padding: 'var(--space-2) var(--space-3)',
            paddingLeft: `calc(var(--space-3) + ${level * 12}px)`,
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-medium)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: level === 0 ? 'var(--space-4)' : 0,
          }}
        >
          {item.title}
        </span>
      )}
      {hasChildren && (
        <NavList items={item.children!} currentPath={currentPath} level={level + 1} />
      )}
    </li>
  );
}
