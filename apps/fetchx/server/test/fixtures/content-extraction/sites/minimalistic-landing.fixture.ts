// test/fixtures/content-extraction/sites/minimalistic-landing.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * Minimalistic landing page fixture
 * Simulates a personal portfolio/landing page like dvlin.com
 * Key characteristics:
 * - Very little content (< 500 chars)
 * - Clear semantic structure (main, article)
 * - Navigation and footer noise
 */
export const minimalisticLandingFixture: ContentFixture = {
  id: 'minimalistic-landing',
  description: 'Minimalistic personal landing page with navigation and footer',
  url: 'https://example.com/',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>John Doe - Developer</title>
  <meta name="description" content="John Doe's personal website">
</head>
<body>
  <nav class="navbar">
    <a href="/">Home</a>
    <a href="/blog">Blog</a>
    <a href="/about">About</a>
  </nav>

  <main id="main">
    <article class="prose">
      <h1>Welcome</h1>
      <p>I'm a software developer passionate about web technologies.</p>
      <p>Find me on:</p>
      <ul>
        <li><a href="https://github.com/johndoe">GitHub</a></li>
        <li><a href="https://twitter.com/johndoe">Twitter</a></li>
      </ul>
    </article>
  </main>

  <footer>
    <p>&copy; 2025 John Doe. All rights reserved.</p>
    <a href="/privacy">Privacy Policy</a>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: ['Welcome', 'software developer', 'GitHub', 'Twitter'],
    mustNotContain: ['All rights reserved', 'Privacy Policy', 'navbar'],
    minLength: 50,
    maxLength: 500,
  },

  metadata: {
    category: 'minimalistic',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: false,
  },
};
