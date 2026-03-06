---
title: SidePanel 头部导航 + Explore Topics 专用页
date: 2026-01-17
scope: apps/anyhunt/www (Reader)
status: implemented
---

<!--
[INPUT]: 现状 Reader 左侧 SidePanel 存在 Discover 入口（Featured/Trending/Browse topics），且 Browse topics 仍是“三栏（左/中/右）”的一种 view
[OUTPUT]: 将入口精简为一个 “Explore topics”，并从左侧移除；将关键入口收敛到 SidePanel 头部（Logo + Explore + User），Explore 使用“左右布局”的专用页面
[POS]: 为下一步实现提供可执行的 IA / 路由 / 组件 / 验收标准，确保需求先对齐再落地
-->

# 背景与问题

> 本文档已合并 Reader/Explore 摘要规范，作为 Reader 与 Explore 信息架构单一事实源。

当前 Reader（`/`）左侧 SidePanel 的 Discover 区包含：

- Featured（Discover feed）
- Trending（Discover feed）
- Browse topics（Topics 浏览）

你希望：

1. 精简为一个入口：**Explore topics**
2. Explore 不在左侧列表里展示，而是放在 **左上角的顶部区域**
3. 顶部区域改为左右布局：
   - 左：Logo（点击永远回首页）
   - 右：`+`（进入 Explore topics 专用页）+ 头像（登录后下拉菜单）
4. Explore topics 进入后：不再是“左/中/右”三栏，而是 **左右布局**：
   - 左：保留当前最左侧 SidePanel
   - 右：一个“适合搜索”的新页面（全新构建，不复用旧的 Browse topics UI）
5. **所有关键状态必须同步到 URL**（刷新可恢复）：左侧一级路由 / 中间列表点击 / 切换到具体文章

# 目标与非目标

## 目标

- Reader 顶部提供一致的“回首页 / 进入 Explore / 用户菜单”能力，降低 SidePanel 的导航负担
- Explore topics 作为独立的专用页面（信息架构清晰、为搜索/发现优化）
- 进入 Explore 后，Reader 外壳保持（左侧 SidePanel 不变），但主内容区域切换为“搜索工作台”
- 交互保持轻量 Notion 风格：少跳转、低噪音、可预取、可键盘操作
- 关键状态都“可链接、可刷新恢复、可前进后退”

## 非目标（本提案不默认做）

- 不在本阶段重做 Digest 的算法（Featured/Trending 的排序/生成先保持后端现状）
- 不在本阶段实现“URL → 自动发现 RSS → 一键导入”的完整体验（自动发现可作为 Phase 2 做）

# 信息架构（IA）与路由（已实现）

## 现状（已实现）

- Reader 三栏布局视图（Discover / Topics / Inbox）由 `SidePanelView` 驱动：`apps/anyhunt/www/src/components/reader/side-panel/side-panel.types.ts`
- Browse topics 当前是 `view.type === 'topics'`，渲染 `TopicBrowseList`

## 目标态（已实现）

引入一个“可配置 Welcome”的首页入口，并把 Explore 变成独立路由：

### 1) Welcome：`/welcome`（三栏：左/中/右）

- 默认选中：`Welcome to Anyhunt`（可后台配置）
- 仍然保持三栏布局（与现状一致），用于引导“如何使用”
- 未登录时 SidePanel 尽量干净：只保留 `Welcome to Anyhunt` + `Recommended`（你在后台配置的推荐 Topics）

### 2) Explore topics：`/explore`（两栏：左/右）

- 左：保留 SidePanel（但不再放 Discover/Explore 入口）
- 右：Explore 搜索工作台（全新构建）

## URL 状态同步（强制）

你要求“不能只放在内部 state”，并且不希望出现“Home 入口”这样的官网语义，因此这里采用 **功能即路由** 的设计：

### A. 左侧一级路由（SidePanel）

用明确的功能路由（刷新可恢复）：

- Welcome：`/welcome`（也可以把 `/` 301/302 到 `/welcome`，但 UI 不出现 “Home”）
- Recommended Topic：`/topic/:slug`
- Inbox（登录后）：`/inbox`（可选：`/inbox/saved` 或 `?filter=saved`）

### B. 中间列表点击（list → detail）

点击列表项直接进入内容详情路由：

- 在 Topic 下点某条 edition：`/topic/:slug/editions/:editionId`
- 在 Inbox 点某条内容：同样跳转到该内容对应的 `topic/edition` 路由（保证 URL 可刷新恢复）

### C. 切换到具体文章页面（deep link）

为了“可分享/可刷新恢复”，建议 Reader 使用 **singular** 前缀，和 SEO 的 **plural** 前缀区分（避免冲突）：

- Reader：`/topic/:slug/editions/:editionId`
- SEO：`/topics/:slug/editions/:editionId`（Header/Footer）

这样：

- 从列表点文章 → 跳转 `/topic/:slug/editions/:editionId`
- 浏览器刷新仍可恢复到文章详情
- 仍保留现有 SEO 页面（用于外链/搜索引擎）

# SidePanel 头部导航（Header Actions）

你已确认：

- Explore 需要独立 URL：`/explore`
- 不需要左侧 SidePanel 的用户区（UserArea）

## Header 示例布局（ASCII）

```
┌───────────────────────────────────────────────────────┐
│ SidePanel Header                                        │
│ [Anyhunt]                                    [+]  [⦿/Avatar] │
├───────────────────────────────────────────────────────┤
│ SidePanel Body (Welcome / Recommended / Inbox ...)     │
└───────────────────────────────────────────────────────┘
```

## 交互

- Logo（SidePanel header 左侧）点击：跳转 `/welcome`（同时 `/` 重定向到 `/welcome`）
- `+`（SidePanel header 右侧）点击：跳转 `/explore`（可保持上次 query，例如 `?q=xxx`）
- User icon / Avatar（SidePanel header 右侧）
  - 已登录：显示头像，点击弹出 dropdown panel（Account/Settings/Sign out 等）
  - 未登录：显示 **icon-only 的登录按钮**（不显示文字，风格偏 Notion/Apple）

# Explore Topics 专用页（左右布局）

## 总体结构

Explore 打开后（`/explore`），左侧 SidePanel 保持不变；右侧改为一个专用页面：

```
┌───────────────┬──────────────────────────────────────────────────┐
│ SidePanel     │ Explore Topics                                   │
│               │ ┌──────────────────────────────────────────────┐ │
│               │ │ Title + helper text                           │ │
│               │ ├──────────────────────────────────────────────┤ │
│               │ │ Search input (keyword / URL / RSS)            │ │
│               │ │ Filters (chips / tabs)                         │ │
│               │ ├──────────────────────────────────────────────┤ │
│               │ │ Results list (cards)                           │ │
│               │ │ - Follow / Preview / Create subscription       │ │
│               │ └──────────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────┘
```

## 右侧页面具体布局（提案）

### 1) 顶部区（固定）

- 标题：`Explore topics`
- 辅助文案（英文，面向用户）：`Search topics, paste a URL, or add an RSS feed.`
- 搜索框（大号、居中偏上）
  - placeholder：`Search topics, paste a URL, or add an RSS feed…`
  - 自动识别输入类型：
    - `keyword`：默认
    - `url`：以 `http(s)://` 开头
    - `rss`：以 `.xml`/`rss`/`feed` 结尾或包含常见 RSS 特征（规则可后置）
- 搜索操作区（统一按钮触发）：
  - `Search`：按钮触发搜索（你已确认）
  - `Create`：独立创建入口（C 端需要“随时可创建”）
    - 有输入：以当前输入为 seed（keyword/url/rss）进入创建流程
    - 无输入：打开空白创建流程（聚焦输入框）

### 1.5) “搜索后首行固定创建”规则（强制）

你希望“用户可以直接创建”，即使有搜索结果也可能不是他想要的。因此：

- 用户点击 `Search` 后，无论是否有结果，结果区第一行固定展示：
  - `Create subscription for "<query>"`
  - 点击后进入创建流程（需要登录则先弹出登录）
- 如果输入看起来是 URL/RSS，文案改为：
  - `Create subscription from this URL`
  - `Create subscription from this RSS feed`

### 2) 过滤/导航区（可选）

你希望“精简”，因此建议第一版仅保留：

- `Trending`（唯一保留）

> 说明：这意味着我们会删除/下线与 Featured/Latest 相关的 Explore 展示与入口；Explore 只围绕 Trending + 搜索/创建。

### 3) 内容区（滚动）

#### 空态（未输入或未触发搜索）

空态仅展示一个 Trending 区块（卡片网格），让用户能浏览：

- Trending topics（热门）

每个 topic 卡片包含：

- 标题 / 描述（可选）
- 订阅人数 / 最近更新
- CTA：`Follow`（登录后可用；未登录触发登录弹窗）
- 辅助：`Preview`（打开预览，不跳出 Explore）

#### 搜索态（有 query）

结果区域改为列表（更适合快速扫读）：

- 左：结果列表（标题 + 描述 + stats + Follow）
- 预览建议用 **右侧 Drawer** 或 **Dialog** 打开，避免把“左右布局”再拆成第三列

## Explore 与“创建订阅”的关系（已对齐）

当前产品里“订阅”可能有两种形态：

1. Follow 一个公共 Topic（轻量）
2. 创建自定义 Subscription（关键词/来源等，更强）

你已明确：目标更偏向“创建”，但仍希望先搜索现有内容（Anyhunt 公共 topics），如果没有再创建并发布。因此 Explore 的交互是：

- 第一步：用户输入 keyword/url/rss → 点击 `Search`
- 第二步：系统检索“是否已有相近 public topic”
  - 有：展示结果，用户可 Follow/Preview
  - 没有：展示 `Create subscription`（主 CTA）
    - 登录后：创建 subscription，并发布为 public topic（保证后续可 Follow）

# 组件与状态拆分（实现建议）

## Reader 侧

- 将现有 SidePanel 顶部区域改造为 `SidePanelHeader`（承载 Logo / `+` / User）
- `SidePanel` 移除 Discover 导航（Featured/Trending/Browse topics）
- `SidePanel` 保留订阅/Inbox 等“核心导航”
- 删除 SidePanel 的 `UserArea`（你已确认不需要）
- **未登录时**：SidePanel 仅显示 `Welcome to Anyhunt` + `Recommended`（不展示 Inbox/Subscriptions 等）

## Welcome to Anyhunt（可配置首页入口）

你要求首页默认显示 `Welcome to Anyhunt` 且可后台动态配置，建议新增一个“可配置内容对象”：

- 名称建议：`WelcomePanel`（Reader 内部用），后台叫 `Welcome Config`
- 数据结构建议与 Subscription 类似（可编辑、可发布、可版本化），但不参与投递/抓取

最小 schema（我来拍板：**单条全局配置**，结构尽量“像订阅”但只做内容承载，避免复杂编辑器）：

```ts
WelcomeConfig = {
  id: string;
  enabled: boolean;
  // i18n-ready：当前默认英文；未来多语言时按 UI 语言选择内容
  // 约定：key 使用 BCP-47（en, zh-CN, zh-Hans 等），未命中时按 fallback 规则回退
  titleByLocale: Record<string, string>;           // 默认至少包含 { en: "Welcome to Anyhunt" }
  contentMarkdownByLocale: Record<string, string>; // 默认至少包含 { en: "..." }
  primaryAction?: {
    labelByLocale: Record<string, string>; // 默认至少包含 { en: "Explore topics" }
    action: 'openExplore' | 'openSignIn';
  };
  secondaryAction?: {
    labelByLocale: Record<string, string>; // 默认至少包含 { en: "Learn more" }
    action: 'openExplore';
  };
  updatedAt: string;
}
```

Locale 选择与回退（推荐规则）：

1. 若前端已有“用户显式语言设置”（未来新增），优先用该值
2. 否则用 UI 当前语言（浏览器 `navigator.language` / `Accept-Language` 推断）
3. 回退策略：精确匹配 → 主语言匹配（`zh-CN` → `zh`）→ `en` → 任意第一条

渲染建议：

- 左侧一级路由里出现一项 `Welcome to Anyhunt`
- 点击后 `/welcome`
- 中栏：展示“目录/步骤索引”（从 markdown headings 自动生成，像 Notion 的 outline）
- 右栏：展示当前 locale 的 `contentMarkdown`（含 CTA 区）

## Recommended（未登录可配置推荐 Topics）

你希望未登录 SidePanel 很干净：除 Welcome 外，剩下就是你可配置的推荐内容。

我建议：直接复用现有的 **Featured Topics** 能力，但在 UI 文案里统一叫 **Recommended**（避免新增 schema）：

- 后台仍用 `featured=true` / `featuredOrder` 来管理排序
- 不做历史兼容：旧的 “Featured” 相关 UI/文案/入口统一移除，仅保留后台能力与数据字段（对外展示统一叫 Recommended）
- 未登录 SidePanel 显示：
  - `Welcome to Anyhunt`
  - `Recommended`（list：你在后台标记的 topics）
- 点击某个推荐 topic：`/topic/:slug`（中栏显示 editions，右栏预览/详情）

## Explore 侧

- 新组件：`ExploreTopicsPage`（纯渲染 + 内部小组件）
- 新 hook：`useExploreTopicsController`
  - 管输入解析、query 状态、filters、数据拉取、预取

# 数据接口（尽量复用现有）

当前已有公共 topics 拉取：`getPublicTopics(env.apiUrl, { sort, search, limit })`（见 `apps/anyhunt/www/src/components/reader/TopicBrowseList.tsx`）。

Explore 第一阶段建议复用：

- Trending（Explore 空态）：`GET /api/v1/public/digest/topics?sort=trending&limit=...`
- Search（Explore 搜索）：`GET /api/v1/public/digest/topics?q=...&sort=trending`
- Recommended（未登录 SidePanel）：`GET /api/v1/public/digest/topics?featured=true&limit=...`

## Welcome Config 的接口（需要新增，但很小）

Welcome 必须“后台改完立即生效”，因此需要一条 public read + 一条 admin update：

- Public（未登录可读）：`GET /api/v1/public/digest/welcome`
- Public（可选 locale）：`GET /api/v1/public/digest/welcome?locale=zh-CN`（可选；默认由前端决定）
- Admin（运营配置）：`PUT /api/v1/admin/digest/welcome`

> WelcomeConfig 的存储建议走一张独立表（单条记录），避免和 Topic/Subscription 语义耦合。

## “先搜后创建”的落地（按现有能力拼装）

你希望：

1. 先在 Anyhunt 的公共 topics 里找（属于别人、公开可 Follow）
2. 没找到再让用户创建（成为他自己的内容）

后端已存在的能力可以直接串起来：

- 搜索：`GET /api/v1/public/digest/topics?q=<query>&sort=trending`
- Follow（存在时）：`POST /api/v1/app/digest/topics/:slug/follow`
- 创建（不存在时，一键创建）：
  1. `POST /api/v1/app/digest/subscriptions`（创建一个用户订阅）
  2. `POST /api/v1/app/digest/topics`（从该 subscription 发布为 public topic）

发布建议（默认值）：

- `visibility`: 默认 `PUBLIC`（可选给用户一个 Advanced dropdown 切到 `UNLISTED`）
- `slug`: 由用户输入生成（kebab-case），冲突时自动加后缀（例如 `-2`）
- `title`: Title Case（或直接用用户输入原文）
- `description`: 可选（为空也行）

## URL / RSS 输入（现状 + 推荐策略）

你问“我们应该没有 RSS 订阅规则吧？底层现在是怎么处理的？”——当前代码现状是：

- **订阅运行的核心来源是 Search**（`subscription.topic + interests` 拼 query 调用搜索），这是现有主路径
- **RSS 能力在服务端已经具备**（存在 `DigestRssService` + `DigestSource(type=rss)` + worker 刷新/入池），但目前 **Console 创建订阅的 DTO 里还没有暴露“添加 RSS 源”的字段**

我建议按“简单 + 可进化”的策略落地：

- Phase 1（推荐直接做）：
  - Explore 输入如果像 RSS（例如以 `.xml` 结尾等），创建时允许用户选择 “Use as RSS source”
  - 创建订阅后，额外创建/关联一个 `DigestSource(type=rss, config={feedUrl})` 到该订阅（`DigestSubscriptionSource`）
  - 如果 RSS 不可访问/不可解析：提示英文短句错误，并回退到“按关键词创建”（不阻断用户）
- Phase 1（URL）：
  - 普通 URL（非 RSS）先按 keyword 搜索（用 host/标题等作为 query），**不做站点爬取**（当前 siteCrawl 的链路不够完整，容易做复杂）
- Phase 2（可选）：
  - 自动发现 RSS（从 URL 尝试 `link rel=alternate`、`/feed`、`/rss.xml` 等），再引导用户确认

# 验收标准（Definition of Done）

- SidePanel header 出现：Logo（回 Welcome）、`+`（进 Explore）、User icon/avatar（登录菜单）
- SidePanel 不再出现 Featured/Trending/Browse topics 三个入口
- `Welcome to Anyhunt` 作为首页默认入口，并可后台动态配置内容（无需发版即可改文案/步骤/CTA）
- Explore topics：
  - 进入后整体为“左右布局”（左 SidePanel + 右 Explore 页面）
  - 支持关键词搜索 topics（按钮触发；至少复用现有 `search`）
  - 顶部常驻 `Create` 按钮（无论是否搜索）
  - 每次点击 `Search` 后，结果区第一行固定显示 `Create …` 入口（无论是否有结果）
  - Follow 需要登录：未登录点击 Follow 弹出登录引导（不跳页）
- 交互与性能：
  - 输入/切换时不出现大面积 layout shift
  - 关键组件按需 lazy（预览/导入流程可懒加载）
- URL 同步：
  - 左侧一级路由切换会更新 URL，刷新可恢复
  - 中间列表点选会更新 URL，刷新可恢复
  - 文章详情有可分享 URL（`/topic/:slug/editions/:editionId`）

# 风险与约束

- 如果多个入口同时保留（SidePanel + 顶部），信息架构会变得混乱；建议明确“SidePanel header 是唯一入口”
- Explore 的 URL/RSS 创建需要新增“订阅绑定 RSS 源”的写入链路（含 SSRF 校验与失败提示）
- WelcomeConfig 需要新增存储与 Admin 配置入口（建议单表单记录，变更可审计）

# 清理与删除（允许大幅重构/不兼容）

你已允许“没用的直接删、可以任意重构、不考虑历史兼容”，因此落地时建议同步做以下清理，避免系统里同时存在两套路由/数据流：

## 1) 前端（`apps/anyhunt/www`）

- 移除 SidePanel 中的 Discover 导航与相关视图：Featured/Trending/Browse topics
- 删除或重做旧的 `TopicBrowseList`（它是“Reader 中栏 Topics 浏览”，与你的新 Explore 专用页目标冲突）
- Reader 内移除 Discover feed 相关的状态与查询（只保留 Welcome/Recommended/Topic/Inbox）
- 新增/替换为：
  - SidePanelHeader（Logo / `+` / icon-only sign-in or avatar）
  - `/explore` 路由（两栏：SidePanel + Explore workbench）
  - `/topic/:slug/editions/:editionId` 路由（可刷新恢复）

## 2) 后端（`apps/anyhunt/server`）

- 若 Reader 不再使用 Discover feed：可以删除 `GET /api/v1/discover/*` 相关模块（discover.controller/service、缓存 key、无效化逻辑）
- 新增 WelcomeConfig 的存储与 Admin 配置接口（见上文 `GET /api/v1/public/digest/welcome` / `PUT /api/v1/admin/digest/welcome`）
- 若引入 RSS 作为订阅来源：补齐“创建/绑定 DigestSource(rss)”的写入链路（目前只有 worker 侧读取/刷新能力）

## 3) 文档（本仓库）

- 旧的「Discover/Featured/Trending」设计文档建议标注为 superseded，避免后续误读（见下文“相关历史文档”）

# 相关历史文档（已被本提案替代）

- `docs/design/anyhunt/features/www-reader-and-developer-split.md`（承接 homepage redesign 的路由边界）
- `docs/design/anyhunt/features/www-reader-and-developer-split.md`（承接 homepage reader redesign 的组件 SRP 收敛）

# 示例图（布局草图）

## 1) 未登录 - Welcome（`/welcome`）

```
┌──────────────────────────────────────────────────────────────────┐
│ SidePanel                                                     Main │
│ ┌───────────────────────┐ ┌────────────────────────────────────┐ │
│ │ [Anyhunt]      [+] [⦿]│ │ Middle (Outline)    | Right (Content)│ │
│ ├───────────────────────┤ ├────────────────────────────────────┤ │
│ │ Welcome                │ │ • Getting started   | # Welcome ... │ │
│ │ Recommended             │ │ • Explore topics    | ... markdown  │ │
│ │  - AI News              │ │ • Create subscription| [Explore]    │ │
│ │  - ...                  │ │                    |               │ │
│ └───────────────────────┘ └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## 2) 未登录 - Explore（`/explore`）

```
┌──────────────────────────────────────────────────────────────────┐
│ SidePanel                                                     Main │
│ ┌───────────────────────┐ ┌────────────────────────────────────┐ │
│ │ [Anyhunt]      [+] [⦿]│ │ Explore topics                      │ │
│ ├───────────────────────┤ │ [ input................ ][Search][Create]│
│ │ Welcome                │ │ Create subscription for "<q>"      │ │
│ │ Recommended             │ │ Trending (grid) / Results (list)   │ │
│ └───────────────────────┘ └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

# 默认决策（如无异议）

- `Recommended` 列表点击后直接进入对应 topic（`/topic/:slug`）
- Explore 的 “Create subscription” 默认会创建订阅并发布为 `PUBLIC` topic（可在 Advanced 里改成 `UNLISTED`）
- Welcome 默认 `en`，未来按 UI 语言选择 `contentMarkdownByLocale`/`titleByLocale`（含回退规则）
- UI 语言来源（未来多语言）：用户显式设置（若有） > 后端 profile（若有） > 浏览器 `navigator.language` / `Accept-Language`
- `/` 重定向到 `/welcome`

# 仍需你确认

暂无阻塞项；我会按本文档默认决策开始落地，并在实现中把不再使用的旧功能/旧路由直接删除。
