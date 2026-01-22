/**
 * [INPUT]: Request + Env（SITE_DOMAIN, SITE_BUCKET）
 * [OUTPUT]: Response（站点内容/状态页面/方法限制）
 * [POS]: moryflow.app 发布站点核心请求处理器（含方法过滤、元数据校验与状态页容错）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/domains-and-deployment.md 中的发布站点约定。
 */

import type { Env, SiteMeta, SiteStatus } from './types';
import { injectWatermark } from './watermark';
import { getContentType } from './mime';

const SITES_PREFIX = 'sites';
const ALLOWED_METHODS = ['GET', 'HEAD'] as const;
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, must-revalidate',
};
const SITE_STATUSES: SiteStatus[] = ['ACTIVE', 'OFFLINE', 'DELETED'];

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: ALLOWED_METHODS.join(', ') },
    });
  }

  const url = new URL(request.url);
  const hostname = url.hostname;

  if (hostname === env.SITE_DOMAIN) {
    const redirectUrl = `https://www.moryflow.com${url.pathname}${url.search}`;
    return Response.redirect(redirectUrl, 301);
  }

  const subdomain = extractSubdomain(hostname, env.SITE_DOMAIN);
  if (!subdomain) {
    return new Response('Invalid domain', { status: 400 });
  }

  const response = await handleSiteRequest(env, subdomain, url.pathname);
  if (method === 'HEAD') {
    return new Response(null, {
      status: response.status,
      headers: response.headers,
    });
  }
  return response;
}

type SiteMetaResult =
  | { status: 'missing'; meta: null }
  | { status: 'invalid'; meta: null }
  | { status: 'ok'; meta: SiteMeta };

async function handleSiteRequest(env: Env, subdomain: string, pathname: string): Promise<Response> {
  const metaResult = await getSiteMeta(env, subdomain);
  if (metaResult.status === 'missing') {
    return renderNotFound(subdomain, env.SITE_DOMAIN);
  }
  if (metaResult.status === 'invalid') {
    return renderOfflinePage(subdomain, env.SITE_DOMAIN);
  }
  const meta = metaResult.meta;

  if (meta.status === 'DELETED') return renderNotFound(subdomain, env.SITE_DOMAIN);
  if (meta.status === 'OFFLINE') return renderOfflinePage(subdomain, env.SITE_DOMAIN);

  if (meta.expiresAt) {
    const expiresAt = new Date(meta.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return renderOfflinePage(subdomain, env.SITE_DOMAIN);
    }
    if (expiresAt < new Date()) {
      return renderExpiredPage(subdomain, env.SITE_DOMAIN);
    }
  }

  const filePath = resolveFilePath(pathname, meta);
  if (!filePath) {
    return renderOfflinePage(subdomain, env.SITE_DOMAIN);
  }
  const objectKey = `${SITES_PREFIX}/${subdomain}/${filePath}`;
  const object = await env.SITE_BUCKET.get(objectKey);

  if (!object) {
    const notFoundObject = await env.SITE_BUCKET.get(`${SITES_PREFIX}/${subdomain}/404.html`);
    if (notFoundObject) {
      let content = await notFoundObject.text();
      if (meta.showWatermark) content = injectWatermark(content);
      return new Response(content, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...NO_STORE_HEADERS,
        },
      });
    }

    return new Response('Page not found', {
      status: 404,
      headers: NO_STORE_HEADERS,
    });
  }

  const contentType = getContentType(filePath);
  let body: ReadableStream | string = object.body;

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

function extractSubdomain(hostname: string, siteDomain: string): string | null {
  if (!hostname.endsWith(siteDomain)) return null;

  const subdomain = hostname.slice(0, hostname.length - siteDomain.length - 1);
  if (!subdomain || subdomain.includes('.')) return null;
  return subdomain;
}

async function getSiteMeta(env: Env, subdomain: string): Promise<SiteMetaResult> {
  const metaKey = `${SITES_PREFIX}/${subdomain}/_meta.json`;
  const object = await env.SITE_BUCKET.get(metaKey);
  if (!object) return { status: 'missing', meta: null };
  try {
    const meta = await object.json();
    if (!isSiteMeta(meta)) {
      return { status: 'invalid', meta: null };
    }
    return { status: 'ok', meta };
  } catch {
    return { status: 'invalid', meta: null };
  }
}

function resolveFilePath(pathname: string, meta: SiteMeta): string | null {
  if (pathname === '/') return 'index.html';

  let decodedPathname = '';
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  let path = decodedPathname.slice(1);

  if (path.endsWith('/')) path += 'index.html';

  if (!path.includes('.')) {
    const isRoute = meta.routes?.some((r) => r.path === `/${path}` || r.path === decodedPathname);
    if (isRoute) path += '/index.html';
  }

  return path;
}

function isSiteMeta(value: unknown): value is SiteMeta {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!SITE_STATUSES.includes(record.status as SiteStatus)) return false;
  if (
    'expiresAt' in record &&
    record.expiresAt !== undefined &&
    typeof record.expiresAt !== 'string'
  ) {
    return false;
  }
  if (
    'showWatermark' in record &&
    record.showWatermark !== undefined &&
    typeof record.showWatermark !== 'boolean'
  ) {
    return false;
  }
  if ('routes' in record && record.routes !== undefined) {
    if (!Array.isArray(record.routes)) return false;
    for (const route of record.routes) {
      if (!route || typeof route !== 'object') return false;
      const routeRecord = route as Record<string, unknown>;
      if (typeof routeRecord.path !== 'string') return false;
    }
  }
  return true;
}

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
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...NO_STORE_HEADERS,
    },
  });
}

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
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...NO_STORE_HEADERS,
    },
  });
}

function renderExpiredPage(subdomain: string, siteDomain: string): Response {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Expired</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 40px; max-width: 420px; }
    h1 { color: #333; margin-bottom: 16px; font-size: 24px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; padding: 12px 24px; background: #333; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
    a:hover { background: #555; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Site Expired</h1>
    <p>The site <strong>${subdomain}.${siteDomain}</strong> has expired.</p>
    <p>If you are the site owner, please renew your plan in Moryflow.</p>
    <a href="https://moryflow.com">Learn More</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...NO_STORE_HEADERS,
    },
  });
}
