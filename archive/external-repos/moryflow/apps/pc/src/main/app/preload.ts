import path from 'node:path'
import { existsSync } from 'node:fs'

/**
 * 解析预加载脚本路径，优先使用构建时传入的入口，其次尝试 mjs，再回退 js。
 */
export const resolvePreloadPath = () => {
  const candidate = process.env.ELECTRON_PRELOAD_ENTRY
  if (candidate) {
    return path.join(__dirname, candidate)
  }

  const mjsPath = path.join(__dirname, '../preload/index.mjs')
  if (existsSync(mjsPath)) {
    return mjsPath
  }

  return path.join(__dirname, '../preload/index.js')
}
