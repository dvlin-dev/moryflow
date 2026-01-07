// test/fixtures/content-extraction/sites/documentation.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * Documentation page fixture
 * Simulates a technical documentation page
 * Key characteristics:
 * - Code blocks
 * - Table of contents sidebar
 * - Breadcrumbs navigation
 */
export const documentationFixture: ContentFixture = {
  id: 'documentation',
  description: 'Technical documentation page with code blocks and TOC',
  url: 'https://docs.example.com/api/scrape',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Scrape API - Documentation</title>
</head>
<body>
  <header>
    <nav class="navbar">
      <a href="/">Docs</a>
      <a href="/api">API Reference</a>
      <a href="/guides">Guides</a>
    </nav>
  </header>

  <div class="docs-layout">
    <aside class="sidebar">
      <nav class="toc">
        <h4>On this page</h4>
        <ul>
          <li><a href="#overview">Overview</a></li>
          <li><a href="#parameters">Parameters</a></li>
          <li><a href="#examples">Examples</a></li>
        </ul>
      </nav>
    </aside>

    <main role="main">
      <nav class="breadcrumbs">
        <a href="/">Home</a> &gt; <a href="/api">API</a> &gt; Scrape
      </nav>

      <article class="prose">
        <h1 id="overview">Scrape API</h1>
        <p>The Scrape API allows you to extract content from any web page. It returns clean markdown, HTML, or structured data.</p>

        <h2 id="parameters">Parameters</h2>
        <p>The API accepts the following parameters:</p>
        <ul>
          <li><code>url</code> (required) - The URL to scrape</li>
          <li><code>formats</code> - Array of output formats: markdown, html, screenshot</li>
          <li><code>onlyMainContent</code> - Whether to extract only main content</li>
        </ul>

        <h2 id="examples">Examples</h2>
        <p>Here's a basic example using curl:</p>
        <pre><code class="language-bash">curl -X POST https://api.example.com/v1/scrape \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"url": "https://example.com"}'</code></pre>

        <p>Response:</p>
        <pre><code class="language-json">{
  "success": true,
  "data": {
    "markdown": "# Example Page\\n\\nContent here..."
  }
}</code></pre>

        <h2>Rate Limits</h2>
        <p>The API is rate limited to 100 requests per minute. Exceeding this limit will result in a 429 error.</p>
      </article>
    </main>
  </div>

  <footer>
    <p>&copy; 2025 Example Inc.</p>
    <div class="lang-selector">
      <a href="?lang=en">English</a>
      <a href="?lang=zh">中文</a>
    </div>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: [
      'Scrape API',
      'extract content from any web page',
      'Parameters',
      'url',
      'formats',
      'Examples',
      'curl',
      'Rate Limits',
    ],
    mustNotContain: [
      'On this page',
      'lang-selector',
      'Example Inc',
      'breadcrumbs',
    ],
    minLength: 500,
    maxLength: 3000,
  },

  metadata: {
    category: 'docs',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: true,
  },
};
