/**
 * [PROVIDES]: getContentType(path)
 * [DEPENDS]: 无
 * [POS]: 根据文件后缀生成 Content-Type
 *
 * [PROTOCOL]: 本文件变更时，需验证常见静态资源类型是否覆盖完整。
 */

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export function getContentType(path: string): string {
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';

  const ext = path.slice(dotIndex).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

