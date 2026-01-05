// test/fixtures/content-extraction/sites/blog-article.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * Blog article fixture
 * Simulates a typical blog post with sidebar and comments
 * Key characteristics:
 * - Article content with headings and paragraphs
 * - Sidebar with widgets
 * - Comment section (should be excluded)
 */
export const blogArticleFixture: ContentFixture = {
  id: 'blog-article',
  description: 'Blog article with sidebar, comments, and social sharing',
  url: 'https://example.com/blog/my-article',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>How to Build a Web Scraper - My Blog</title>
</head>
<body>
  <header class="header">
    <nav class="navigation">
      <a href="/">Home</a>
      <a href="/blog">Blog</a>
    </nav>
  </header>

  <div class="container">
    <aside class="sidebar">
      <div class="widget">
        <h3>Popular Posts</h3>
        <ul>
          <li><a href="/post1">Another Post</a></li>
          <li><a href="/post2">Old Post</a></li>
        </ul>
      </div>
      <div class="advertisement">
        <p>Buy our product!</p>
      </div>
    </aside>

    <main>
      <article class="post-content">
        <h1>How to Build a Web Scraper</h1>
        <p class="meta">Published on January 1, 2025 by Author</p>

        <p>Web scraping is a powerful technique for extracting data from websites. In this article, we'll explore the fundamentals of building a web scraper.</p>

        <h2>Getting Started</h2>
        <p>First, you need to understand HTML structure and how browsers render pages. This knowledge is essential for targeting the right elements.</p>

        <h2>Tools and Libraries</h2>
        <p>Popular tools include Puppeteer, Playwright, and Cheerio. Each has its own strengths depending on your use case.</p>

        <h2>Best Practices</h2>
        <p>Always respect robots.txt and implement rate limiting. Be a good citizen of the web.</p>

        <h2>Conclusion</h2>
        <p>Web scraping is an essential skill for data engineers and developers. Start small and gradually build more complex scrapers.</p>
      </article>

      <div class="share social-links">
        <a href="#">Share on Twitter</a>
        <a href="#">Share on Facebook</a>
      </div>

      <section class="comments">
        <h3>Comments</h3>
        <div class="comment">Great article!</div>
        <div class="comment">Very helpful, thanks!</div>
      </section>
    </main>
  </div>

  <footer class="footer">
    <p>&copy; 2025 My Blog. All rights reserved.</p>
    <div class="cookie-notice">We use cookies.</div>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    // Note: h1 might be extracted as document title by Readability, so we focus on body content
    mustContain: [
      'Web scraping is a powerful technique',
      'Getting Started',
      'Tools and Libraries',
      'Puppeteer',
      'Best Practices',
      'Conclusion',
    ],
    mustNotContain: [
      'Popular Posts',
      'Buy our product',
      'Share on Twitter',
      'We use cookies',
      'All rights reserved',
    ],
    minLength: 500,
    maxLength: 3000,
  },

  metadata: {
    category: 'blog',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: true,
  },
};
