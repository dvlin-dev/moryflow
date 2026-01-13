/**
 * [PROVIDES]: 内容转换工具（Mobile 特化）
 * [DEPENDS]: @aiget/tiptap
 * [POS]: Mobile 端内容处理，扩展 tiptap 的 markdown 转换功能
 */

// 复用 tiptap 包的核心转换函数
export { markdownToHtml, htmlToMarkdown } from '@aiget/tiptap';

/**
 * 规范化 Markdown
 * 处理移动端特殊情况（如图片路径）
 */
export function normalizeMarkdown(
  markdown: string,
  options?: {
    /** 图片基础路径 */
    imageBasePath?: string;
  }
): string {
  if (!markdown) return '';

  let result = markdown;

  // 处理图片路径：将相对路径转换为绝对路径
  if (options?.imageBasePath) {
    result = result.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      (_, alt, src) => `![${alt}](${options.imageBasePath}/${src})`
    );
  }

  return result;
}

/**
 * 提取 Markdown 中的图片路径
 */
export function extractImagePaths(markdown: string): string[] {
  if (!markdown) return [];

  const regex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const paths: string[] = [];
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    paths.push(match[1]);
  }

  return paths;
}
