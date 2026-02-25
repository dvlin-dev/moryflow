/**
 * Development preview entry point
 * Shows both SinglePage and MultiPage layouts with sample content
 */

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/prose.css';

// Sample content for preview
const sampleContent = `
<h1>Welcome to Moryflow</h1>
<p>This is a sample page demonstrating the Moryflow site template.</p>

<h2>Features</h2>
<p>The template includes:</p>
<ul>
  <li>Light and dark mode support</li>
  <li>Responsive design</li>
  <li>Clean typography based on Notion design</li>
  <li>SSG-ready templates</li>
</ul>

<h2>Code Example</h2>
<p>Here's some inline <code>code</code> and a code block:</p>
<pre><code>function hello() {
  console.log('Hello, Moryflow!');
}</code></pre>

<h2>Blockquote</h2>
<blockquote>
  <p>This is a blockquote. It's styled with a subtle left border.</p>
</blockquote>

<h2>Table</h2>
<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dark Mode</td>
      <td>Supported</td>
    </tr>
    <tr>
      <td>Responsive</td>
      <td>Supported</td>
    </tr>
  </tbody>
</table>

<hr />

<p>Made with Moryflow.</p>
`;

const sampleNavigation = [
  { title: 'Getting Started', path: '/' },
  {
    title: 'Guides',
    children: [
      { title: 'Installation', path: '/guides/installation' },
      { title: 'Configuration', path: '/guides/configuration' },
    ],
  },
  {
    title: 'API Reference',
    children: [
      { title: 'Components', path: '/api/v1/components' },
      { title: 'Hooks', path: '/api/v1/hooks' },
    ],
  },
];

function DevPreview() {
  const [layout, setLayout] = useState<'single' | 'multi'>('single');
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Dev toolbar */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setLayout('single')}
          style={{
            padding: '6px 12px',
            background: layout === 'single' ? 'var(--text-primary)' : 'transparent',
            color: layout === 'single' ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          SinglePage
        </button>
        <button
          onClick={() => setLayout('multi')}
          style={{
            padding: '6px 12px',
            background: layout === 'multi' ? 'var(--text-primary)' : 'transparent',
            color: layout === 'multi' ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          MultiPage
        </button>
        <div style={{ width: '1px', background: 'var(--border)' }} />
        <button
          onClick={toggleTheme}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Layout preview */}
      {layout === 'single' ? (
        <SinglePagePreview content={sampleContent} />
      ) : (
        <MultiPagePreview content={sampleContent} navigation={sampleNavigation} />
      )}
    </div>
  );
}

// Simplified preview components (inline, not using SSG templates)
function SinglePagePreview({ content }: { content: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px',
            padding: '0 16px',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>My Document</h1>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '32px 16px',
          width: '100%',
        }}
      >
        <article className="prose" dangerouslySetInnerHTML={{ __html: content }} />
      </main>

      <footer
        style={{
          padding: '32px 16px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
        }}
      >
        <a
          href="https://moryflow.com"
          style={{ color: 'var(--text-tertiary)', fontSize: '14px', textDecoration: 'none' }}
        >
          Made with Moryflow
        </a>
      </footer>
    </div>
  );
}

function MultiPagePreview({ content, navigation }: { content: string; navigation: any[] }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '240px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <a
            href="/"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            My Docs
          </a>
        </div>
        <nav style={{ padding: '16px' }}>
          {navigation.map((item, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              {item.path ? (
                <a
                  href={item.path}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    color: item.path === '/' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: item.path === '/' ? 'var(--bg-tertiary)' : 'transparent',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  {item.title}
                </a>
              ) : (
                <div>
                  <span
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      color: 'var(--text-tertiary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.title}
                  </span>
                  {item.children?.map((child: any, j: number) => (
                    <a
                      key={j}
                      href={child.path}
                      style={{
                        display: 'block',
                        padding: '8px 12px 8px 24px',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      {child.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '56px',
              padding: '0 16px',
            }}
          />
        </header>

        <main
          style={{
            flex: 1,
            maxWidth: '860px',
            margin: '0 auto',
            padding: '32px 16px',
            width: '100%',
          }}
        >
          <article className="prose" dangerouslySetInnerHTML={{ __html: content }} />
        </main>

        <footer
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            borderTop: '1px solid var(--border)',
          }}
        >
          <a
            href="https://moryflow.com"
            style={{ color: 'var(--text-tertiary)', fontSize: '14px', textDecoration: 'none' }}
          >
            Made with Moryflow
          </a>
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevPreview />
  </StrictMode>
);
