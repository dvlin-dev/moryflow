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

| 功能                        | 说明                 | API 入口                       |
| --------------------------- | -------------------- | ------------------------------ |
| `api-keys/`                 | API Key 管理         | `/api/v1/console/api-keys`     |
| `auth/`                     | 登录表单             | `/api/auth/*`（Better Auth）   |
| `playground-shared/`        | Playground 共享组件  | —                              |
| `scrape-playground/`        | 单页抓取测试         | `/api/v1/scrape`               |
| `crawl-playground/`         | 多页爬取测试         | `/api/v1/crawl`                |
| `map-playground/`           | URL 发现测试         | `/api/v1/map`                  |
| `extract-playground/`       | AI 数据提取测试      | `/api/v1/extract`              |
| `search-playground/`        | 网页搜索测试         | `/api/v1/search`               |
| `embed-playground/`         | Embed 测试           | Demo-only                      |
| `agent-browser-playground/` | Agent + Browser 测试 | `/api/v1/console/playground/*` |
| `memox/`                    | Memox 记忆管理       | `/api/v1/memories` (Token)     |
| `settings/`                 | 账户设置             | `/api/v1/console/*`            |
| `webhooks/`                 | Webhook 管理         | `/api/v1/console/webhooks`     |

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

- Memox Playground：补齐 includes/excludes/custom_instructions/custom_categories、filters/threshold/rerank 等高级字段
- Agent Browser Playground：Stream 请求改为强制携带 access token，移除 cookie-only 依赖
- Agent Browser Playground：补充 Reasoning/Progress 映射、stream abort 处理、错误边界与分区组件
- Agent Browser Playground：BrowserSessionPanel 支持 sections 裁剪，配合多页面拆分
- Agent Browser Playground：补齐 ActionBatch/Headers/Diagnostics/Profile/Streaming UI 与路由导航
- Agent Browser Playground：BrowserSessionPanel 分区组件拆分为独立文件（browser-session-sections.tsx）
- Agent Browser Playground：schemas/types/panel 等补齐 Header/PROTOCOL 规范
- Agent Browser Playground：Agent Chat 改为纯消息 UI，SSE 流显式发送 `start` 以保证消息追加
- Agent Browser Playground：`thinking/progress` 事件按文本输出，避免误入 Reasoning
- Agent Browser Playground：消息列表与输入框切换为 `@anyhunt/ui/ai/*` 组件，统一布局/Tool/Reasoning 渲染
- Agent Browser Playground：Tool 消息兼容 dynamic-tool 类型，修复构建类型报错
- Agent Browser Playground：输入提交失败保留内容，交由上层提示错误
- Agent Browser Playground：消息列表组件拆分与渲染性能优化（单次遍历 + 子组件化）
- Scrape Playground 表单改用 `useWatch` 订阅字段，避免 `form.watch()` 与 React Compiler 冲突

## 依赖

- `@tanstack/react-query` - 数据请求
- `/ui` - UI 组件
- `../lib/api-client` - HTTP 客户端
- `../lib/api-paths` - API 常量
- `better-auth` - Better Auth 官方客户端
- 图标统一 Hugeicons（`@hugeicons/react` + `@hugeicons/core-free-icons`）
