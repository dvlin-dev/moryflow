# packages/tiptap

> ⚠️ 本文件夹结构/导出变更时，必须同步更新此文档

## 定位

Anyhunt 内部 TipTap 组件库与扩展集合，提供 Notion 风格编辑器 UI、扩展、hooks 与工具函数。

## 约束（重要）

- 业务侧**禁止**深路径 import（例如 `@anyhunt/tiptap/editors/...`、`@anyhunt/tiptap/nodes/...`），统一从 `@anyhunt/tiptap` 根入口导入。
- 样式统一从 `@anyhunt/tiptap/styles/notion-editor.scss` 引入（内部会聚合节点样式），避免业务侧逐个引入节点 scss。

## 对外导出

- `@anyhunt/tiptap`
  - Hooks：`useThrottledCallback` 等
  - Utils：`markdownToHtml`、`htmlToMarkdown` 等
  - Extensions：`NodeBackground`、`NodeAlignment`、`UiState`
  - Nodes：`HorizontalRule`
- `@anyhunt/tiptap/styles/notion-editor.scss`

## 常见用法（管理后台）

- Markdown 编辑：`markdownToHtml` / `htmlToMarkdown` + Notion Editor UI
- 依赖方（示例）：`apps/anyhunt/admin/www`
