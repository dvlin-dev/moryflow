/**
 * [PROVIDES]: flattenTree, fuzzySearch - 文件树扁平化和模糊搜索
 * [DEPENDS]: VaultTreeNode
 * [POS]: 搜索对话框工具函数
 */

import type { VaultTreeNode } from '@shared/ipc'
import type { SearchResultItem } from './const'

/**
 * 递归扁平化文件树，只保留文件（排除文件夹）
 */
export const flattenTree = (
  nodes: VaultTreeNode[],
  parentPath = ''
): SearchResultItem[] => {
  const results: SearchResultItem[] = []

  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.type === 'file') {
      results.push({
        node,
        relativePath: parentPath,
        score: 0,
      })
    }

    if (node.children) {
      results.push(...flattenTree(node.children, currentPath))
    }
  }

  return results
}

/**
 * 简单模糊匹配算法
 * 返回匹配得分，-1 表示不匹配
 */
const fuzzyMatch = (query: string, target: string): number => {
  const queryLower = query.toLowerCase()
  const targetLower = target.toLowerCase()

  // 完全匹配得分最高
  if (targetLower === queryLower) return 100

  // 前缀匹配得分次高
  if (targetLower.startsWith(queryLower)) return 80

  // 包含匹配
  if (targetLower.includes(queryLower)) return 60

  // 字符顺序匹配（模糊匹配）
  let queryIndex = 0
  let score = 0
  let consecutiveBonus = 0

  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      score += 10 + consecutiveBonus
      consecutiveBonus += 5 // 连续匹配加分
      queryIndex++
    } else {
      consecutiveBonus = 0
    }
  }

  // 如果所有查询字符都匹配了，返回得分
  if (queryIndex === queryLower.length) {
    return score
  }

  return -1
}

/**
 * 模糊搜索文件
 * @param items 扁平化的文件列表
 * @param query 搜索关键词
 * @returns 匹配的结果，按得分降序排列
 */
export const fuzzySearch = (
  items: SearchResultItem[],
  query: string
): SearchResultItem[] => {
  if (!query.trim()) return []

  const results: SearchResultItem[] = []

  for (const item of items) {
    // 移除 .md 后缀进行匹配
    const nameWithoutExt = item.node.name.replace(/\.md$/i, '')
    const score = fuzzyMatch(query, nameWithoutExt)

    if (score > 0) {
      results.push({
        ...item,
        score,
      })
    }
  }

  // 按得分降序排列
  return results.sort((a, b) => b.score - a.score)
}

/**
 * 格式化显示名称（移除 .md 后缀）
 */
export const formatDisplayName = (name: string): string => {
  return name.replace(/\.md$/i, '')
}
