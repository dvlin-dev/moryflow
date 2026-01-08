// test/fixtures/content-extraction/sites/spa-page.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * SPA (Single Page Application) fixture
 * Simulates React/Vue app with data attributes and minimal semantic markup
 * Key characteristics:
 * - Uses data-* attributes for state management
 * - Multiple nested divs instead of semantic elements
 * - Dynamic content containers
 */
export const spaPageFixture: ContentFixture = {
  id: 'spa-page',
  description: 'SPA with React-style markup and dynamic containers',
  url: 'https://example.com/app/dashboard',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard - My App</title>
</head>
<body>
  <div id="root" data-reactroot="">
    <div class="app-container">
      <header class="top-bar" data-testid="header">
        <div class="logo">AppName</div>
        <nav class="main-nav" data-testid="navigation">
          <a href="/home">Home</a>
          <a href="/settings">Settings</a>
          <button class="menu-toggle">Menu</button>
        </nav>
        <div class="user-menu" data-testid="user-menu">
          <span>Welcome, User</span>
          <button>Logout</button>
        </div>
      </header>

      <div class="app-layout">
        <aside class="sidebar" data-testid="sidebar">
          <ul class="nav-list">
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/reports">Reports</a></li>
          </ul>
        </aside>

        <main class="main-content" data-testid="main-content">
          <div class="page-header">
            <h1>Analytics Dashboard</h1>
            <p class="subtitle">Real-time insights for your business</p>
          </div>

          <div class="content-section">
            <h2>Overview</h2>
            <p>Welcome to your analytics dashboard. Here you can monitor key performance indicators, track user engagement, and analyze trends across your platform.</p>

            <div class="metrics-grid">
              <div class="metric-card">
                <h3>Active Users</h3>
                <p>Understanding your active user base is crucial for measuring growth. This metric tracks daily and monthly active users across all platforms.</p>
              </div>
              <div class="metric-card">
                <h3>Revenue Trends</h3>
                <p>Monitor your revenue streams with detailed breakdowns by product category, region, and customer segment.</p>
              </div>
            </div>

            <h2>Key Insights</h2>
            <p>Our machine learning algorithms have identified several important patterns in your data. User engagement peaks during weekday mornings, suggesting optimal times for marketing campaigns.</p>

            <h2>Recommendations</h2>
            <p>Based on current trends, we recommend focusing on mobile optimization. Mobile traffic has increased by forty percent over the past quarter.</p>
          </div>
        </main>
      </div>

      <footer class="app-footer" data-testid="footer">
        <p>© 2024 AppName Inc. All rights reserved.</p>
        <div class="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </footer>
    </div>

    <div class="modal overlay" id="modal-container"></div>
    <div class="toast-container" data-testid="toasts"></div>
  </div>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: [
      'Analytics Dashboard',
      'key performance indicators',
      'Active Users',
      'Revenue Trends',
      'machine learning algorithms',
      'mobile optimization',
    ],
    mustNotContain: [
      'Welcome, User',
      'Logout',
      'Privacy</a>',
      'All rights reserved',
    ],
    minLength: 400,
    maxLength: 3000,
  },

  metadata: {
    category: 'spa',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: true,
  },
};
