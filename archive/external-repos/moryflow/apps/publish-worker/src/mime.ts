/**
 * MIME 类型工具
 */

/** 常见文件扩展名到 MIME 类型的映射 */
const MIME_TYPES: Record<string, string> = {
  // HTML
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',

  // CSS
  '.css': 'text/css; charset=utf-8',

  // JavaScript
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',

  // JSON
  '.json': 'application/json; charset=utf-8',

  // 图片
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',

  // 字体
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',

  // 其他
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.webmanifest': 'application/manifest+json',
};

/**
 * 根据文件路径获取 Content-Type
 */
export function getContentType(filePath: string): string {
  const ext = getExtension(filePath);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * 获取文件扩展名（小写）
 */
function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filePath.slice(lastDot).toLowerCase();
}
