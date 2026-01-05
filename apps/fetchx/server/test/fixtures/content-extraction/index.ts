// test/fixtures/content-extraction/index.ts
export * from './golden.schema';
export { minimalisticLandingFixture } from './sites/minimalistic-landing.fixture';
export { blogArticleFixture } from './sites/blog-article.fixture';
export { documentationFixture } from './sites/documentation.fixture';
export { spaPageFixture } from './sites/spa-page.fixture';
export { newsWithAdsFixture } from './sites/news-with-ads.fixture';
export { ecommerceProductFixture } from './sites/ecommerce-product.fixture';
export { portfolioPageFixture } from './sites/portfolio-page.fixture';

import { minimalisticLandingFixture } from './sites/minimalistic-landing.fixture';
import { blogArticleFixture } from './sites/blog-article.fixture';
import { documentationFixture } from './sites/documentation.fixture';
import { spaPageFixture } from './sites/spa-page.fixture';
import { newsWithAdsFixture } from './sites/news-with-ads.fixture';
import { ecommerceProductFixture } from './sites/ecommerce-product.fixture';
import { portfolioPageFixture } from './sites/portfolio-page.fixture';
import type { ContentFixture } from './golden.schema';

/**
 * All available content extraction fixtures
 */
export const allFixtures: ContentFixture[] = [
  minimalisticLandingFixture,
  blogArticleFixture,
  documentationFixture,
  spaPageFixture,
  newsWithAdsFixture,
  ecommerceProductFixture,
  portfolioPageFixture,
];
