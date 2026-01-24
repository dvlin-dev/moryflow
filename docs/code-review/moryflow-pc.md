---
title: Moryflow PC Code Review
date: 2026-01-26
scope: apps/moryflow/pc
status: done
---

<!--
[INPUT]: apps/moryflow/pc/src/main, src/preload, src/renderer, src/shared, electron.vite.config.ts, electron-builder.yml, package.json
[OUTPUT]: 问题清单 + 修复建议 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Moryflow PC）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow PC Code Review

## 范围

- 入口点：`apps/moryflow/pc/src/main/index.ts`、`apps/moryflow/pc/src/preload/index.ts`、`apps/moryflow/pc/src/renderer/App.tsx`
- 关键目录：`apps/moryflow/pc/src/main/`、`apps/moryflow/pc/src/preload/`、`apps/moryflow/pc/src/renderer/`、`apps/moryflow/pc/src/shared/`
- 构建/打包：`apps/moryflow/pc/electron.vite.config.ts`、`apps/moryflow/pc/electron-builder.yml`
- 外部依赖：本地文件系统、Moryflow Membership API、Cloud Sync API、Ollama 服务

## 结论摘要

- 高风险问题（P1）：3 个（已修复）
- 中风险问题（P2）：6 个（已修复）
- 低风险/规范问题（P3）：1 个（已修复）
- 测试缺口：Renderer hooks 单测 + Electron E2E 已补齐

## 发现（按严重程度排序）

- [P1] 外链打开未做协议/域名校验（`shell.openExternal` 直接暴露）
  - 调研：
    - Electron Security Checklist 明确要求对外链跳转做 allowlist 与协议限制（避免 `file://`/`javascript:` 等）
    - `shell.openExternal` 推荐统一在主进程处理并做策略控制
  - 解决方案（已落地）：
    - 新增 `external-links.ts`，只允许 `https:`，并对域名 allowlist 校验（支持 `MORYFLOW_EXTERNAL_HOST_ALLOWLIST` 扩展）
    - preload 改为 `ipcRenderer.invoke('shell:openExternal')`，统一由主进程校验后打开
    - 对非法 URL 阻断并记录日志
  - 关联改动：
    - `apps/moryflow/pc/src/main/app/external-links.ts`
    - `apps/moryflow/pc/src/main/app/ipc-handlers.ts`
    - `apps/moryflow/pc/src/preload/index.ts`

- [P1] 主窗口未拦截 `will-navigate`/`will-redirect`，可被外部 URL 导航
  - 调研：
    - Electron WebContents 安全建议：必须拦截导航并禁止加载非受信内容
  - 解决方案（已落地）：
    - `will-navigate`/`will-redirect` 仅允许 app 自身 URL（dev 同源、prod file:// 且路径在 renderer 根目录）
    - 非允许 URL `preventDefault` 并走 `openExternalSafe`
  - 关联改动：
    - `apps/moryflow/pc/src/main/app/main-window.ts`

- [P1] sandbox 下 preload 产物为 ESM，导致 preload 无法加载（desktopAPI 缺失）
  - 调研：
    - Electron sandbox preload 只支持 CommonJS；ESM 会报 `Cannot use import statement outside a module`
    - preload 失败会导致 `window.desktopAPI` 未注入，渲染进程直接报错
  - 解决方案（已落地）：
    - preload 构建输出 CJS，产物固定为 `dist/preload/index.js`
    - `resolvePreloadPath` 优先加载 `.js`，避免命中残留 `.mjs`
  - 关联改动：
    - `apps/moryflow/pc/electron.vite.config.ts`
    - `apps/moryflow/pc/src/main/app/preload.ts`

- [P2] BrowserWindow 安全配置未收敛（sandbox/隔离/安全开关）
  - 调研：
    - Electron 官方安全建议：启用 `sandbox`、`contextIsolation`，关闭 `nodeIntegration`
  - 解决方案（已落地）：
    - 主窗口统一开启 `sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`、`webSecurity: true`
    - preload API 保持最小化，仅暴露必要 IPC 能力
  - 关联改动：
    - `apps/moryflow/pc/src/main/app/main-window.ts`

- [P2] Renderer 表单 Zod 与用户文案不符合规范（`zod/v3` + 英文文案）
  - 调研：
    - `docs/guides/frontend/forms-zod-rhf.md` 明确前端需使用 `zod/v3`（RHF 兼容层）
    - 语言规范要求用户可见文案必须英文
  - 解决方案（已落地）：
    - 表单 schema 使用 `zod/v3`
    - 设置/模型/MCP/语音等用户文案统一英文（含错误提示与空状态）
  - 关联改动（节选）：
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/add-model-dialog.tsx`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers/edit-model-dialog.tsx`
    - `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp/mcp-tool-list.tsx`
    - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/speech-helper.ts`

- [P2] 文件树展开路径加载存在串行瀑布
  - 调研：
    - Vercel React Best Practices：避免串行 `await`，并发请求减少瀑布延迟
  - 解决方案（已落地）：
    - `Promise.allSettled` 并发拉取展开目录，失败路径清理并更新 watchPaths
  - 关联改动：
    - `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.ts`

- [P2] Renderer 缺少单测覆盖（核心 hooks 无回归 + Electron E2E 缺口）
  - 调研：
    - Vitest + RTL 是 React hooks 单测的推荐组合；Electron E2E 可用 Playwright Electron
  - 解决方案（已落地）：
    - 新增 Vitest 配置与 RTL setup，补齐 hooks 单测
    - 增加 Playwright Electron E2E：创建 Vault、创建笔记并自动保存、Settings/Sites 入口覆盖
    - E2E 运行时通过 `MORYFLOW_E2E=true` 关闭 DevTools 干扰
  - 关联改动：
    - `apps/moryflow/pc/vitest.config.ts`
    - `apps/moryflow/pc/src/test/setup.ts`
    - `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.test.tsx`
    - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.test.tsx`
    - `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.test.tsx`
    - `apps/moryflow/pc/playwright.config.ts`
    - `apps/moryflow/pc/tests/core-flow.spec.ts`

- [P2] 单测环境 React 重复实例导致 hooks invalid hook call
  - 调研：
    - monorepo + peer 依赖在 hoist 时容易产生多份 React（测试运行时会直接报 invalid hook call）
    - 受影响链路集中在 `react-i18next`/`@testing-library/react` 的 peer 解析
  - 解决方案（已落地）：
    - PC 端与根依赖对齐 React 19.2.3，避免 peer 自动安装产生多版本
    - Vitest 强制 React/ReactDOM alias + dedupe
    - hooks 单测 mock i18n，避免依赖 react-i18next 的 provider
  - 关联改动：
    - `package.json`
    - `apps/moryflow/pc/package.json`
    - `apps/moryflow/pc/vitest.config.ts`
    - `apps/moryflow/pc/src/renderer/workspace/hooks/use-document-state.test.tsx`
    - `apps/moryflow/pc/src/renderer/workspace/hooks/use-vault-tree.test.tsx`

- [P3] 图标库不符合规范（`lucide-react`）
  - 调研：
    - UI/UX 规范要求统一 Hugeicons（`@hugeicons/core-free-icons` + `Icon`）
  - 解决方案（已落地）：
    - 全量替换 Hugeicons；更新 `components.json`；移除 `lucide-react` 依赖
  - 关联改动（节选）：
    - `apps/moryflow/pc/components.json`
    - `apps/moryflow/pc/package.json`
    - `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/index.tsx`

## 修复计划与进度

- 状态：done
- 已完成：
  - 外链/导航安全收敛 + sandbox 安全配置
  - preload CJS 构建与路径解析修复（sandbox 兼容）
  - Renderer 文案英文化 + `zod/v3` 对齐
  - 文件树展开路径并发加载
  - Hugeicons 全量替换 + 依赖清理
  - Renderer hooks 单测
  - Electron E2E：打开 Vault、编辑自动保存、站点发布入口、设置页加载
- 验证方式：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
  - `pnpm --filter @anyhunt/moryflow-pc test:e2e`
