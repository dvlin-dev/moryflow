/**
 * Search 页面工具函数
 */

import type { RecentlyOpenedItem } from '@/lib/vault/recently-opened'
import type { SearchResultItem, GroupedSection } from './const'

// ============================================================
// 数据转换
// ============================================================

/** 将 RecentlyOpenedItem 转换为 SearchResultItem */
export function toSearchResults(items: RecentlyOpenedItem[]): SearchResultItem[] {
  return items.map((item) => ({
    path: item.path,
    fileId: item.fileId,
    name: item.title,
    openedAt: item.openedAt,
    type: 'file' as const,
  }))
}

// ============================================================
// 搜索过滤
// ============================================================

/** 按关键词过滤（文件名匹配） */
export function filterByQuery(items: SearchResultItem[], query: string): SearchResultItem[] {
  if (!query.trim()) return items

  const lowerQuery = query.toLowerCase()
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery))
}

// ============================================================
// 时间分组
// ============================================================

/** 按时间分组 */
export function groupByTime(items: SearchResultItem[]): GroupedSection[] {
  const now = Date.now()
  const groups = new Map<string, SearchResultItem[]>()

  for (const item of items) {
    const groupKey = getTimeGroupKey(item.openedAt, now)
    const existing = groups.get(groupKey) || []
    groups.set(groupKey, [...existing, item])
  }

  // 按分组顺序排序
  const ORDER = ['今天', '昨天', '本周', '本月']
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const indexA = ORDER.indexOf(a)
      const indexB = ORDER.indexOf(b)
      // 已知分组按顺序，未知分组（月份）按字符串排序放后面
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return b.localeCompare(a) // 月份倒序（新的在前）
    })
    .map(([title, data]) => ({ title, data }))
}

/** 获取时间分组 key */
function getTimeGroupKey(timestamp: number, now: number): string {
  const date = new Date(timestamp)
  const today = new Date(now)

  // 今天
  if (isSameDay(date, today)) return '今天'

  // 昨天
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return '昨天'

  // 本周（7天内）
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (date > weekAgo) return '本周'

  // 本月
  if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
    return '本月'
  }

  // 更早 - 显示月份
  return formatMonthYear(date)
}

/** 判断是否同一天 */
function isSameDay(d1: Date, d2: Date): boolean {
  return d1.toDateString() === d2.toDateString()
}

/** 格式化月份年份 */
function formatMonthYear(date: Date): string {
  const months = [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

// ============================================================
// 相对时间格式化
// ============================================================

/** 格式化相对时间 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`

  // 超过一周显示日期
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const dayOfMonth = date.getDate()
  return `${month}月${dayOfMonth}日`
}
