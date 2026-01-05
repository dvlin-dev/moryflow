import path from 'node:path'
import type { VaultTreeNode } from '../../shared/ipc.js'
import { NODE_DIFF_THRESHOLD, type FsEventType } from './const.js'

type TreeSnapshot = Map<string, { mtime: number; type: 'file' | 'folder' }>
type ChangePlan =
  | { type: 'none' }
  | { type: 'full-refresh' }
  | { type: 'changes'; changes: Array<{ type: FsEventType; path: string }> }

const CHANGE_BATCH_THRESHOLD = 100

/** 根据展开的路径集合构造过滤函数，避免无关目录影响比对结果 */
const createShouldTraverse = (considerPaths: string[]) => {
  const considerSet = new Set(considerPaths.map((p) => path.resolve(p)))
  if (considerSet.size === 0) {
    return () => true
  }
  return (nodePath: string) => {
    for (const prefix of considerSet) {
      if (prefix.startsWith(nodePath) || nodePath.startsWith(prefix)) {
        return true
      }
    }
    return false
  }
}

/** 扁平化树结构，便于比对增量 */
const flattenSnapshot = (
  nodes: VaultTreeNode[],
  shouldTraverse: (nodePath: string) => boolean,
  acc: TreeSnapshot = new Map()
) => {
  for (const node of nodes) {
    if (!shouldTraverse(node.path)) {
      continue
    }
    acc.set(node.path, { mtime: node.mtime ?? 0, type: node.type })
    if (node.children?.length) {
      flattenSnapshot(node.children, shouldTraverse, acc)
    }
  }
  return acc
}

/** 对比缓存与最新树，输出需要触发的变更方案 */
export const buildTreeChangePlan = (params: {
  cachedNodes?: VaultTreeNode[]
  latestNodes: VaultTreeNode[]
  considerPaths: string[]
}): ChangePlan => {
  const { cachedNodes, latestNodes, considerPaths } = params
  const shouldTraverse = createShouldTraverse(considerPaths)
  const prev = cachedNodes ? flattenSnapshot(cachedNodes, shouldTraverse) : null
  const curr = flattenSnapshot(latestNodes, shouldTraverse)

  if (!prev) {
    return { type: 'full-refresh' }
  }

  if (prev.size + curr.size > NODE_DIFF_THRESHOLD) {
    return { type: 'full-refresh' }
  }

  const changes: Array<{ type: FsEventType; path: string }> = []

  for (const [nodePath, meta] of curr.entries()) {
    const prevMeta = prev.get(nodePath)
    if (!prevMeta) {
      changes.push({ type: meta.type === 'folder' ? 'dir-added' : 'file-added', path: nodePath })
      continue
    }
    if (meta.mtime !== prevMeta.mtime && meta.type === 'file') {
      changes.push({ type: 'file-changed', path: nodePath })
    }
  }

  for (const [nodePath, prevMeta] of prev.entries()) {
    if (curr.has(nodePath)) {
      continue
    }
    changes.push({
      type: prevMeta?.type === 'folder' ? 'dir-removed' : 'file-removed',
      path: nodePath
    })
  }

  if (changes.length === 0) {
    return { type: 'none' }
  }

  if (changes.length > CHANGE_BATCH_THRESHOLD) {
    return { type: 'full-refresh' }
  }

  return { type: 'changes', changes }
}

/** 仅保留当前 Vault 下的展开路径并做绝对化，避免漏报或误报 */
export const normalizeExpandedPaths = (vaultRoot: string, paths: string[]) =>
  new Set(
    paths
      .map((p) => path.resolve(p))
      .filter((p) => p.startsWith(vaultRoot))
  )
