# WWW (Anyhunt Dev Website)

> This folder structure changes require updating this document.

## Overview

Anyhunt Dev 官网（`anyhunt.app`），C 端主战场，包含模块页 `/fetchx`、`/memox`。基于 TanStack Start（SSR），包含 Fetchx Demo Playground 和 Digest Reader 主流程。

## Responsibilities

- 平台官网（统一入口）
- 模块页路由：Fetchx / Memox
- Docs 外链入口：`https://docs.anyhunt.app`
- SEO：canonical 固定 `https://anyhunt.app`（`www.anyhunt.app` 在反代层 301 到 `anyhunt.app`）
- Fetchx Demo Playground（验证码保护）
- Digest Public Pages（SEO）：Topics / Editions（`/topics`）
- **Reader 壳层（C 端）**：`/welcome`（默认，Welcome Pages 列表 + `?page=` 选中项）/ `/explore` / `/topic/*` / `/inbox/*`（状态驱动 URL，可刷新恢复）
- Reader 内操作不跳页：登录/注册/忘记密码通过全局 Auth 弹窗完成
- Reader-only：不保留 `/settings` 等独立用户页面路由
- Pricing / Code Examples / CTA
- Root error boundary：异常时展示友好兜底页（`routes/__root.tsx`）
- Build chunk 拆分：通过 `vite.config.ts` 的 `manualChunks` 控制首包体积（SSR 需避免与 external 冲突）

## Constraints

- Server-side rendering (SSR)
- Public + Auth（Reader/Digest/Inbox 需要登录）
- Session 相关 API 统一走 `/api/v1/app/*`，public 内容统一走 `/api/v1/public/*`
- Cloudflare Turnstile for captcha
- Demo API has rate limits
- 组件统一从 `/ui` 导入，图标统一 Lucide（`lucide-react`，直接组件调用）
- 全局样式仅引入 `/ui/styles`，`@source` 只扫描本应用源码
- Docker 构建固定使用 pnpm@9.12.2（避免 corepack pnpm@9.14+ 在容器内出现 depNode.fetching 报错）
- Docker 构建安装依赖使用 `node-linker=hoisted` 且关闭 `shamefully-hoist`，避免 pnpm link 阶段崩溃
- Vite `vite-tsconfig-paths` 需跳过 `archive/external-repos`，避免外部仓库 tsconfig 解析失败
- `vite.config.ts` 中 `manualChunks` 必须使用「函数形式」（基于 `id` 判断），避免 SSR build external 依赖导致 Rollup 报错（`react` 典型）。
- SSR 必须保持 `react`/`react-dom`（含 `react/jsx-runtime`）为 external，避免 React 在多个 SSR chunks 中被重复打包导致 hooks dispatcher 不一致（线上会报 `useRef` 读取 null）。

## 近期变更

- 官网图标回退 Lucide，移除 Hugeicons 依赖并统一调用方式
- Dockerfile 补齐 `packages/types` 的 workspace package 依赖拷贝，避免 pnpm install 报 `WORKSPACE_PKG_NOT_FOUND`
- www API client + Digest API 切换 raw JSON + RFC7807 错误体解析
- www API client/公有 API 调用对非 JSON 响应抛出 `UNEXPECTED_RESPONSE`
- Welcome API 复用 `parseJsonResponse`，移除重复错误解析逻辑
- 新增 `parseJsonResponse` 非 JSON/无效 JSON 单元测试
- Digest/Demo 调用改为 app/public 前缀（移除旧 `/api/v1/console/*` 与 `/api/v1/digest/*`）
- 修复 Reader 新建订阅点击事件误传导致初始主题异常，新增初始主题归一化回归测试

## 环境变量

- `VITE_API_URL`：后端 API 地址（生产必填）
- 生产环境默认：`https://server.anyhunt.app`
- `VITE_TURNSTILE_SITE_KEY`：Turnstile Site Key（可选）
- 示例文件：`.env.example`

## Directory Structure

| Directory                | Description                     |
| ------------------------ | ------------------------------- |
| `routes/`                | File-based routing (TanStack)   |
| `components/reader/`     | Reader layout components        |
| `components/landing/`    | Landing page sections           |
| `components/memox/`      | Memox module page sections      |
| `components/playground/` | Demo playground UI              |
| `components/layout/`     | Header, Footer                  |
| `features/digest/`       | Digest API, hooks, types        |
| `features/reader-shell/` | Reader shell (layout + dialogs) |
| `features/welcome/`      | Welcome content panes           |
| `features/explore/`      | Explore topics workbench        |
| `features/topic/`        | Topic reader panes              |
| `features/inbox/`        | Inbox reader panes              |
| `hooks/`                 | Custom hooks                    |
| `lib/`                   | API calls, utilities            |
| `stores/`                | Zustand stores (auth/session)   |
| `types/`                 | Type definitions                |
| `styles/`                | Global styles                   |

## Components

### Reader Components (首页)

| Component               | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `ReaderLayout`          | Three-column layout container                                  |
| `MobileReaderLayout`    | Mobile-optimized layout                                        |
| `ReaderTwoColumnLayout` | Two-column layout container (sidebar + main)                   |
| `SidePanel`             | Left sidebar (Header actions + Welcome/Recommended/Inbox/Subs) |
| `MarkdownView`          | Lazy markdown renderer (react-markdown chunk)                  |
| `ReaderDialogs`         | Reader 内操作弹窗统一出口（Create/Settings/Publish）           |

### Landing Sections

| Component            | Description          |
| -------------------- | -------------------- |
| `HeroSection`        | Main hero with CTA   |
| `FeaturesSection`    | Feature highlights   |
| `UseCasesSection`    | Use case examples    |
| `PricingSection`     | Pricing tiers        |
| `CodeExampleSection` | API code samples     |
| `StatsSection`       | Platform statistics  |
| `CTASection`         | Final call-to-action |

### Playground Components

| Component         | Description               |
| ----------------- | ------------------------- |
| `HeroPlayground`  | Main playground in hero   |
| `QuickPlayground` | Compact playground widget |
| `UrlInput`        | URL input with validation |
| `ResultPreview`   | Scrape result display     |
| `PresetButtons`   | Quick preset URLs         |
| `Turnstile`       | Cloudflare captcha        |

## Features

### Digest Feature (`features/digest/`)

- `api.ts` - Digest API functions (subscriptions, inbox, runs, topics)
- `hooks.ts` - React Query hooks for digest operations
- `types.ts` - TypeScript type definitions

### Reader Shell (`features/reader-shell/`)

- `ReaderShell.tsx` - Reader layout wrapper (2-pane / 3-pane) + dialogs
- `ReaderThreePane.tsx` / `ReaderTwoPane.tsx` - Convenience wrappers

## Routes

```
routes/
├── __root.tsx      # Root layout
├── index.tsx       # Redirect `/` -> `/welcome`
├── welcome.tsx     # Reader welcome page (/welcome)
├── explore.tsx     # Reader explore page (/explore)
├── topic/          # Reader topic routes (/topic/*)
├── inbox/          # Reader inbox routes (/inbox/*)
├── fetchx.tsx      # Fetchx module page (/fetchx)
├── memox.tsx       # Memox module page (/memox)
├── login.tsx       # Auth route (opens Auth modal over Reader)
├── register.tsx    # Auth route (opens Auth modal over Reader)
├── forgot-password.tsx # Auth route (opens Auth modal over Reader)
├── topics/         # Public topic pages
└── developer.tsx   # Developer hub page (/developer)
```

## Key Files

| File                              | Description                               |
| --------------------------------- | ----------------------------------------- |
| `lib/api-base.ts`                 | API base URL 解析                         |
| `lib/auth-session.ts`             | Access Token 生命周期（store + refresh）  |
| `lib/api-client.ts`               | API client（Bearer + refresh）            |
| `lib/api-paths.ts`                | Centralized API path constants            |
| `lib/env.ts`                      | Public environment config                 |
| `stores/auth-store.ts`            | Access token store + persistence          |
| `hooks/useCaptchaVerification.ts` | Turnstile captcha hook                    |
| `hooks/useKeyboardShortcuts.ts`   | Reader keyboard shortcuts                 |
| `hooks/useIsMobile.ts`            | Mobile detection hook                     |
| `router.tsx`                      | Router factory (SSR per-request)          |
| `entry-client.tsx`                | Client hydration                          |
| `entry-server.tsx`                | SSR entry point                           |
| `vitest.config.ts`                | 单元测试配置（node 环境）                 |
| `vite.config.ts`                  | Vite/Nitro/TanStack Start config + chunks |

## Homepage View Flow

```
未登录用户:
  默认显示 /welcome（Welcome + Recommended）
  可进入 /explore 搜索/浏览 Trending

已登录用户（有订阅）:
  默认显示 /welcome
  Inbox：/inbox（支持 subscriptionId/state 过滤，状态同步到 URL）

已登录用户（无订阅）:
  默认显示 /welcome → 引导进入 /explore 创建订阅
```

## 交互与架构规范（Notion 风格 / 强约束）

> 目的：保证 Reader“不中断上下文”的产品体验，同时让代码结构可持续演进。

### Reader 交互（必须遵守）

- Reader 是 C 端主流程的唯一壳层：用户完成订阅/浏览/预览/阅读/账号相关操作时 **不跳出 Reader 布局**。
- 认证相关（登录/注册/忘记密码）统一使用 **Auth Modal**，不做独立页面交互。
- 设置/历史/建议/发布等“操作型流程”统一使用 **Reader 内弹窗/抽屉**（`ReaderDialogs` 为统一渲染出口）。
- 保持上下文：打开弹窗/切换视图不应清空左/中/右栏的选择状态；关闭后用户能“回到刚才的位置”。
- Loading 使用 Skeleton（避免强干扰 spinner）；尽量避免 layout shift。
- 出错时优先局部兜底（单栏失败不影响整个 Reader）；兜底提供 Retry/Back/Welcome 等清晰动作。
- 乐观更新必须可回滚：按钮展示 pending 状态并禁用重复操作；失败时恢复 UI 并给出清晰反馈（toast/inline）。

### 组件设计（SRP / Props 收敛）

- 避免“长 Props 注入”模式：当一个组件需要同时支持多个视图分支（Discover/Topics/Inbox…）时，应改为 **判别联合 ViewModel** 或拆分为多个 SRP 组件。
- 推荐结构：容器层（hooks/组装 ViewModel） + 纯渲染层（只消费 model），边界清晰，便于测试与性能优化。
- 性能约束：ViewModel 必须引用稳定（`useMemo`），回调必须稳定（`useCallback`）；避免每次 render 构造大量新对象导致无意义 rerender。
- 继续保持现有 code-splitting：重型视图与弹窗 lazy-load；`manualChunks` 与 SSR `noExternal` 必须一致。

### SSR Router（反代/部署关键约束）

- **SSR 必须每个请求创建新的 Router**：禁止在服务端复用 Router 单例（会被“第一次请求”的 Host/Proto 污染）。
- 典型症状：部署在 `IP:端口` 上、由另一台机器反代到域名时，出现 `Maximum number of redirects exceeded`（Location 指向同一路径，形成自循环）。
- 反代必须传递：`Host`、`X-Forwarded-Host`、`X-Forwarded-Proto`（否则 SSR 推导 origin 可能不稳定）。

### 计划文档

- 重构路线与进度跟踪：`docs/products/anyhunt-dev/features/www-reader-srp-and-props-refactor.md`

## Common Modification Scenarios

| Scenario             | Files to Modify                         | Notes                    |
| -------------------- | --------------------------------------- | ------------------------ |
| Add landing section  | `components/landing/`                   | Create section component |
| Update pricing       | `components/landing/PricingSection.tsx` |                          |
| Change playground    | `components/playground/`                |                          |
| Add captcha rule     | `hooks/useCaptchaVerification.ts`       |                          |
| Update reader layout | `components/reader/`                    |                          |
| Add digest API       | `features/digest/api.ts`                |                          |
| Add discover API     | `features/discover/api.ts`              |                          |

## Dependencies

```
www/
├── @tanstack/start - SSR framework
├── @tanstack/react-query - Data fetching
├── zustand - Auth store + persistence
├── /ui - UI components
├── lucide-react - Icon library
├── turnstile - Cloudflare captcha
└── tailwindcss - Styling
```

## Key Exports

This is a standalone app, no exports to other packages.
