/**
 * [PROVIDES]: TipTap 编辑器 UI/扩展的统一入口导出
 * [DEPENDS]: ./hooks, ./utils, ./editors, ./extensions, ./nodes
 * [POS]: packages/tiptap 对外 API；业务侧避免深路径 import
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
