/**
 * [PROPS]: { items: TocItem[] } - 目录项
 * [POS]: 目录组件，显示当前页面的标题层级
 */

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 'calc(56px + var(--space-4))',
        fontSize: 'var(--text-sm)',
        maxHeight: 'calc(100vh - 56px - var(--space-8))',
        overflowY: 'auto',
      }}
    >
      <h4
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)',
        }}
      >
        On this page
      </h4>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              style={{
                display: 'block',
                padding: 'var(--space-1) 0',
                paddingLeft: `${(item.level - 2) * 12}px`,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'var(--transition-colors)',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * TOC scroll highlight script
 */
export const tocScript = `
(function() {
  var toc = document.querySelector('[data-toc]');
  if (!toc) return;

  var links = toc.querySelectorAll('a[href^="#"]');
  var headings = [];

  links.forEach(function(link) {
    var id = link.getAttribute('href').slice(1);
    var heading = document.getElementById(id);
    if (heading) headings.push({ link: link, heading: heading });
  });

  function highlight() {
    var scrollY = window.scrollY + 80;
    var active = headings[0];

    headings.forEach(function(item) {
      if (item.heading.offsetTop <= scrollY) {
        active = item;
      }
    });

    links.forEach(function(link) {
      link.style.color = link === active.link ? 'var(--text-primary)' : 'var(--text-secondary)';
      link.style.fontWeight = link === active.link ? 'var(--font-medium)' : 'var(--font-normal)';
    });
  }

  window.addEventListener('scroll', highlight, { passive: true });
  highlight();
})();
`;
