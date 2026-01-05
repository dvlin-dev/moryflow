import { fileExists, createDirectory } from '@/lib/vault'

/**
 * 格式化时间差为人类可读文本
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 10) return '刚刚保存'
  if (diffSeconds < 60) return `${diffSeconds} 秒前保存`
  if (diffMinutes < 60) return `${diffMinutes} 分钟前保存`
  if (diffHours < 24) return `${diffHours} 小时前保存`
  return '超过一天前保存'
}

/**
 * 生成草稿文件名
 * 格式：mm-dd-hhmm，如 12-18-0104
 * 冲突时添加两位随机数，如 12-18-0104-14
 */
export async function generateDraftFileName(): Promise<string> {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')

  const baseName = `${mm}-${dd}-${hh}${min}`

  // 检查是否冲突
  if (!(await fileExists(`drafts/${baseName}.md`))) {
    return baseName
  }

  // 冲突时添加两位随机数
  const randomSuffix = Math.floor(Math.random() * 90 + 10).toString()
  return `${baseName}-${randomSuffix}`
}

/**
 * 确保 drafts 目录存在
 */
export async function ensureDraftsDirectory(): Promise<void> {
  if (!(await fileExists('drafts'))) {
    await createDirectory('drafts')
  }
}
