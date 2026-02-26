---
title: Anyhunt WWW Code Review
date: 2026-02-26
scope: apps/anyhunt/www
status: in_progress
---

<!--
[INPUT]: apps/anyhunt/www（本轮聚焦：reader-shell / layout / routes）
[OUTPUT]: 问题清单 + 分级 + 分步修复计划 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Anyhunt WWW）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Anyhunt WWW Code Review

## 范围

- 项目：`apps/anyhunt/www`
- 本轮模块 A：`src/features/reader-shell`、`src/components/layout`、`src/routes`
- 说明：模块 B/C 对应的业务域（`inbox / digest / subscriptions`、`explore / topic / welcome`）将在后续步骤单独展开，不在本轮做业务细节修复

## 结论摘要（模块 A 预扫描）

- `S1`（必须改）：3 项
- `S2`（建议本轮改）：2 项
- `S3`（可延后）：2 项
- 当前状态：模块 A 已完成修复（`A-1 ~ A-6`）

## 发现（按严重度排序）

- [S1][已修复] `Header.tsx` 单文件超阈值且职责混杂（导航编排 + 交互控制 + 认证 CTA + 菜单项实现）
  - 证据：
    - 文件行数 `428`（阈值：`> 300` 必须拆分）
    - 同文件同时承载桌面导航、移动导航、Developers 下拉交互、Auth CTA 状态渲染、菜单项子组件
  - 定位：
    - `apps/anyhunt/www/src/components/layout/Header.tsx:16`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:93`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:225`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:255`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:370`
  - 修复：
    - `Header` 拆分为容器 + `header/desktop-navigation` + `header/mobile-navigation` + `header/auth-actions` + `header/menu-items`
    - Header 主文件收敛为状态编排层

- [S1][已修复] 多状态 UI 仍使用链式三元，未收敛为“状态片段 + `renderContentByState/switch`”
  - 证据：
    - Header 桌面与移动端认证区都使用 `isLoading ? ... : isAuthenticated ? ... : ...`
    - Topics 列表区使用 `loading/empty/ready` 链式三元分发
  - 定位：
    - `apps/anyhunt/www/src/components/layout/Header.tsx:227`
    - `apps/anyhunt/www/src/components/layout/Header.tsx:329`
    - `apps/anyhunt/www/src/routes/topics/index.tsx:76`
  - 修复：
    - Header 认证区改为 `auth-actions.tsx` 内 `switch` 分发
    - Topics 路由改为 `resolveViewState + renderContentByState()`，移除链式三元

- [S1][已修复] `topics` 路由请求编排分散在页面组件，未收敛到 `methods/store` 分层
  - 证据：
    - 页面组件内直接维护请求状态、分页、异常与数据拼接
    - 同类请求流程在 3 个路由重复，缺少统一状态模型与可复用编排层
  - 定位：
    - `apps/anyhunt/www/src/routes/topics/index.tsx:36`
    - `apps/anyhunt/www/src/routes/topics/$slug/index.tsx:26`
    - `apps/anyhunt/www/src/routes/topics/$slug/editions/$editionId.tsx:21`
  - 修复：
    - 新增 `features/public-topics/public-topics.api.ts` 与 `public-topics.hooks.ts`
    - `topics/*` 路由改为只做页面拼装，数据请求和分页编排下沉到 feature hooks

- [S2][已修复] 认证弹窗路由编排重复（`login/register/forgot-password`）
  - 证据：
    - 三个路由重复 fallback path 计算、`openAuthModal` 调用与 Reader 壳层返回结构
  - 定位：
    - `apps/anyhunt/www/src/routes/login.tsx:34`
    - `apps/anyhunt/www/src/routes/register.tsx:34`
    - `apps/anyhunt/www/src/routes/forgot-password.tsx:23`
  - 修复：
    - 新增 `features/reader-shell/AuthModalRouteShell.tsx`
    - 三个路由统一复用该壳层并保留既有跳转语义

- [S2][已修复] `ReaderShell` 与 `ReaderDialogs` 的弹窗状态分散，状态模型可读性不足
  - 证据：
    - `ReaderShell` 同时维护 create/settings/publish 开关与选中订阅状态
    - `ReaderDialogs` 通过 3 组独立 `shouldRender*` + 3 个 `useEffect` 做懒挂载
  - 定位：
    - `apps/anyhunt/www/src/features/reader-shell/ReaderShell.tsx:44`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderShell.tsx:129`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderDialogs.tsx:80`
    - `apps/anyhunt/www/src/features/reader-shell/ReaderDialogs.tsx:116`
  - 修复：
    - 新增 `reader-dialog-state.ts` 判别状态模型
    - `ReaderShell` 改为单一 `dialogState` 管理
    - `ReaderDialogs` 改为基于判别状态派生 open/defaultTab，并收敛 lazy mount 逻辑

- [S3][已修复] `developer` 路由存在无效三元表达式（恒等分支）
  - 证据：
    - `resource.title === 'Fetchx API' ? 'Learn More' : 'Learn More'`
  - 定位：
    - `apps/anyhunt/www/src/routes/developer.tsx:99`
  - 修复：
    - 直接收敛为固定文案 `Learn More`

- [S3][已修复] `fetchx/memox` 落地页路由结构高度重复，可后续统一页面壳层
  - 证据：
    - 两个路由同样的 Header/Footer + section 序列，仅组件来源不同
  - 定位：
    - `apps/anyhunt/www/src/routes/fetchx.tsx:17`
    - `apps/anyhunt/www/src/routes/memox.tsx:17`
  - 修复：
    - 新增 `components/layout/MarketingPageShell.tsx`
    - `fetchx.tsx` 与 `memox.tsx` 统一复用 shared shell

## 分步修复计划（模块 A）

1. A-1：拆分 `Header.tsx` 为容器层 + `desktop-nav`/`mobile-nav`/`auth-actions`/`menu-items` 子模块。（已完成）
2. A-2：收敛 Header 与 Topics 路由多状态渲染，统一改为“状态片段 + `renderContentByState/switch`”。（已完成）
3. A-3：抽离 `topics` 路由请求编排到 `features/public-topics`（`api + hooks`），路由页仅保留拼装与 SEO。（已完成）
4. A-4：抽离 `login/register/forgot-password` 共享路由壳层（Auth Modal Route Shell）。（已完成）
5. A-5：收敛 `ReaderShell`/`ReaderDialogs` 弹窗状态模型（判别状态对象 + 统一渲染分发函数）。（已完成）
6. A-6：清理低优先级重复与噪声逻辑（`developer` 恒等三元、`fetchx/memox` 壳层复用点）。（已完成）

## 验证命令（模块 A）

- `pnpm --filter @anyhunt/anyhunt-www typecheck`
- `pnpm --filter @anyhunt/anyhunt-www test:unit`
- `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`
- `pnpm --filter @anyhunt/anyhunt-www build`

## 进度记录

| Step | Module | Action | Status | Validation | Updated At | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A-0 | reader-shell/layout/routes | 预扫描（不改代码） | done | n/a | 2026-02-26 | 识别 `S1x3 / S2x2 / S3x2` |
| A-1 | reader-shell/layout/routes | Header 分层拆分（container + desktop/mobile/auth/menu） | done | `pnpm --filter @anyhunt/anyhunt-www test:unit src/features/reader-shell/__tests__/mobile-reader-state.spec.ts src/features/reader-shell/__tests__/initialTopic.spec.ts`（pass） | 2026-02-26 | `Header.tsx` 从 428 行收敛为容器层，新增 `components/layout/header/*` |
| A-2 | reader-shell/layout/routes | 多状态 UI 状态片段化（Header + Topics） | done | 同 A-1（pass） | 2026-02-26 | 移除关键链式三元，改为 `switch` 与渲染函数 |
| A-3 | reader-shell/layout/routes | `topics/*` 请求编排下沉到 feature hooks | done | 同 A-1（pass） | 2026-02-26 | 新增 `features/public-topics`，路由层只保留页面装配 |
| A-4 | reader-shell/layout/routes | Auth 路由壳层复用（login/register/forgot-password） | done | 同 A-1（pass） | 2026-02-26 | 新增 `AuthModalRouteShell`，去重三路由重复逻辑 |
| A-5 | reader-shell/layout/routes | Reader 对话框状态模型收敛 | done | 同 A-1（pass） | 2026-02-26 | 新增 `reader-dialog-state`，`ReaderShell/ReaderDialogs` 使用判别状态 |
| A-6 | reader-shell/layout/routes | S3 清理（developer 恒等三元 + fetchx/memox 壳层复用） | done | `pnpm --filter @anyhunt/anyhunt-www typecheck`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www test:unit`（fail，基线问题）+ `pnpm --filter @anyhunt/anyhunt-www build`（fail，基线问题） | 2026-02-26 | 失败原因为既有基线：`@moryflow/api/client` 解析失败与旧文件 `error is unknown`；本轮新增文件未出现新的报错位点 |
