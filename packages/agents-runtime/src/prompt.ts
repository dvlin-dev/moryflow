/**
 * [INPUT]: 平台 profile + 运行时上下文
 * [OUTPUT]: Mory 系统提示词（共享核心 + 平台特化 + 运行时注入）
 * [POS]: Agent Runtime 的提示词导出入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export {
  buildSystemPrompt,
  getPlatformPrompt,
  type BuildSystemPromptOptions,
} from './prompt/index';
export { getCoreAgentPrompt, getPcBashFirstPrompt, getMobileFileToolsPrompt } from './prompt/index';
export {
  MOBILE_FILE_TOOLS_PROFILE,
  PC_BASH_FIRST_PROFILE,
  type PlatformProfile,
} from './platform-profile';
