---
title: 'www：Reader 与 Developer 双模块布局方案'
date: 2026-01-15
scope: apps/anyhunt/www, anyhunt.app
status: implemented
---

<!--
[INPUT]: 现有 www 的 Reader 三栏布局 + 传统 Header/Footer 页面混杂现状
[OUTPUT]: 读者端（C 端）与开发者端（Developer）两套“壳层”拆分方案 + 交互规范
[POS]: 后续改造 `apps/anyhunt/www` 路由与布局时的落地蓝图

[PROTOCOL]: 本文件涉及路由/交互约束；若落地时改动路由与认证入口，需同步更新相关 CLAUDE.md 与文档索引。
-->

# 目标

将 `apps/anyhunt/www` 拆成两个“大模块”，并保证 Reader（C 端）内的交互不再“跳出”：

1. **Reader（C 端）**：三栏阅读器是主入口（`/`），任何“操作型”行为都应在该布局内完成（**弹窗/抽屉优先**）。
2. **Developer（开发者端）**：保留传统网站结构（顶部导航 + Footer），作为开发者资源导航页与营销/介绍页集合。

> 交互约束：遵循 Notion 风格 —— 减少页面跳转、就地完成任务、hover 才出现高级操作、弹窗优先、键盘可用与焦点管理。

# 现状与问题（已修复，用于背景）

目前 `anyhunt.app` 的 `/` 已是 Reader，但仍存在多处“跳出 Reader 壳层”的导航：

- **登录/注册跳出**：
  - `apps/anyhunt/www/src/components/reader/SidePanel.tsx`：未登录时 `Link to="/login"`
  - `apps/anyhunt/www/src/components/reader/WelcomeGuide.tsx`：`<a href="/login">`
- **Discover 跳出**：
  - 以前 SidePanel 的 “Browse all” 会跳到 `/discover`（独立页面，非 Reader 三栏）
  - 现在已移除 `/discover` 路由，改为 Reader 内中栏 Topics 浏览视图
- **Topic 预览跳出**：
  - `apps/anyhunt/www/src/components/reader/TopicCard.tsx`、`apps/anyhunt/www/src/components/reader/DiscoverDetail.tsx`、`apps/anyhunt/www/src/components/reader/SidePanel.tsx`：`Link to="/topics/$slug"`
  - `apps/anyhunt/www/src/routes/topics/*`：是独立页面（Header/Footer，偏 SEO/内容页）
- **Account Settings 跳出**：
  - 以前会跳到 `/settings`（独立页面，Header/Footer）
  - 现在已移除 `/settings` 路由，Reader 内使用 `AccountSettingsDialog` 弹窗

上述跳转会导致：用户上下文丢失（选中的订阅/文章）、心智割裂（Reader vs 网站页）、以及“操作成本”上升。

# 信息架构（目标态）

## 模块 1：Reader（C 端）

- **路由入口**：`/`
- **页面结构**：三栏（SidePanel / List / Detail），不使用全站 Header/Footer
- **操作原则**：登录/注册、账户设置、创建订阅、跟随 Topic、发布 Topic、订阅设置等均在 Reader 内通过弹窗/抽屉完成

## 模块 2：Developer（开发者端）

- **路由入口**：`/developer`（作为 Developer 主页/导航页）
- **页面结构**：顶部导航（Header）+ Footer（沿用 `apps/anyhunt/www/src/components/layout/*`）
- **内容定位**：
  - Fetchx / Memox 介绍页（`/fetchx`、`/memox`）
  - Pricing（`/pricing`）
  - Developer hub（`/developer`：导航与资源聚合）
  - SEO/公开内容页（如 `topics/*`）也可归入该壳层（保持 Header/Footer）

# Reader：交互方案（Notion 风格）

## 1) 统一 Auth 弹窗（替代 Reader 内的 /login /register 跳转）

### 触发点（Reader 内）

- SidePanel 顶部 “Sign in / Register”
- WelcomeGuide 主按钮 “Sign In to Get Started”
- 所有需要登录才能执行的动作（示例：Follow Topic、New Subscription、保存/不感兴趣等）

### 弹窗结构（建议）

- `AuthDialog`（Dialog/ResponsiveDialog）
  - Tab/Segment：`Sign in` / `Create account`
  - 子流程：`Forgot password`
  - 支持 `redirectTo`（用于 console/admin 重定向场景；Reader 内一般不需要强制跳转）

### Notion 风格细节

- 打开弹窗后 **自动聚焦第一个输入框**；关闭后焦点回到触发按钮
- Esc 关闭；Enter 提交；Tab 顺序正确
- 失败错误信息尽量“就地、短句、可恢复”，避免 toast 抢占注意力

### 落地建议（实现层面）

- 新增 `AuthModalProvider + useAuthModal()`（或在 `AuthProvider` 内扩展）
- Reader 内将所有 `to="/login"`/`href="/login"` 替换为 `openAuthModal({ initial: 'login' })`
- `New Subscription` 按钮建议“可点击但会弹出登录引导”，而不是 `disabled`（更符合 Notion 的“可发现性”）

## 2) Account Settings 弹窗（替代 Reader 内的 /settings 跳转）

- 将 `apps/anyhunt/www/src/components/reader/UserMenu.tsx` 的 `Account Settings` 改为打开 `AccountSettingsDialog`
- 弹窗内容建议保留原 Settings 页的信息结构：
  - Account：Email/Name
  - Developer tools：外链打开 `console.anyhunt.app`
  - Sign out：危险操作，二次确认（Notion 风格：轻量 confirm）
- `/settings` 路由不再保留（Reader-only）

## 3) Discover “Browse all” 留在 Reader 壳层

Reader 目标态需要“就地发现”（不跳出三栏壳层）：

- SidePanel 的 “Browse all” 改为进入 Reader 内的 Topics 浏览视图（仍在三栏里）
  - 左栏不变
  - 中栏：`TopicBrowseList`（Topic 搜索/列表 + Follow + 创建订阅）
  - 右栏：`TopicPreviewDetail`（Topic 预览 + 最近 editions + Follow）

> 已落地：不保留 `/discover` 路由，仅保留 Reader 内视图。

## 4) Topic 预览留在 Reader 壳层

Reader 内的 Topic 入口（Featured Topics、DiscoverDetail 的 “View Topic”、TopicCard 的 “Preview”）不应跳到 `topics/*` 的 SEO 页面。

建议两种落地策略（二选一，先易后难）：

- **方案 A（最小改动）**：Reader 内的 Topic 预览统一改为“新标签打开” `topics/$slug`，当前 Reader 不跳转（不丢上下文）。
- **方案 B（体验最佳）**：在 Reader 的右栏/弹窗内提供 `TopicPreview`（只读）
  - 支持：标题/描述/订阅数、最近 editions、Follow
  - 需要时再提供 “Open full topic page” 外链（新标签）

# Developer：页面与导航方案

## 1) Reader 中新增 Developer 入口（面向未登录也可见）

目标：不依赖 UserMenu（已登录才可见），在 Reader 左侧固定入口区提供“Developer”：

- 位置建议：SidePanel 的 Discover 区块下方，或 User 区块下方的固定导航（与 Notion 的固定入口一致）
- 行为：`Link to="/developer"`（跳到 Developer 壳层：顶部导航 + Footer）

## 2) `/developer` 作为“导航页”

现有 `apps/anyhunt/www/src/routes/developer.tsx` 已是资源卡片页，可升级为明确的导航枢纽：

- Products
  - Fetchx（内链 `/fetchx`）
  - Memox（内链 `/memox`）
- Resources
  - Docs（外链 `docs.anyhunt.app`）
  - Console（外链 `console.anyhunt.app`）
  - API Keys（外链 `console.anyhunt.app` 的具体路径，若有）
- Digest（C 端）
  - 明确入口：`Back to Reader` → `/`

## 3) Developer 顶部导航栏（Header）调整建议

当前 `Header` 的 “Home” 指向 `/`（Reader）。在“双模块”后，建议：

- 将 “Home” 改为 “Developer” 并指向 `/developer`
- 增加一个清晰的 “Digest”/“Reader” 入口指向 `/`（作为跨模块切换）
- 登录态按钮：
  - 若仍保留 `/login`、`/register` 页面：Developer 壳层可继续跳转
  - 若希望一致体验：Developer 壳层也可以复用同一套 `AuthDialog`

# 路由建议（汇总）

| 类别          | 路由                                    | 壳层                    | 说明                           |
| ------------- | --------------------------------------- | ----------------------- | ------------------------------ |
| Reader        | `/`                                     | Reader                  | 主入口（三栏）                 |
| Developer     | `/developer`                            | Header/Footer           | Developer 导航页               |
| Developer     | `/fetchx` `/memox` `/pricing`           | Header/Footer           | 开发者/营销页                  |
| Developer/SEO | `/topics/*`                             | Header/Footer           | 公开内容页（可被搜索引擎索引） |
| Auth（直达）  | `/login` `/register` `/forgot-password` | Header/Footer（或弹窗） | 用于 console/admin 重定向场景  |

# 分阶段落地计划（建议）

1. **Phase 1：Reader 内统一 Auth 弹窗**
   - 替换 Reader 内所有登录跳转为弹窗
   - 需要登录的操作改为“触发弹窗”而不是跳页/禁用
2. **Phase 2：Reader 内 Account Settings 弹窗**
   - 替换 `UserMenu -> AccountSettingsDialog`（不再跳转路由）
3. **Phase 3：Discover/Topic 预览不跳出 Reader**
   - 先做最小改动（新标签打开），再迭代为 Reader 内 Preview（如需）
4. **Phase 4：Developer 导航与 Header 信息架构统一**
   - 明确 `/developer` 为 Developer Home
   - Header 增加 Reader/Developer 的双向入口

# 需要你确认的决策点（我等你拍板）

1. Reader 内的 Topic “Preview” 你更倾向：
   - A：新标签打开 `topics/*`（最快，不丢 Reader 上下文）
   - B：Reader 内做只读 TopicPreview（体验最佳，工作量更大）
2. `/login`、`/register` 是否继续保留为独立页面（用于 console/admin redirect），还是也统一为弹窗入口？
3. `/discover` 是否保留为独立路由（但渲染 Reader 壳层的 DiscoverAll），还是彻底去掉并仅保留 Reader 内视图？

---

# 实施结果（2026-01-15）

- 已落地：Topic Preview（Reader 右栏预览，不再跳转到 `topics/*`）
- 已落地：Auth 统一为全局弹窗（Reader/Developer 均可调用；`/login`/`/register`/`/forgot-password` 作为“打开弹窗”的入口页）
- 已落地：移除 `/discover` 独立页面（Topics 浏览改为 Reader 中栏视图）
- 已落地：Reader 左侧新增 Developer 入口；Developer 壳层保留 Header/Footer，并可通过导航切换到 Digest
