// test/fixtures/content-extraction/sites/ecommerce-product.fixture.ts
import type { ContentFixture } from '../golden.schema';

/**
 * E-commerce product page fixture
 * Simulates a typical product page with structured data
 * Key characteristics:
 * - Product info with price, description, specs
 * - Customer reviews section
 * - Related products recommendations
 * - Trust badges and shipping info
 */
export const ecommerceProductFixture: ContentFixture = {
  id: 'ecommerce-product',
  description: 'E-commerce product page with reviews and recommendations',
  url: 'https://shop.example.com/products/wireless-headphones',

  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Premium Wireless Headphones - Shop Example</title>
</head>
<body>
  <header class="store-header">
    <nav class="main-nav navigation">
      <a href="/">Home</a>
      <a href="/products">Products</a>
      <a href="/cart">Cart (3)</a>
    </nav>
    <div class="search-bar">
      <input type="search" placeholder="Search products...">
    </div>
  </header>

  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a> > <a href="/electronics">Electronics</a> > Headphones
  </nav>

  <main class="product-page">
    <article class="product-details">
      <div class="product-gallery">
        <img src="/images/headphones-main.jpg" alt="Wireless Headphones">
        <div class="thumbnails">
          <img src="/images/thumb1.jpg" alt="View 1">
          <img src="/images/thumb2.jpg" alt="View 2">
        </div>
      </div>

      <div class="product-info">
        <h1>Premium Wireless Headphones Pro</h1>
        <div class="rating">★★★★☆ (4.5 out of 5)</div>
        <p class="price">$299.99</p>

        <div class="product-description prose">
          <p>Experience exceptional audio quality with our Premium Wireless Headphones Pro. Featuring advanced noise cancellation technology, these headphones deliver crystal-clear sound in any environment.</p>

          <h2>Key Features</h2>
          <ul>
            <li>Active Noise Cancellation with three adjustable levels</li>
            <li>Forty hours of battery life on a single charge</li>
            <li>Premium memory foam ear cushions for all-day comfort</li>
            <li>Bluetooth 5.3 for stable, low-latency connection</li>
            <li>Built-in microphone with voice isolation technology</li>
          </ul>

          <h2>Audio Quality</h2>
          <p>Our custom forty millimeter drivers deliver rich bass and crisp highs. The frequency response ranges from twenty Hertz to twenty thousand Hertz, covering the full spectrum of human hearing.</p>

          <h2>Technical Specifications</h2>
          <p>Driver Size: 40mm | Frequency Response: 20Hz-20kHz | Battery: 40 hours | Weight: 250g | Bluetooth: 5.3</p>

          <h2>What's in the Box</h2>
          <p>Headphones, USB-C charging cable, 3.5mm audio cable, carrying case, and quick start guide.</p>
        </div>

      </div>
    </article>
  </main>

  <aside class="product-sidebar sidebar">
    <div class="add-to-cart-section widget">
      <button class="btn-primary">Add to Cart - $299.99</button>
      <button class="btn-secondary">Add to Wishlist</button>
    </div>

    <div class="trust-badges widget">
      <span>✓ Free Shipping</span>
      <span>✓ 30-Day Returns</span>
      <span>✓ 2-Year Warranty</span>
    </div>

    <section class="customer-reviews widget">
      <h2>Customer Reviews</h2>
      <div class="review">
        <p class="reviewer">AudioFan42 - Verified Purchase</p>
        <p class="review-rating">★★★★★</p>
        <p>Best headphones I've ever owned!</p>
      </div>
      <div class="review">
        <p class="reviewer">MusicLover - Verified Purchase</p>
        <p class="review-rating">★★★★☆</p>
        <p>Great sound, comfortable fit</p>
      </div>
    </section>

    <section class="related-products widget">
      <h3>Related Products</h3>
      <div class="product-grid">
        <div class="product-card">
          <a href="/products/earbuds">Wireless Earbuds - $149</a>
        </div>
        <div class="product-card">
          <a href="/products/speaker">Bluetooth Speaker - $199</a>
        </div>
      </div>
    </section>
  </aside>

  <footer class="store-footer footer">
    <div class="newsletter">
      <h4>Join our mailing list</h4>
      <input type="email" placeholder="Email">
      <button>Subscribe</button>
    </div>
    <nav class="footer-nav">
      <a href="/shipping">Shipping Info</a>
      <a href="/returns">Returns</a>
      <a href="/support">Support</a>
    </nav>
    <p class="copyright">&copy; 2024 Shop Example. All rights reserved.</p>
  </footer>
</body>
</html>
  `.trim(),

  expected: {
    mustContain: [
      'Premium Wireless Headphones Pro',
      'exceptional audio quality',
      'Active Noise Cancellation',
      'Forty hours of battery life',
      'memory foam ear cushions',
      'Bluetooth 5.3',
      'voice isolation technology',
      'forty millimeter drivers',
      'frequency response',
    ],
    mustNotContain: [
      'Cart (3)',
      'Search products',
      'Add to Cart',
      'Add to Wishlist',
      'Free Shipping',
      '30-Day Returns',
      'AudioFan42',
      'MusicLover',
      'Related Products',
      'Wireless Earbuds',
      'Join our mailing list',
      'All rights reserved',
    ],
    minLength: 600,
    maxLength: 3000,
  },

  metadata: {
    category: 'ecommerce',
    hasNavigation: true,
    hasFooter: true,
    hasSidebar: true,
  },
};
