/**
 * [PROPS]: { title?: string } - 站点标题
 * [POS]: 页头组件，包含标题和主题切换
 */

import type { ReactNode } from 'react';

interface HeaderProps {
  title?: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'var(--blur-md)',
        WebkitBackdropFilter: 'var(--blur-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          padding: '0 var(--space-4)',
          maxWidth: 'var(--content-width-full)',
          margin: '0 auto',
        }}
      >
        {title && (
          <h1
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h1>
        )}
        {children}
      </div>
    </header>
  );
}
