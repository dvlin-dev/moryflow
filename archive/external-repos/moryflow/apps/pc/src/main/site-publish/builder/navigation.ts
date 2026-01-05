/**
 * [PROVIDES]: 导航树生成
 * [POS]: 从路由表生成导航树结构
 */

import type { NavItem, PageInfo } from './const.js'

/** 从路由表生成导航树 */
export function generateNavigation(pages: PageInfo[]): NavItem[] {
  const root: NavItem[] = []
  const dirMap = new Map<string, NavItem>()

  for (const page of pages) {
    const parts = page.route.split('/').filter(Boolean)

    if (parts.length === 0) {
      // 根页面
      root.push({
        title: page.title,
        path: page.route,
      })
      continue
    }

    // 确保父目录存在
    let currentPath = ''
    let currentLevel = root

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += '/' + parts[i]

      let dir = dirMap.get(currentPath)
      if (!dir) {
        dir = {
          title: parts[i],
          children: [],
        }
        dirMap.set(currentPath, dir)
        currentLevel.push(dir)
      }
      currentLevel = dir.children!
    }

    // 添加页面
    currentLevel.push({
      title: page.title,
      path: page.route,
    })
  }

  return root
}
