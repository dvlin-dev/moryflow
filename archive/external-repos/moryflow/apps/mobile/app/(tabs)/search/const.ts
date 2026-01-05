/**
 * Search 页面类型定义
 */

/** 搜索结果项 */
export interface SearchResultItem {
  path: string
  fileId: string
  name: string
  openedAt: number
  type: 'file' | 'folder'
}

/** 分组结果 */
export interface GroupedSection {
  title: string
  data: SearchResultItem[]
}
