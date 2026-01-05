import Store from 'electron-store'
import type { VaultTreeNode } from '../shared/ipc.js'

type TreeCacheEntry = {
  capturedAt: number
  nodes: VaultTreeNode[]
}

const store = new Store<{ treeCache: Record<string, TreeCacheEntry> }>({
  name: 'workspace',
  defaults: {
    treeCache: {}
  }
})

export const getTreeCache = (vaultPath: string): TreeCacheEntry | null => {
  const cache = store.get('treeCache')
  if (!cache || typeof cache !== 'object') {
    return null
  }
  return cache[vaultPath] ?? null
}

export const setTreeCache = (vaultPath: string, nodes: VaultTreeNode[]) => {
  const cache = store.get('treeCache') ?? {}
  cache[vaultPath] = {
    capturedAt: Date.now(),
    nodes
  }
  store.set('treeCache', cache)
}
