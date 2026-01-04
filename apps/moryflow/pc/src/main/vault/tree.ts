import path from 'node:path'
import { readdir, stat } from 'node:fs/promises'

import type { VaultTreeNode } from '../../shared/ipc.js'

import { readTreeSchema } from './const.js'
import { ensureVaultAccess, ensureWithinVault } from './context.js'
import { assertDirectory, isMarkdownFile, normalizeRelativePath, toDisplayName } from './path-utils.js'

const readDirectory = async (
  dirPath: string,
  root: string,
  options?: { depth?: number }
): Promise<VaultTreeNode[]> => {
  const depth = options?.depth ?? Infinity
  const entries = await readdir(dirPath, { withFileTypes: true })

  const nodes: Array<VaultTreeNode | null> = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith('.')) return null

      const fullPath = path.join(dirPath, entry.name)
      const stats = await stat(fullPath)

      if (entry.isDirectory()) {
        // depth <= 0 时不再递归，仅标记是否有子项
        if (depth <= 0) {
          const childEntries = await readdir(fullPath, { withFileTypes: true })
          const hasChildren = childEntries.some(
            (child) =>
              !child.name.startsWith('.') &&
              (child.isDirectory() || (child.isFile() && isMarkdownFile(child.name)))
          )
          return {
            id: normalizeRelativePath(root, fullPath),
            name: toDisplayName(entry.name, false),
            type: 'folder' as const,
            path: fullPath,
            mtime: stats.mtimeMs,
            hasChildren
          }
        }

        const children = await readDirectory(fullPath, root, { depth: depth - 1 })
        return {
          id: normalizeRelativePath(root, fullPath),
          name: toDisplayName(entry.name, false),
          type: 'folder' as const,
          path: fullPath,
          mtime: stats.mtimeMs,
          children,
          hasChildren: children.length > 0
        }
      }

      if (!entry.isFile() || !isMarkdownFile(entry.name)) {
        return null
      }

      return {
        id: normalizeRelativePath(root, fullPath),
        name: toDisplayName(entry.name, true),
        type: 'file' as const,
        path: fullPath,
        mtime: stats.mtimeMs
      }
    })
  )

  return nodes
    .filter((node): node is VaultTreeNode => node !== null)
    .sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, 'zh-CN')
      }
      return a.type === 'folder' ? -1 : 1
    })
}

export const readVaultTree = async (rawPayload: { path: string }): Promise<VaultTreeNode[]> => {
  const payload = readTreeSchema.parse(rawPayload)
  await ensureVaultAccess(payload.path)
  await assertDirectory(payload.path)
  return readDirectory(payload.path, payload.path)
}

export const readVaultTreeRoot = async (rawPayload: { path: string }): Promise<VaultTreeNode[]> => {
  const payload = readTreeSchema.parse(rawPayload)
  await ensureVaultAccess(payload.path)
  await assertDirectory(payload.path)
  return readDirectory(payload.path, payload.path, { depth: 0 })
}

export const readVaultTreeChildren = async (rawPayload: { path: string }): Promise<VaultTreeNode[]> => {
  const payload = readTreeSchema.parse(rawPayload)
  const { resolvedTarget, vaultRoot } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  await assertDirectory(resolvedTarget)
  return readDirectory(resolvedTarget, vaultRoot, { depth: 0 })
}
