/**
 * [INPUT]: 源文件路径列表
 * [OUTPUT]: 构建好的站点文件（HTML + assets）
 * [POS]: 站点构建器入口
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { renderFileToHtml, extractLocalImages, replaceImagePaths } from '../renderer/index.js';
import type { FileInfo, BuildResult, BuildOptions, BuildProgressEvent } from './const.js';
import { SUPPORTED_EXTENSIONS } from './const.js';
import { scanDirectory, computeFileHash } from './scanner.js';
import { generateRoutes } from './router.js';
import { generateNavigation } from './navigation.js';
import { generateIndexPage, generate404Page } from './pages.js';
import { readImageAsBase64 } from './image.js';
import { FAVICON_ICO } from '../template/index.js';

// 导出子模块
export type { BuildResult, BuildOptions, FileInfo } from './const.js';
export { scanDirectory, computeFileHash } from './scanner.js';
export { generateRoutes } from './router.js';
export { generateNavigation } from './navigation.js';

/** 找到多个文件路径的公共父目录 */
function findCommonBasePath(filePaths: string[]): string {
  if (filePaths.length === 0) return '';
  if (filePaths.length === 1) return path.dirname(filePaths[0]);

  // 将所有路径拆分为目录数组
  const splitPaths = filePaths.map((p) => path.dirname(p).split(path.sep));

  // 找到最短的路径长度
  const minLength = Math.min(...splitPaths.map((p) => p.length));

  // 逐级比较，找到公共前缀
  const commonParts: string[] = [];
  for (let i = 0; i < minLength; i++) {
    const part = splitPaths[0][i];
    if (splitPaths.every((p) => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  return commonParts.join(path.sep) || path.sep;
}

/** 构建站点 */
export async function buildSite(
  sourcePaths: string[],
  options: BuildOptions = {}
): Promise<BuildResult> {
  const { siteTitle, description, lang, onProgress } = options;
  const files: BuildResult['files'] = [];
  const publishPages: BuildResult['pages'] = [];
  const imageMap = new Map<string, string>(); // 原始路径 -> 发布路径
  const processedImages = new Set<string>();
  const resolvedLang = lang?.trim() || 'en';
  const resolvedDescription = description?.trim() || siteTitle || '';

  // 通知进度
  const notify = (
    phase: BuildProgressEvent['phase'],
    current: number,
    total: number,
    message: string
  ) => {
    onProgress?.({ phase, current, total, message });
  };

  // 1. 扫描阶段
  notify('scanning', 0, 0, '正在扫描文件...');

  const allFiles: FileInfo[] = [];

  for (const sourcePath of sourcePaths) {
    const stat = await fs.stat(sourcePath);
    if (stat.isDirectory()) {
      const dirFiles = await scanDirectory(sourcePath);
      allFiles.push(...dirFiles);
    } else if (SUPPORTED_EXTENSIONS.includes(path.extname(sourcePath).toLowerCase())) {
      allFiles.push({
        absolutePath: sourcePath,
        relativePath: path.basename(sourcePath),
        name: path.basename(sourcePath, path.extname(sourcePath)),
        isDirectory: false,
      });
    }
  }

  if (allFiles.length === 0) {
    throw new Error('没有找到可发布的 Markdown 文件');
  }

  // 确定基础路径（找到所有文件的公共父目录）
  const basePath = findCommonBasePath(allFiles.map((f) => f.absolutePath));

  // 生成路由
  const pages = generateRoutes(allFiles, basePath);
  const navigation = generateNavigation(pages);

  notify('scanning', 1, 1, `找到 ${allFiles.length} 个文件`);

  // 2. 渲染阶段
  notify('rendering', 0, pages.length, '正在渲染页面...');

  // 先收集所有图片
  for (const page of pages) {
    const content = await fs.readFile(page.sourcePath, 'utf-8');
    const images = extractLocalImages(content, path.dirname(page.sourcePath));

    for (const imagePath of images) {
      if (!processedImages.has(imagePath)) {
        processedImages.add(imagePath);
        // 生成图片的发布路径
        const ext = path.extname(imagePath);
        const hash = await computeFileHash(imagePath);
        const publishPath = `assets/images/${hash}${ext}`;
        imageMap.set(imagePath, '/' + publishPath);
      }
    }
  }

  // 处理图片文件
  for (const [originalPath, publishPath] of imageMap) {
    const imageData = await readImageAsBase64(originalPath);
    if (imageData) {
      files.push({
        path: publishPath.slice(1), // 移除开头的 /
        content: imageData.content,
        contentType: imageData.contentType,
      });
    }
  }

  // 渲染每个页面
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    notify('rendering', i + 1, pages.length, `渲染: ${page.title}`);

    try {
      // 读取并替换图片路径
      let content = await fs.readFile(page.sourcePath, 'utf-8');
      content = replaceImagePaths(content, imageMap, path.dirname(page.sourcePath));

      // 渲染 HTML（传入预处理的内容，避免重复读取）
      const { html, title: pageTitle } = await renderFileToHtml(page.sourcePath, {
        content,
        siteTitle: siteTitle || page.title,
        navigation,
        currentPath: page.route,
      });

      // 计算文件 hash
      const fileHash = await computeFileHash(page.sourcePath);

      files.push({
        path: page.outputPath,
        content: Buffer.from(html, 'utf-8').toString('base64'),
        contentType: 'text/html',
      });

      publishPages.push({
        path: page.route,
        title: pageTitle,
        localFilePath: page.sourcePath,
        localFileHash: fileHash,
      });
    } catch (error) {
      console.error(`渲染失败: ${page.sourcePath}`, error);
      throw new Error(
        `渲染 ${page.title} 失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  // 检查是否有根路由，没有则生成目录页
  const hasRootPage = publishPages.some((p) => p.path === '/');
  if (!hasRootPage && publishPages.length > 0) {
    const indexHtml = generateIndexPage(siteTitle || '站点', publishPages, navigation, {
      lang: resolvedLang,
      description: resolvedDescription,
    });
    files.push({
      path: 'index.html',
      content: Buffer.from(indexHtml, 'utf-8').toString('base64'),
      contentType: 'text/html',
    });
  }

  // 生成 404 页面
  const notFoundHtml = generate404Page(siteTitle || '站点', {
    lang: resolvedLang,
    description: resolvedDescription,
  });
  files.push({
    path: '404.html',
    content: Buffer.from(notFoundHtml, 'utf-8').toString('base64'),
    contentType: 'text/html',
  });

  // 添加 favicon.ico
  if (FAVICON_ICO) {
    files.push({
      path: 'favicon.ico',
      content: FAVICON_ICO,
      contentType: 'image/x-icon',
    });
  }

  notify('done', pages.length, pages.length, '构建完成');

  return { files, pages: publishPages, navigation };
}

/** 检测源文件是否有变更 */
export async function detectChanges(
  sourcePaths: string[],
  lastHashes: Record<string, string>
): Promise<{
  hasChanges: boolean;
  changedFiles: string[];
}> {
  const changedFiles: string[] = [];

  for (const sourcePath of sourcePaths) {
    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) {
      const files = await scanDirectory(sourcePath);
      for (const file of files) {
        const currentHash = await computeFileHash(file.absolutePath);
        const lastHash = lastHashes[file.absolutePath];
        if (currentHash !== lastHash) {
          changedFiles.push(file.absolutePath);
        }
      }
    } else {
      const currentHash = await computeFileHash(sourcePath);
      const lastHash = lastHashes[sourcePath];
      if (currentHash !== lastHash) {
        changedFiles.push(sourcePath);
      }
    }
  }

  return {
    hasChanges: changedFiles.length > 0,
    changedFiles,
  };
}
