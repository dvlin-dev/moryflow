# Console Features

> ⚠️ 本目录结构变更时，必须同步更新此文档。

## 概览

控制台功能模块集合，每个功能模块自包含 API、hooks、类型与组件。

## 模块结构

```
feature-name/
├── api.ts           # React Query mutations
├── hooks.ts         # React Query queries
├── types.ts         # Feature-specific types
├── components/      # Feature components
└── index.ts         # Exports
```

## 功能清单

| 功能                        | 说明                 | API 入口                                      |
| --------------------------- | -------------------- | --------------------------------------------- |
| `api-keys/`                 | API Key 管理         | `/api/v1/app/api-keys`                        |
| `auth/`                     | 登录表单             | `/api/v1/auth/*`（Better Auth）               |
| `playground-shared/`        | Playground 共享组件  | —                                             |
| `scrape-playground/`        | 单页抓取测试         | `/api/v1/scrape`                              |
| `crawl-playground/`         | 多页爬取测试         | `/api/v1/crawl`                               |
| `map-playground/`           | URL 发现测试         | `/api/v1/map`                                 |
| `extract-playground/`       | AI 数据提取测试      | `/api/v1/extract`                             |
| `search-playground/`        | 网页搜索测试         | `/api/v1/search`                              |
| `embed-playground/`         | Embed 测试           | Demo-only                                     |
| `agent-browser-playground/` | Agent + Browser 测试 | `/api/v1/agent` + `/api/v1/browser/session/*` |
| `memox/`                    | Memox 记忆管理       | `/api/v1/memories`（API Key）                 |
| `settings/`                 | 账户设置             | `/api/v1/app/*`                               |
| `webhooks/`                 | Webhook 管理         | `/api/v1/webhooks`                            |

## 常用模式

### API Mutation

```typescript
export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data) => apiClient.post(CONSOLE_API.API_KEYS, data),
  });
}
```

### Query Hook

```typescript
export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.get(CONSOLE_API.API_KEYS),
  });
}
```

## 近期变更

- Agent Browser Playground：修复 thinking=level 场景 200 SSE 流被 `clone().text()` 提前耗尽的问题；仅在 `400` 边界错误时读取响应体并触发单次降级重试（2026-02-26）
- Agent Browser D-6c + 模块 E 收敛完成：`browser-session-panel.tsx` 收敛为 103 行容器层，新增 `browser-session-panel-content.tsx`；operation handlers 按域拆分为 `use-browser-session-open-actions.ts`、`use-browser-session-tab-window-actions.ts`、`use-browser-session-intercept-network-actions.ts`、`use-browser-session-diagnostics-actions.ts`、`use-browser-session-data-actions.ts`（聚合层 `use-browser-session-operation-actions.ts`）；`browser-api.ts` 再拆分为 `browser-session-api.ts`、`browser-observability-api.ts`、`browser-storage-api.ts` + `browser-api-client.ts`；`Scrape/Crawl` 新增 `*-request-card` 与 `*-result-panel` 并迁移到 `PlaygroundPageShell`，`playground-shared` 新增 `PlaygroundLoadingState` 与 `PlaygroundCodeExampleCard`
- Agent Browser 模块 D-6a 复查完成：新增 `flow-runner-form.tsx`、`flow-runner-step-list.tsx`、`flow-runner-types.ts`、`flow-runner-helpers.ts`，`flow-runner.tsx` 收敛为编排层；新增 `hooks/use-browser-session-forms.ts`，将 `BrowserSessionPanel` 表单初始化与 session 同步副作用抽离
- Agent Browser 模块 D-4e 修复完成：`components/browser-session-sections.tsx` 第五批拆分 `OpenUrlSection` / `SnapshotSection` / `DeltaSnapshotSection` / `ActionSection` / `ActionBatchSection` / `ScreenshotSection` 到 `components/browser-session-sections/*.tsx`，聚合文件收敛为 45 行导出层
- Agent Browser 模块 D-4d 修复完成：`components/browser-session-sections.tsx` 第四批拆分 `SessionSection` / `TabsSection` / `WindowsSection` 到 `components/browser-session-sections/*.tsx`，聚合文件进一步收敛为导入装配层
- Agent Browser 模块 D-4c 修复完成：`components/browser-session-sections.tsx` 第三批拆分 `InterceptSection` / `HeadersSection` / `NetworkHistorySection` / `DiagnosticsSection` 到 `components/browser-session-sections/*.tsx`，并将 Detection Risk 状态渲染收敛为方法调用
- Agent Browser 模块 D-5 修复完成：新增 `browser-api.ts` 与 `agent-api.ts`，`api.ts` 改为兼容导出层；`browser-session-panel.tsx`、`flow-runner.tsx`、`use-agent-models.ts` 切换到分域 API 导入
- Agent Browser 模块 D-4b 修复完成：`components/browser-session-sections.tsx` 第二批拆分 `StorageSection` / `ProfileSection` 到 `components/browser-session-sections/*.tsx`，继续推进多文件分区结构
- Agent Browser 模块 D-4a 修复完成：`components/browser-session-sections.tsx` 首批拆分 `StreamingSection` / `CdpSection` 到 `components/browser-session-sections/*.tsx`，建立多文件分区结构
- Agent Browser 模块 D-3 修复完成：`browser-session-panel.tsx` 的分区开关状态、结果状态与 session lifecycle handlers 抽离为 hooks，组件收敛为分区装配层
- Agent Browser 模块 D-3b 修复完成：新增 `hooks/use-browser-session-panel-results.ts` 与 `hooks/use-browser-session-lifecycle-actions.ts`，`browser-session-panel.tsx` 的 session 生命周期与结果状态管理抽离为 hooks，组件收敛为装配层
- Agent Browser 模块 D-3a 修复完成：新增 `browser-session-section-config.ts` 与 `hooks/use-browser-session-section-open-state.ts`，`browser-session-panel.tsx` 的分区展开状态改为统一状态容器（移除 17 个分散 `useState`）
- Agent Browser 模块 D-2 修复完成：新增 `browser-context-options.ts` 统一 Session/Window 参数校验与 options 组装（permissions/headers/geolocation/httpCredentials），`browser-session-panel.tsx` 的 `handleCreateSession/handleCreateWindow` 统一复用 mapper，并补齐 `browser-context-options.test.ts`
- Memox/Embed review follow-up 收敛：`Memories` 请求启用边界改为 `apiKey + userId`；`Memories/Entities/Graph/Embed` API Key 选择统一复用 `playground-shared/ApiKeySelector`；`memox-graph-visualization-card` 进一步拆分为 `graph-visualization-view-model.ts`、`memox-graph-visualization-states.tsx`、`use-graph-container-dimensions.ts`、`use-memox-graph-canvas.ts`
- Memox/Embed Playground C-2~C-5 收敛完成：`memox` 新增 `graph-schemas.ts` + `memox-graph-query-card.tsx` + `memox-graph-visualization-card.tsx`（含 `graph-schemas.test.ts`）；`embed-playground` 新增 `schemas.ts`（含 `schemas.test.ts`）并将 `EmbedForm` 迁移到 `react-hook-form + zod/v3`；`memox/embed` 页面 API Key 选择统一复用 `resolveActiveApiKeySelection`
- Memox Playground C-1 结构收敛：新增 `playground-schemas.ts` 与 `playground-request-mapper.ts`；`MemoxPlaygroundPage` 拆分为容器层（`pages/MemoxPlaygroundPage.tsx`）+ 请求区（`memox-playground-request-card.tsx`）+ 结果区（`memox-playground-result-panel.tsx`）+ create/search 子表单组件，并补齐 mapper 单测
- Playground 模块 B-4~B-6 收敛完成：统一 API Key 选择逻辑到 `resolveActiveApiKeySelection`，新增 `PlaygroundPageShell` 并接入 `Map/Search/Extract` 页面，`ApiKeySelector`/`CrawlForm`/`Map/Search` 页面残留状态三元改为命名片段渲染
- Extract Playground B-3 结构收敛：`ExtractPlaygroundPage` 拆分为容器层（页面）+ 请求区组件（`extract-request-card.tsx`）+ 结果区组件（`extract-result-panel.tsx`）
- Scrape Playground B-2 结构收敛：`scrape-result.tsx` 拆分为容器层（`scrape-result.tsx`）+ 视图模型（`scrape-result-view-model.ts`）+ 卡片片段（`scrape-result-cards.tsx`）+ 内容 Tabs（`scrape-result-content-tabs.tsx`），移除默认 Tab 的链式三元
- Scrape Playground B-1 结构收敛：`scrape-form.tsx` 拆分为容器层（`scrape-form.tsx`）+ 请求映射（`scrape-form-request-mapper.ts`）+ 分段 UI（`scrape-form-sections.tsx`、`scrape-form-advanced-sections.tsx`、`scrape-form-screenshot-section.tsx`），并将折叠状态收敛为对象模型
- 状态渲染一致性收敛：`create-api-key-dialog`、`webhook-api-key-card`、`WebhooksPage` 的多状态 UI 改为“状态片段 + 渲染方法（`renderByState/switch`）”，清理状态渲染型三元表达式
- Webhooks 视图渲染收敛：`webhook-list-card` 将 loading/missing-key/empty/ready 四态拆为独立 UI 片段，并通过中间 `renderContentByState` 统一调度，避免链式三元降低可读性
- Webhooks/Settings/API Keys 结构收敛：Webhooks 新增 `resolveActiveApiKeySelection`（active key only）并补齐回归测试；`WebhooksPage` 拆分 `WebhookApiKeyCard`/`WebhookListCard`，dialog 状态改为判别式；`settings`、`api-keys`、`webhooks` 表单统一迁移到 `react-hook-form + zod/v3`，新增 `schemas.ts` 与 `webhook-form-fields.tsx`
- Agent Browser Playground：`AgentChatTransport.headers` 固定返回 `Headers`，修复 `Authorization?: undefined` 导致的 `TS2322`
- Agent Browser Playground：聊天 transport 切换为官方 `DefaultChatTransport`，移除手写 SSE parser 与 `eventsource-parser` 依赖
- Agent Browser Playground：Diagnostics 新增 Detection Risk 只读区块，接入 `/api/v1/browser/session/:id/risk`，展示 24h 成功率、Top 原因与建议动作
- Agent Browser Playground：Streamdown 升级至 v2.2，流式输出启用逐词动画（仅最后一条 assistant 文本段）
- Agent Browser Playground：新增全局检索标记 `STREAMDOWN_ANIM`，便于定位动画链路与作用点
- Agent Browser Playground：MessageRow parts 解析复用 `@moryflow/ui/ai/message`（split/clean），避免多端重复实现导致语义漂移
- Playground Shared/Memox 分页箭头统一改为 ChevronRight/ChevronLeft（无中轴）
- Console Features 图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- API Key Create Dialog 文案与 ApiKeyClient 校验对齐（空 key 阻断请求）
- Agent Browser Playground：Agent Chat 支持单页多轮对话 + 模型选择（对齐 Moryflow）
- Agent Browser Playground：默认模型选择改为派生值，避免 effect 内 setState
- Agent Browser Playground：模型列表变更时回退默认模型，防止选择失效
- Memox Playground：补齐 includes/excludes/custom_instructions/custom_categories、filters/threshold/rerank 等高级字段
- Agent Browser Playground：Stream 请求改为强制携带 access token，移除 cookie-only 依赖
- Agent Browser Playground：补充 Reasoning/Progress 映射、stream abort 处理、错误边界与分区组件
- Agent Browser Playground：BrowserSessionPanel 支持 sections 裁剪，配合多页面拆分
- Agent Browser Playground：补齐 ActionBatch/Headers/Diagnostics/Profile/Streaming UI 与路由导航
- Agent Browser Playground：BrowserSessionPanel 分区组件拆分为独立文件（browser-session-sections.tsx）
- Agent Browser Playground：Streaming 逻辑抽离为 hook，降低 BrowserSessionPanel 复杂度
- Agent Browser Playground：Screenshot 选项收敛为 png/jpeg，与后端能力对齐
- Agent Browser Playground：Streaming 断开时清理 frame；截图质量仅对 jpeg 生效
- Agent Browser Playground：schemas/types/panel 等补齐 Header/PROTOCOL 规范
- Agent Browser Playground：Agent Chat 改为纯消息 UI，SSE 流显式发送 `start` 以保证消息追加
- Agent Browser Playground：`thinking/progress` 事件按文本输出，避免误入 Reasoning
- Agent Browser Playground：消息列表与输入框切换为 `@moryflow/ui/ai/*` 组件，统一布局/Tool/Reasoning 渲染
- Agent Browser Playground：Tool 消息兼容 dynamic-tool 类型，修复构建类型报错
- Agent Browser Playground：输入提交失败保留内容，交由上层提示错误
- Agent Browser Playground：消息列表组件拆分与渲染性能优化（单次遍历 + 子组件化）
- Agent Browser Playground：loading 改为占位消息渲染，MessageList 不再接收 loading prop
- Scrape Playground 表单改用 `useWatch` 订阅字段，避免 `form.watch()` 与 React Compiler 冲突
- Playground 类型与 API 解包统一为 raw JSON + RFC7807（移除 success/data 包装）
- Console Playground/管理页统一改为 API Key 直连公网 API
- API Key 列表返回明文 key，前端统一脱敏展示与 Copy
- API Key 脱敏工具 `maskApiKey` 补齐单元测试

## 依赖

- `@tanstack/react-query` - 数据请求
- `/ui` - UI 组件
- `../lib/api-client` - HTTP 客户端
- `../lib/api-paths` - API 常量
- `better-auth` - Better Auth 官方客户端
- 图标统一 Lucide（`lucide-react`），直接组件调用
