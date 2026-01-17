/**
 * [PROVIDES]: TipTap 编辑器 UI/扩展的统一入口导出
 * [DEPENDS]: ./hooks, ./utils, ./editors, ./extensions, ./nodes
 * [POS]: packages/tiptap 对外 API；业务侧避免深路径 import
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

// Hooks
export * from './hooks';

// Utils
export * from './utils';

// Extensions
export * from './extensions/node-background-extension';
export * from './extensions/node-alignment-extension';
export * from './extensions/ui-state-extension';

// Nodes
export * from './nodes/horizontal-rule-node/horizontal-rule-node-extension';
