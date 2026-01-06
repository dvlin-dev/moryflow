/**
 * [PROVIDES]: 目录扫描和文件 hash 计算
 * [POS]: 扫描源目录获取所有 Markdown 文件
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import fg from 'fast-glob'
import type { FileInfo } from './const.js'

/** 扫描目录获取所有 Markdown 文件 */
export async function scanDirectory(dirPath: string): Promise<FileInfo[]> {
  const pattern = '**/*.{md,markdown}'
  const files = await fg(pattern, {
    cwd: dirPath,
    onlyFiles: true,
    ignore: ['node_modules/**', '.git/**', '.obsidian/**'],
  })

  return files.map((relativePath) => ({
    absolutePath: path.join(dirPath, relativePath),
    relativePath,
    name: path.basename(relativePath, path.extname(relativePath)),
    isDirectory: false,
  }))
}

/** 计算文件内容的 hash */
export async function computeFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath)
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8)
}
