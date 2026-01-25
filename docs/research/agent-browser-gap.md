---
title: Agent Browser 对比与改进清单（agent-browser vs anyhunt server）
date: 2026-01-24
scope: anyhunt-server/browser
status: active
---

<!--
[INPUT]: agent-browser 最新代码 + anyhunt server 浏览器模块现状
[OUTPUT]: 差距清单 + 改进落地记录 + 配置与接口索引
[POS]: 调研记录/落地记录（Browser/Agent 规划与验收）
-->

# Agent Browser 对比与改进清单

## 结论与决策

- 决策：**保留现有模块，自研吸收 best practices**。
- 不直接接入原因（结论保持不变）：
  - Anyhunt 是多租户 API，需要鉴权、计费、SSRF、防滥用、会话归属与资源池治理；agent-browser 是单机 CLI/库，不具备平台级约束。
  - 形态不兼容（daemon + socket vs HTTP API），无法做到“零二次开发”。

## 已落地改进（全部完成）

> 仅列“对我们有用且已落实”的功能，去除噪音。

1. **语义定位器**：支持 role/text/label/placeholder/alt/title/testId。
   - 涉及：`apps/anyhunt/server/src/browser/dto/action.schema.ts`、`apps/anyhunt/server/src/browser/session/session.manager.ts`、`apps/anyhunt/server/src/browser/handlers/action.handler.ts`
2. **AI 友好错误**：strict mode/遮挡/不可见/导航中断/关闭等错误转为可执行建议。
   - 涉及：`apps/anyhunt/server/src/browser/handlers/action.handler.ts`
3. **等待条件补齐**：loadState/function/download + 现有 wait 条件统一。
   - 涉及：`apps/anyhunt/server/src/browser/dto/action.schema.ts`、`apps/anyhunt/server/src/browser/handlers/action.handler.ts`
4. **动作集补齐**：drag/upload/evaluate/pdf/download/highlight/getCount/getBoundingBox。
   - 涉及：`apps/anyhunt/server/src/browser/dto/action.schema.ts`、`apps/anyhunt/server/src/browser/handlers/action.handler.ts`
5. **批量动作**：ActionBatch 减少往返、支持 stopOnError。
   - 涉及：`apps/anyhunt/server/src/browser/dto/action-batch.schema.ts`、`apps/anyhunt/server/src/browser/browser-session.service.ts`
6. **Headers 能力**：global headers + origin-scoped headers；openUrl 支持 scoped headers。
   - 涉及：`apps/anyhunt/server/src/browser/dto/headers.schema.ts`、`apps/anyhunt/server/src/browser/network/interceptor.service.ts`、`apps/anyhunt/server/src/browser/browser-session.service.ts`
7. **运行时配置**：device/locale/timezone/geolocation/permissions/media/offline/acceptDownloads/recordVideo。
   - 涉及：`apps/anyhunt/server/src/browser/dto/session.schema.ts`、`apps/anyhunt/server/src/browser/dto/window.schema.ts`、`apps/anyhunt/server/src/browser/session/session.manager.ts`
8. **调试与观测**：console/pageerror/trace/har（请求录制）。
   - 涉及：`apps/anyhunt/server/src/browser/diagnostics/`、`apps/anyhunt/server/src/browser/network/interceptor.service.ts`、`apps/anyhunt/server/src/browser/browser-session.service.ts`
9. **Streaming 预览**：WebSocket screencast + input injection（token 机制）。
   - 涉及：`apps/anyhunt/server/src/browser/streaming/`
10. **Provider 集成**：Browserbase / Browser Use 远程 CDP 连接。
    - 涉及：`apps/anyhunt/server/src/browser/cdp/cdp-connector.service.ts`、`apps/anyhunt/server/src/browser/dto/cdp.schema.ts`
11. **Profile 持久化**：R2 存储登录态快照，跨会话复用。
    - 涉及：`apps/anyhunt/server/src/browser/persistence/profile.service.ts`
12. **Agent Tools 扩展**：新增 `browser_action` / `browser_action_batch`。
    - 涉及：`apps/anyhunt/server/src/agent/tools/browser-tools.ts`
13. **Console Playground UI**：补齐 ActionBatch/Headers/Diagnostics/Profile/Streaming UI 与多页面路由。
    - 涉及：`apps/anyhunt/console/src/features/agent-browser-playground/`、`apps/anyhunt/console/src/pages/agent-browser/`、`apps/anyhunt/console/src/App.tsx`、`apps/anyhunt/console/src/components/layout/app-sidebar.tsx`

## 新增/更新接口（L2 + Console Playground）

- L2 Browser API：
  - `POST /api/v1/browser/session/:id/action/batch`
  - `POST /api/v1/browser/session/:id/headers`
  - `POST /api/v1/browser/session/:id/headers/clear`
  - `GET /api/v1/browser/session/:id/console`
  - `DELETE /api/v1/browser/session/:id/console`
  - `GET /api/v1/browser/session/:id/errors`
  - `DELETE /api/v1/browser/session/:id/errors`
  - `POST /api/v1/browser/session/:id/trace/start`
  - `POST /api/v1/browser/session/:id/trace/stop`
  - `POST /api/v1/browser/session/:id/har/start`
  - `POST /api/v1/browser/session/:id/har/stop`
  - `POST /api/v1/browser/session/:id/profile/save`
  - `POST /api/v1/browser/session/:id/profile/load`
  - `POST /api/v1/browser/session/:id/stream`
  - `POST /api/v1/browser/session/cdp/connect`
- Console Playground（代理同名路径）：
  - `/api/v1/console/playground/browser/...` 下同步新增以上能力

## Console Playground UI 覆盖

- 新增页面：Diagnostics / Profile / Streaming（`/agent-browser/*`）
- Browser 页补齐 ActionBatch；Network 页补齐 Headers；新增 Streaming 预览与输入注入、Profile 保存/加载、Diagnostics（console/errors/trace/har）
- 运行时配置表单：device/locale/timezone/geolocation/permissions/headers/httpCredentials/acceptDownloads/recordVideo

## Streaming 协议

- WebSocket：`ws://{BROWSER_STREAM_HOST}:{BROWSER_STREAM_PORT}/browser/stream?token=...`
- 输入事件：`input_mouse` / `input_keyboard` / `input_touch`
- 输出：`frame`（jpeg base64）+ `status`

## 配置项（新增）

- `BROWSER_STREAM_PORT` / `BROWSER_STREAM_HOST`
- `BROWSERBASE_API_KEY` / `BROWSERBASE_PROJECT_ID`
- `BROWSER_USE_API_KEY`
- R2 配置（Profile 依赖）：`R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`

## 落地检查与进度

- [x] 语义定位器 + AI 友好错误
- [x] 动作集补齐 + 等待条件补齐
- [x] ActionBatch
- [x] Headers（global + origin-scoped）
- [x] 运行时配置（device/locale/timezone/geolocation/permissions/media/offline/recordVideo）
- [x] 诊断（console/pageerror/trace）+ HAR 录制
- [x] Streaming（screencast + input injection）
- [x] Provider 集成（browserbase/browseruse）
- [x] Profile 持久化（R2）
- [x] Agent Tools 扩展
- [x] Console Playground UI（Browser/Network/Diagnostics/Profile/Streaming）

## 测试

- 需执行：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`
- 最近一次执行：2026-01-24（复跑 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全部通过；`test:unit` 日志包含 Redis/Email 配置缺失相关告警，但未影响用例通过）

## 核对日期

- 2026-01-24

## 更新日志

- 2026-01-24：完成 best practices 全量落地，补齐 ActionBatch/Headers/Diagnostics/Streaming/Profile/Provider，并更新接口与配置索引。
- 2026-01-24：补齐 Console Playground UI（ActionBatch/Headers/Diagnostics/Profile/Streaming + 路由/导航）。
- 2026-01-24：复跑 `pnpm lint` / `pnpm typecheck` / `pnpm test:unit`，全部通过（含 DigestFeedbackService 警告日志，不影响结果）。
- 2026-01-24：修复 Streaming 资源清理/Trace 本地路径泄露/索引参数 400 校验；BrowserSessionPanel 分区组件拆分并补齐回归单测；复跑 lint/typecheck/test:unit。
- 2026-01-24：补齐 diagnostics/streaming/persistence 导出与前端 Agent Browser 页面 Header/PROTOCOL 规范，复跑 lint/typecheck/test:unit，同步文档索引。
