import path from 'node:path'
import { stat } from 'node:fs/promises'

export const normalizeRelativePath = (root: string, target: string) => {
  const relative = path.relative(root, target) || path.basename(target)
  return relative.split(path.sep).join('/')
}

export const toDisplayName = (entryName: string, isFile: boolean) => {
  if (!isFile) return entryName
  return entryName.replace(/\.md$/i, '')
}

export const isMarkdownFile = (entryName: string) => entryName.toLowerCase().endsWith('.md')

export const sanitizeSegment = (value: string) => value.trim().replace(/[\\/]+/g, '')

export const ensureMarkdownName = (value: string) =>
  value.toLowerCase().endsWith('.md') ? value : `${value}.md`

export const assertDirectory = async (dirPath: string) => {
  const stats = await stat(dirPath)
  if (!stats.isDirectory()) {
    throw new Error('目标路径不是有效的目录')
  }
  return stats
}
