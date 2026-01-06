/**
 * MIME 类型工具函数
 */
import mime from 'mime-types';
import path from 'path';

/** 默认 MIME 类型 */
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/**
 * 根据文件路径推断 MIME 类型
 */
export function getMimeType(filePath: string): string {
  return mime.lookup(filePath) || DEFAULT_CONTENT_TYPE;
}

/**
 * 从文件路径提取文件名
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * 生成 Content-Disposition 头（支持 UTF-8 文件名）
 * 遵循 RFC 5987 编码规范
 */
export function getContentDisposition(filename: string): string {
  const encodedFilename = encodeURIComponent(filename).replace(
    /['()]/g,
    escape,
  );
  return `attachment; filename*=UTF-8''${encodedFilename}`;
}
