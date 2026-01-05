/**
 * [DEFINES]: SearchDialog 类型定义
 * [USED_BY]: search-dialog/index.tsx, search-dialog/helper.ts
 * [POS]: 搜索对话框类型定义
 */

import type { VaultTreeNode } from '@shared/ipc'

/** 搜索对话框 Props */
export type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 文件树数据 */
  tree: VaultTreeNode[]
  /** 选择文件回调 */
  onSelectFile: (node: VaultTreeNode) => void
}

/** 搜索结果项 */
export type SearchResultItem = {
  /** 文件节点 */
  node: VaultTreeNode
  /** 相对路径（不含文件名） */
  relativePath: string
  /** 匹配得分（用于排序） */
  score: number
}
