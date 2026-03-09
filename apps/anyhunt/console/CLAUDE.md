# Console

> Anyhunt Dev 用户控制台，面向开发者的 Web 管理与能力验证入口。

## 定位

- 承担 API Key、额度、Webhook、Memox、Agent Browser playground 与账户设置的统一控制台。
- 基于 React + Vite；当前路由实现仍是 `react-router-dom`，不是 TanStack Router。
- 本目录只保留控制台特有事实；通用前端约束以下游设计文档与根规则为准。

## 职责

- 会话登录、token 刷新与受保护页面壳层。
- API Key 管理与默认 active key 选择。
- Fetchx / Memox / Agent Browser playground。
- Webhook 配置、账户设置与外链文档入口。

## 当前事实

- 登录态由 Zustand 持久化 access/refresh token；数据请求使用 TanStack Query。
- Session 相关 API 统一走 `/api/v1/app/*`；公网能力统一走 `/api/v1/*`。
- 生产默认请求 `https://server.anyhunt.app`，本地开发默认通过 Vite proxy 转发。
- `App.tsx` 仍是路由与受保护壳层的单一入口；功能页主要分布在 `pages/` 与 `features/`。
- Agent Browser playground 已独立为多子路由调试面板，不应再退回单页 demo 模式。

## 关键约束

- 登录通过 `POST /api/v1/auth/sign-in/email` 获取 `accessToken + refreshToken`；刷新只允许调用一次 `POST /api/v1/auth/refresh` 并重试原请求。
- `/login` 支持 `next` 回跳，但禁止回跳到 `/login` 自身。
- Playground 与管理页默认选中第一把 active API Key，避免无 key 空状态误导。
- Agent Playground 统一调用 `POST /api/v1/agent`；入参使用 `output`，不再发送旧 `schema` 字段，请求侧也不允许选择模型/provider。
- 组件统一从 `/ui` 导入；全局样式只引入 `/ui/styles`。
- Vite 必须保持 React dedupe 与 `@moryflow/ui/ai/*` alias，避免生产构建出现多 React 实例或解析失败。

## 关键目录与入口

- `src/App.tsx`：应用路由、受保护壳层与一级页面装配。
- `src/lib/api-client.ts`、`src/lib/api-paths.ts`：控制台请求入口与路径常量。
- `src/stores/auth.ts`：登录态、refresh 流程与本地持久化。
- `src/pages/agent-browser/`：Agent Browser 多子路由调试面板。
- `src/features/`：按能力域拆分的 API / hooks / UI 模块。
- `src/components/layout/`：主壳层、导航与用户菜单。

## 继续阅读

- 工程规范：`../../../docs/reference/engineering-standards.md`
- 测试与验证：`../../../docs/reference/testing-and-validation.md`
- `src/features/CLAUDE.md`：feature 层状态与请求组织方式。
- `docs/design/anyhunt/core/request-and-state-unification.md`：请求、状态与实时通道统一规范。
- `docs/design/anyhunt/core/frontend-engineering-baseline.md`：Anyhunt 前端基线。
- `docs/design/anyhunt/features/agent-browser-architecture.md`：Agent Browser 页面与能力边界。
- `docs/design/anyhunt/features/agent-browser-governance.md`：Agent Browser 风控与治理约束。
- `docs/design/anyhunt/features/v2-intelligent-digest.md`：Digest / Memox 相关产品与数据语义。
