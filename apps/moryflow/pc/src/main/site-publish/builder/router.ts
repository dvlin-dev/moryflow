/**
 * [PROVIDES]: 路由生成
 * [POS]: 从文件列表生成路由表
 */

import * as path from 'path'
import type { FileInfo, PageInfo } from './const.js'

/** 从文件列表生成路由表 */
export function generateRoutes(files: FileInfo[], basePath: string): PageInfo[] {
  const pages: PageInfo[] = []

  // 如果只有一个文件，强制作为首页
  const singleFile = files.length === 1

  for (const file of files) {
    // 计算相对路径
    const relPath = path.relative(basePath, file.absolutePath)
    const dir = path.dirname(relPath)
    const name = path.basename(relPath, path.extname(relPath))

    // 生成路由路径
    let route: string
    if (
      singleFile ||
      name.toLowerCase() === 'index' ||
      name.toLowerCase() === 'readme'
    ) {
      // 单文件或 index.md/README.md 作为目录首页
      route = dir === '.' ? '/' : `/${dir.replace(/\\/g, '/')}`
    } else {
      route = dir === '.' ? `/${name}` : `/${dir.replace(/\\/g, '/')}/${name}`
    }

    // 输出路径
    const outputPath = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`

    pages.push({
      sourcePath: file.absolutePath,
      outputPath,
      title: name,
      route,
    })
  }

  // 按路由排序
  pages.sort((a, b) => a.route.localeCompare(b.route))

  return pages
}
