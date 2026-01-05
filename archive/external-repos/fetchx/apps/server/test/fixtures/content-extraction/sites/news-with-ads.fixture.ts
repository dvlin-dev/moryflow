// test/fixtures/content-extraction/sites/news-with-ads.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * News article with ads fixture
 * Simulates a news website with heavy advertising and tracking elements
 * Key characteristics:
 * - Multiple ad placements (header, sidebar, inline, footer)
 * - Tracking scripts and pixels
 * - Newsletter signup forms
 * - Related articles sections
 */
export const newsWithAdsFixture: ContentFixture = {
  id: 'news-with-ads',
  description: 'News article with heavy advertising and tracking elements',
  url: 'https://news.example.com/tech/ai-breakthrough-2024',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Breakthrough Changes Industry - Tech News</title>
</head>
<body>
  <div class="ad header-ad advertisement">
    <div class="ad-placeholder">ADVERTISEMENT - 728x90</div>
    <p>Special Offer: Get 50% off!</p>
  </div>

  <header class="site-header">
    <nav class="main-navigation">
      <a href="/">Home</a>
      <a href="/tech">Tech</a>
      <a href="/business">Business</a>
      <a href="/sports">Sports</a>
    </nav>
    <div class="social-links">
      <a href="#">Facebook</a>
      <a href="#">Twitter</a>
    </div>
  </header>

  <div class="breadcrumbs">
    <a href="/">Home</a> > <a href="/tech">Tech</a> > AI Breakthrough
  </div>

  <div class="page-container">
    <aside class="sidebar left-sidebar">
      <div class="ad sidebar-ad advertisement">
        <p>SPONSORED: Buy Now!</p>
      </div>
      <div class="widget trending-widget">
        <h4>Trending Now</h4>
        <ul>
          <li><a href="#">Article 1</a></li>
          <li><a href="#">Article 2</a></li>
        </ul>
      </div>
    </aside>

    <main class="article-main">
      <article class="article-content">
        <div class="article-body prose">
          <h1>Revolutionary AI System Achieves Human-Level Reasoning</h1>
          <p class="meta">By John Smith | Published January 3, 2024</p>

          <p>Scientists at a leading research laboratory have announced a groundbreaking advancement in artificial intelligence. The new system demonstrates unprecedented capabilities in logical reasoning and problem-solving.</p>

          <p>The research team, led by Dr. Sarah Chen, spent three years developing the novel architecture. Their approach combines multiple neural network techniques with symbolic reasoning systems.</p>

          <h2>Technical Details</h2>
          <p>Unlike previous models, this system can break down complex problems into logical steps. It achieves ninety-five percent accuracy on standardized reasoning benchmarks, surpassing human expert performance.</p>

          <p>The implications for industries ranging from healthcare to finance are significant. Early trials show promise in medical diagnosis and financial risk assessment.</p>

          <h2>Expert Reactions</h2>
          <p>Industry experts have responded with cautious optimism. Professor James Liu from MIT called it a significant step forward, while noting challenges remain for real-world deployment.</p>

          <h2>Future Implications</h2>
          <p>The research opens new possibilities for human-AI collaboration. Rather than replacing human workers, the technology could augment decision-making in complex scenarios.</p>

          <p>The team plans to publish their findings in Nature next month, allowing peer review of their methodology and results.</p>
        </div>

        <div class="share social-share share-buttons">
          <a href="#">Share on Facebook</a>
          <a href="#">Share on Twitter</a>
          <a href="#">Share via Email</a>
        </div>

        <section class="related-articles">
          <h3>Related Articles</h3>
          <ul>
            <li><a href="#">Previous AI Breakthrough</a></li>
            <li><a href="#">Tech Industry Trends</a></li>
          </ul>
        </section>

        <section class="comments" id="comments">
          <h3>Comments (45)</h3>
          <div class="comment">
            <p class="author">reader123</p>
            <p>Interesting article!</p>
          </div>
          <div class="comment">
            <p class="author">techfan</p>
            <p>Can't wait to see the paper</p>
          </div>
        </section>
      </article>
    </main>

    <aside class="sidebar right-sidebar">
      <div class="ad advertisement">
        <p>Promoted: Cloud Services</p>
      </div>
    </aside>
  </div>

  <footer class="site-footer">
    <div class="cookie-notice cookie-banner">
      <p>We use cookies to improve your experience.</p>
      <button>Accept</button>
    </div>
    <p>&copy; 2024 News Example. All rights reserved.</p>
    <div class="footer-links">
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </div>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: [
      'Revolutionary AI System',
      'Human-Level Reasoning',
      'Dr. Sarah Chen',
      'neural network',
      'symbolic reasoning',
      'ninety-five percent accuracy',
      'healthcare to finance',
      'Professor James Liu',
      'human-AI collaboration',
      'publish their findings',
    ],
    mustNotContain: [
      'ADVERTISEMENT',
      'Special Offer',
      'Buy Now',
      'We use cookies',
      'All rights reserved',
      'Trending Now',
    ],
    minLength: 800,
    maxLength: 4000,
  },

  metadata: {
    category: 'blog',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: true,
  },
};
