export type VaultInfo = {
  path: string
}

/** 多 Vault 支持：Vault 项目 */
export type VaultItem = {
  /** 唯一标识，使用 UUID */
  id: string
  /** 本地路径 */
  path: string
  /** 显示名称 */
  name: string
  /** 添加时间 */
  addedAt: number
}

export type VaultOpenOptions = {
  askUser?: boolean
}

export type VaultCreateOptions = {
  name: string
  parentPath: string
}

export type VaultTreeNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  mtime?: number
  children?: VaultTreeNode[]
  /**
   * 懒加载模式下用于提示是否存在子节点，非文件夹可不填。
   */
  hasChildren?: boolean
}

export type VaultFsEvent = {
  type: 'file-added' | 'file-changed' | 'file-removed' | 'dir-added' | 'dir-removed'
  path: string
}
