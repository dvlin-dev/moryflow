/**
 * [PROVIDES]: 图片路径提取和替换
 * [POS]: 处理 Markdown 中的本地图片引用
 */

import * as path from 'path'

/** 提取 Markdown 中的本地图片引用 */
export function extractLocalImages(content: string, basePath: string): string[] {
  const images: string[] = []
  // Markdown 图片语法: ![alt](path)
  const mdImageRegex = /!\[.*?\]\(([^)]+)\)/g
  // HTML img 标签
  const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/g

  let match
  while ((match = mdImageRegex.exec(content)) !== null) {
    const src = match[1]
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      const absolutePath = path.resolve(basePath, src)
      images.push(absolutePath)
    }
  }

  while ((match = htmlImageRegex.exec(content)) !== null) {
    const src = match[1]
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      const absolutePath = path.resolve(basePath, src)
      images.push(absolutePath)
    }
  }

  return images
}

/** 替换 Markdown 中的本地图片路径为发布路径 */
export function replaceImagePaths(
  content: string,
  imageMap: Map<string, string>,
  basePath: string,
): string {
  // 替换 Markdown 图片
  let result = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return match
    }
    const absolutePath = path.resolve(basePath, src)
    const newPath = imageMap.get(absolutePath)
    return newPath ? `![${alt}](${newPath})` : match
  })

  // 替换 HTML img 标签
  result = result.replace(/<img([^>]+)src=["']([^"']+)["']/g, (match, attrs, src) => {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return match
    }
    const absolutePath = path.resolve(basePath, src)
    const newPath = imageMap.get(absolutePath)
    return newPath ? `<img${attrs}src="${newPath}"` : match
  })

  return result
}
