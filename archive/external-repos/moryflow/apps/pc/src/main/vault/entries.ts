import { shell } from 'electron'
import path from 'node:path'
import { rename, rm, stat } from 'node:fs/promises'

import { deleteSchema, moveSchema, renameSchema, showInFinderSchema } from './const.js'
import { ensureVaultAccess, ensureWithinVault } from './context.js'
import { assertDirectory, ensureMarkdownName, sanitizeSegment } from './path-utils.js'

export const renameVaultEntry = async (rawPayload: { path: string; nextName: string }) => {
  const payload = renameSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  const stats = await stat(resolvedTarget)
  const parentDir = path.dirname(resolvedTarget)

  const sanitizedName = sanitizeSegment(payload.nextName)
  if (!sanitizedName) {
    throw new Error('新名称不能为空')
  }

  const finalName = stats.isDirectory() ? sanitizedName : ensureMarkdownName(sanitizedName)
  const destination = path.join(parentDir, finalName)
  if (destination === resolvedTarget) {
    return { path: destination }
  }

  try {
    await stat(destination)
    throw new Error('目标位置已存在同名文件或文件夹')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await rename(resolvedTarget, destination)
  return { path: destination }
}

export const moveVaultEntry = async (rawPayload: { path: string; targetDir: string }) => {
  const payload = moveSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  const entryStats = await stat(resolvedTarget)

  const { resolvedTarget: destinationDir } = await ensureWithinVault(payload.targetDir)
  await ensureVaultAccess(destinationDir)
  await assertDirectory(destinationDir)

  const ancestorCheck = path.relative(resolvedTarget, destinationDir)
  if (entryStats.isDirectory() && ancestorCheck && !ancestorCheck.startsWith('..') && ancestorCheck !== '') {
    throw new Error('不可将文件夹移动到自身或其子目录下')
  }

  const destination = path.join(destinationDir, path.basename(resolvedTarget))
  if (destination === resolvedTarget) {
    return { path: destination }
  }

  try {
    await stat(destination)
    throw new Error('目标目录下已存在同名项')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await rename(resolvedTarget, destination)
  return { path: destination }
}

export const deleteVaultEntry = async (rawPayload: { path: string }) => {
  const payload = deleteSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  await rm(resolvedTarget, { recursive: true, force: true })
}

export const showItemInFinder = async (rawPayload: { path: string }) => {
  const payload = showInFinderSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  shell.showItemInFolder(resolvedTarget)
}
