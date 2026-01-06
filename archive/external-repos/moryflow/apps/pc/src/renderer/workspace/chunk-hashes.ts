/**
 * 集中管理所有 chunk 的 hash 常量。
 *
 * 这些常量用于 preload 缓存校验，不能从实际模块导入，
 * 否则会导致 Vite 的动态导入无法正确拆分 chunk。
 *
 * 注意：这些 hash 是构建时自动生成的，值为 undefined 表示未知，
 * 实际运行时会从动态导入的模块中获取真实 hash。
 */

// Shiki 代码高亮 chunk
export const SHIKI_CHUNK_HASH: string | undefined = undefined

// 设置对话框 chunk
export const SETTINGS_CHUNK_HASH: string | undefined = undefined

// 聊天面板 chunk
export const CHAT_CHUNK_HASH: string | undefined = undefined
