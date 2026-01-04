import Store from 'electron-store'

/** 打开的标签页信息（持久化用） */
export type PersistedTab = {
  id: string
  name: string
  path: string
  pinned?: boolean
}

type WorkspaceState = {
  expandedPaths: Record<string, string[]>
  /** 最后打开的文件路径（按 Vault） */
  lastOpenedFile: Record<string, string | null>
  /** 打开的标签页列表（按 Vault） */
  openTabs: Record<string, PersistedTab[]>
}

const workspaceStore = new Store<WorkspaceState>({
  name: 'workspace',
  defaults: {
    expandedPaths: {},
    lastOpenedFile: {},
    openTabs: {}
  }
})

export const getExpandedPaths = (vaultPath: string): string[] => {
  const bucket = workspaceStore.get('expandedPaths')
  if (!bucket || typeof bucket !== 'object') {
    return []
  }
  return bucket[vaultPath] ?? []
}

export const setExpandedPaths = (vaultPath: string, paths: string[]) => {
  const bucket = workspaceStore.get('expandedPaths')
  const next = { ...(bucket ?? {}), [vaultPath]: paths }
  workspaceStore.set('expandedPaths', next)
}

// ============ 最后打开的文件 ============

export const getLastOpenedFile = (vaultPath: string): string | null => {
  const bucket = workspaceStore.get('lastOpenedFile')
  if (!bucket || typeof bucket !== 'object') {
    return null
  }
  return bucket[vaultPath] ?? null
}

export const setLastOpenedFile = (vaultPath: string, filePath: string | null) => {
  const bucket = workspaceStore.get('lastOpenedFile')
  const next = { ...(bucket ?? {}), [vaultPath]: filePath }
  workspaceStore.set('lastOpenedFile', next)
}

// ============ 打开的标签页 ============

export const getOpenTabs = (vaultPath: string): PersistedTab[] => {
  const bucket = workspaceStore.get('openTabs')
  if (!bucket || typeof bucket !== 'object') {
    return []
  }
  return bucket[vaultPath] ?? []
}

export const setOpenTabs = (vaultPath: string, tabs: PersistedTab[]) => {
  const bucket = workspaceStore.get('openTabs')
  const next = { ...(bucket ?? {}), [vaultPath]: tabs }
  workspaceStore.set('openTabs', next)
}
