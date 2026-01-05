/**
 * [PROVIDES]: ChatInputBar Hooks 导出
 * [USED_BY]: ChatInputBar/index.tsx
 */

// 语音输入（原有）
export { useVoiceInput } from './use-voice-input'

// @ 文件搜索相关
export { useWorkspaceFiles } from './use-workspace-files'
export type { FlatFile } from './use-workspace-files'
export { useContextFiles } from './use-context-files'
export { useFileSearch } from './use-file-search'
