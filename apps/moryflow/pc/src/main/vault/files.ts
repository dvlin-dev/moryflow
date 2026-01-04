import path from 'node:path'
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'

import {
  fileCreateSchema,
  fileReadSchema,
  fileWriteSchema,
  folderCreateSchema
} from './const.js'
import { ensureVaultAccess, ensureWithinVault } from './context.js'
import { assertDirectory, ensureMarkdownName, sanitizeSegment } from './path-utils.js'

export const readVaultFile = async (rawPayload: { path: string }) => {
  const payload = fileReadSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  const stats = await stat(resolvedTarget)
  if (!stats.isFile()) {
    throw new Error('目标不是有效文件')
  }

  const content = await readFile(resolvedTarget, 'utf-8')
  return { content, mtime: stats.mtimeMs }
}

export const writeVaultFile = async (rawPayload: { path: string; content: string; clientMtime?: number }) => {
  const payload = fileWriteSchema.parse(rawPayload)
  const { resolvedTarget } = await ensureWithinVault(payload.path)
  await ensureVaultAccess(resolvedTarget)
  const before = await stat(resolvedTarget)
  if (!before.isFile()) {
    throw new Error('目标不是有效文件')
  }

  // 通过 mtime 对比确保客户端未覆盖外部同步的最新修改
  if (payload.clientMtime && before.mtimeMs - payload.clientMtime > 1) {
    throw new Error('文件已在外部修改，请先刷新内容')
  }

  await writeFile(resolvedTarget, payload.content, 'utf-8')
  const after = await stat(resolvedTarget)
  return { mtime: after.mtimeMs }
}

export const createVaultFile = async (rawPayload: { parentPath: string; name: string; template?: string }) => {
  const payload = fileCreateSchema.parse(rawPayload)
  const { resolvedTarget: parentDir } = await ensureWithinVault(payload.parentPath)
  await ensureVaultAccess(parentDir)
  await assertDirectory(parentDir)

  const sanitizedName = sanitizeSegment(payload.name)
  if (!sanitizedName) {
    throw new Error('文件名不能为空')
  }

  const finalName = ensureMarkdownName(sanitizedName)
  const targetPath = path.join(parentDir, finalName)

  try {
    await stat(targetPath)
    throw new Error('同名文件已存在')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await writeFile(targetPath, payload.template ?? '# 新建笔记\n\n', 'utf-8')
  return { path: targetPath }
}

export const createVaultFolder = async (rawPayload: { parentPath: string; name: string }) => {
  const payload = folderCreateSchema.parse(rawPayload)
  const { resolvedTarget: parentDir } = await ensureWithinVault(payload.parentPath)
  await ensureVaultAccess(parentDir)
  await assertDirectory(parentDir)

  const sanitizedName = sanitizeSegment(payload.name)
  if (!sanitizedName) {
    throw new Error('文件夹名称不能为空')
  }

  const targetPath = path.join(parentDir, sanitizedName)
  await mkdir(targetPath)
  return { path: targetPath }
}
