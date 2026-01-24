/**
 * [PROVIDES]: 动态 robots.txt 输出
 * [DEPENDS]: 无
 * [POS]: 官网 SEO 路由（爬虫规则）
 */

import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://www.moryflow.com/sitemap.xml

# Disallowed paths
Disallow: /api/
Disallow: /_server/
`;
  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain' },
  });
});
