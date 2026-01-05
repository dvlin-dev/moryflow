/**
 * 请求处理器
 */

import type { Env, SiteMeta } from './types';
import { injectWatermark } from './watermark';
import { getContentType } from './mime';

/** R2 文件路径前缀 */
const SITES_PREFIX = 'sites';

/**
 * 主请求处理函数
 */
export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // 根域名访问，重定向到主站
  if (hostname === env.SITE_DOMAIN) {
    const redirectUrl = `https://moryflow.com${url.pathname}${url.search}`;
    return Response.redirect(redirectUrl, 301);
  }

  // 解析 subdomain
  const subdomain = extractSubdomain(hostname, env.SITE_DOMAIN);
  if (!subdomain) {
    return new Response('Invalid domain', { status: 400 });
  }

  return handleSiteRequest(env, subdomain, url.pathname);
}

/**
 * 处理站点请求
 */
async function handleSiteRequest(
  env: Env,
  subdomain: string,
  pathname: string,
): Promise<Response> {
  // 1. 读取站点元数据
  const meta = await getSiteMeta(env, subdomain);
  if (!meta) {
    return renderNotFound(subdomain, env.SITE_DOMAIN);
  }

  // 2. 检查站点状态
  if (meta.status === 'DELETED') {
    return renderNotFound(subdomain, env.SITE_DOMAIN);
  }
  if (meta.status === 'OFFLINE') {
    return renderOfflinePage(subdomain, env.SITE_DOMAIN);
  }

  // 3. 检查站点是否过期
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    return renderExpiredPage(subdomain, env.SITE_DOMAIN);
  }

  // 4. 解析文件路径
  const filePath = resolveFilePath(pathname, meta);

  // 5. 从 R2 读取文件
  const objectKey = `${SITES_PREFIX}/${subdomain}/${filePath}`;
  const object = await env.SITE_BUCKET.get(objectKey);

  if (!object) {
    // 尝试读取 404.html
    const notFoundObject = await env.SITE_BUCKET.get(`${SITES_PREFIX}/${subdomain}/404.html`);
    if (notFoundObject) {
      let content = await notFoundObject.text();
      if (meta.showWatermark) {
        content = injectWatermark(content);
      }
      return new Response(content, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('Page not found', { status: 404 });
  }

  // 6. 处理响应
  const contentType = getContentType(filePath);
  let body: ReadableStream | string = object.body;

  // 对 HTML 注入水印
  if (meta.showWatermark && contentType.startsWith('text/html')) {
    const content = await object.text();
    body = injectWatermark(content);
  }

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Subdomain': subdomain,
    },
  });
}

/**
 * 从域名中提取 subdomain
 */
function extractSubdomain(hostname: string, siteDomain: string): string | null {
  // hostname: john.moryflow.app
  // siteDomain: moryflow.app
  if (!hostname.endsWith(siteDomain)) {
    return null;
  }

  const subdomain = hostname.slice(0, hostname.length - siteDomain.length - 1);
  if (!subdomain || subdomain.includes('.')) {
    return null;
  }

  return subdomain;
}

/**
 * 获取站点元数据
 */
async function getSiteMeta(env: Env, subdomain: string): Promise<SiteMeta | null> {
  const metaKey = `${SITES_PREFIX}/${subdomain}/_meta.json`;
  const object = await env.SITE_BUCKET.get(metaKey);

  if (!object) {
    return null;
  }

  return object.json();
}

/**
 * 解析文件路径
 */
function resolveFilePath(pathname: string, meta: SiteMeta): string {
  // 根路径
  if (pathname === '/') {
    return 'index.html';
  }

  // 解码 URL（浏览器会对中文等字符进行编码）
  const decodedPathname = decodeURIComponent(pathname);

  // 移除开头的斜杠
  let path = decodedPathname.slice(1);

  // 如果路径以 / 结尾，添加 index.html
  if (path.endsWith('/')) {
    path += 'index.html';
  }

  // 如果没有扩展名，尝试添加 /index.html
  if (!path.includes('.')) {
    // 检查是否是已知路由（使用解码后的路径比较）
    const isRoute = meta.routes?.some((r) => r.path === `/${path}` || r.path === decodedPathname);
    if (isRoute) {
      path += '/index.html';
    }
  }

  return path;
}

/**
 * 渲染 404 页面
 */
function renderNotFound(subdomain: string, siteDomain: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Site Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 40px; }
    h1 { color: #333; margin-bottom: 16px; }
    p { color: #666; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Site Not Found</h1>
    <p>The site <strong>${subdomain}.${siteDomain}</strong> does not exist or has been removed.</p>
    <p><a href="https://moryflow.com">Create your own site with Moryflow</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * 渲染站点下线页面
 */
function renderOfflinePage(subdomain: string, siteDomain: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Offline</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #333; margin-bottom: 16px; font-size: 24px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
    a:hover { background: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>Site Offline</h1>
    <p>The site <strong>${subdomain}.${siteDomain}</strong> is currently offline.</p>
    <p>The site owner has temporarily taken this site offline.</p>
    <a href="https://moryflow.com">Learn More</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * 渲染站点过期页面
 */
function renderExpiredPage(subdomain: string, siteDomain: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Expired</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #333; margin-bottom: 16px; font-size: 24px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
    a:hover { background: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⏰</div>
    <h1>Site Expired</h1>
    <p>The site <strong>${subdomain}.${siteDomain}</strong> has exceeded the free retention period.</p>
    <p>The site owner can upgrade to a paid plan to restore access.</p>
    <a href="https://moryflow.com">Learn More</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
