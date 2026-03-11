# Moryflow WWW 整站优化方案

> **Status**: `in_progress` — Phase 1~3 已完成，待视觉验收

## 执行进度

| Phase       | 内容                                            | 状态     | 变更文件数 |
| ----------- | ----------------------------------------------- | -------- | ---------- |
| **Phase 1** | Token 系统重建 + Inter 字体 + 滚动动画 hook     | **Done** | 3          |
| **Phase 2** | 核心组件改造（Header/Footer/Hero/9 个 Section） | **Done** | 11         |
| **Phase 3** | 子页面 + SEO 模板 + 共享组件 + workspace-demo   | **Done** | 14         |
| **Phase 4** | 视觉验收 + 性能检查                             | Pending  | —          |

### Phase 1 详细变更

| 文件                           | 改动                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/globals.css`       | 删除全部 `mory-*` token；改为 `@import '@moryflow/ui/styles'`；新增 `brand`/`brand-light`/`brand-lighter`/`brand-dark`/`tertiary` 色彩 token；新增 `gradient-brand`/`gradient-hero-glow`/`gradient-section-subtle` 营销渐变；新增 5 组入场动画 keyframe + scroll-reveal CSS |
| `src/hooks/useScrollReveal.ts` | 新建。`useScrollReveal<T>()` 单元素入场 + `useScrollRevealGroup<T>()` stagger 入场，基于 IntersectionObserver                                                                                                                                                               |
| `src/routes/__root.tsx`        | 加载 Google Fonts Inter 400~800；`theme-color` 从 `#FF9F1C` 改为 `#7C5CFC`；body class 从 `bg-mory-bg text-mory-text-primary` 改为 `bg-background text-foreground`                                                                                                          |

### Phase 2 详细变更

| 组件                     | 关键改动                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header**               | 毛玻璃效果 `bg-background/80 backdrop-blur-xl`；移除 `font-serif`；语义化 token                                                                      |
| **Footer**               | `bg-card` 语义化；Beta badge 改为 `bg-brand/10 text-brand` 紫色调；移除 `font-serif`                                                                 |
| **AgentFirstHero**       | 紫色径向 glow 背景；标题 `font-extrabold tracking-tight`；accent 文字紫色渐变 `bg-clip-text text-transparent`；4 层 stagger 入场动画                 |
| **CorePillarsSection**   | Shadow 卡片替代 border 卡片；三色图标 tint（brand/success/warning）；抽象 UI mockup 替代灰色占位；hover `-translate-y-0.5 + shadow-lg`；stagger 入场 |
| **WorkflowLoopSection**  | `gradient-section-subtle` 背景；渐变步骤数字；桌面端连接线；每步独立色调；stagger 入场                                                               |
| **UseCasesSection**      | Shadow 卡片 + hover elevation；hover 渐变 accent bar；每个 use case 独立 tint；stagger 入场                                                          |
| **TelegramAgentSection** | 渐变背景区域；shadow 卡片替代 border；品牌紫链接色                                                                                                   |
| **CompareStripSection**  | Shadow + hover elevation；品牌紫 CTA；stagger 入场                                                                                                   |
| **PublishingSection**    | Shadow 卡片；精致双面板 mockup（窗口 chrome + 渐变桥接线）；success tint 检查图标                                                                    |
| **SocialProofSection**   | 从占位 testimonials 改为 stats 展示（Open Source / Public Beta / macOS）                                                                             |
| **DownloadCTA**          | 紫色径向 glow；shadow 卡片；success 色下载完成状态                                                                                                   |

### Phase 3 详细变更

| 文件                        | 关键改动                                                                    |
| --------------------------- | --------------------------------------------------------------------------- |
| **FaqSection**              | `gradient-section-subtle` 背景；shadow 卡片替代 border                      |
| **DownloadCtaSection**      | 紫色径向 glow 装饰                                                          |
| **SeoLandingPage**          | Hero glow 背景；shadow 卡片；品牌紫 workflow 步骤数字和图标                 |
| **ComparePage**             | Hero glow；渐变 section；shadow 卡片；圆角表格                              |
| **features.tsx**            | Hero glow；交替左右布局（odd/even）；差异化 tint；抽象 mockup；stagger 入场 |
| **download.tsx**            | Hero glow；shadow 卡片 + hover；stagger 入场                                |
| **pricing.tsx**             | Hero glow；`border-brand` 紫色卡片边框；scale-up 入场动画                   |
| **use-cases.tsx**           | Hero glow；shadow 卡片；差异化 tint per case；stagger 入场                  |
| **about.tsx**               | Hero glow；shadow 卡片；差异化 value tint；stagger values                   |
| **privacy.tsx / terms.tsx** | 移除 `prose-headings:font-serif`                                            |
| **workspace-demo**          | 已移除，Hero 改为纯文案 + 视觉占位                                          |

---

## 一、现状审查总结

### 1.1 核心问题：WWW 与 PC 视觉体系脱节

| 维度           | WWW 现状                        | PC 端现状                           | 问题                 |
| -------------- | ------------------------------- | ----------------------------------- | -------------------- |
| **品牌色**     | `#ff9f1c` (橙色)                | `#622AFF` (紫色)                    | 看起来像两个不同产品 |
| **背景色**     | `#f7f7f5` (冷灰白)              | `#F7F5F2` (暖米白 HSL 40 20% 96%)   | 色温不一致           |
| **字体**       | Serif 标题 + 系统 Sans          | Inter 全局                          | 字体体系完全割裂     |
| **Token 系统** | 自建 `mory-*` 独立 Token        | `@moryflow/ui/styles` 语义化 Token  | 两套不互通的设计系统 |
| **Dark Mode**  | 无                              | 完整 Light/Dark 支持                | 体验断层             |
| **圆角**       | `mory-sm/md/lg/xl` (8/12/16/24) | `radius-sm~2xl` (6/8/12/16/20)      | 两套体系             |
| **阴影**       | 3 级 (sm/md/lg)                 | 7 级 (xs~2xl + float)               | 层次表达力差异大     |
| **动效**       | 仅 1 个 fade-in 关键帧          | 完整 duration/easing/keyframes 体系 | 官网反而更简陋       |

### 1.2 视觉质量问题

1. **扁平单调**：所有区块都是 白卡片 + 浅灰背景 + 细边框，缺乏视觉节奏和层次
2. **占位内容未替换**：CorePillarsSection、FeaturesPage 的演示区域仍是灰色占位框
3. **SocialProofSection 纯占位**：没有实际内容，降低可信度
4. **CTA 层级单一**：所有按钮都是深黑底白字，无主次区分
5. **缺少现代感**：没有渐变、没有微妙的光效、卡片全靠边框而非阴影建立层次
6. **Section 间缺乏过渡**：各模块之间缺乏视觉呼吸和韵律
7. **图标使用单一**：所有图标背景都是 `mory-orange/10` 圆角方块，视觉疲劳

### 1.3 技术质量问题

1. **Token 系统未复用**：`globals.css` 重新定义了一套独立 token，没有消费 `@moryflow/ui/styles`
2. **无滚动动画**：没有 Intersection Observer 触发的入场动画
3. **无 Dark Mode 支持**：甚至没有 `prefers-color-scheme` 媒体查询
4. **Header 背景硬编码**：`bg-white` 而非语义化 token
5. **字体未引入**：没有加载 Inter 字体，依赖系统 fallback

---

## 二、设计方向

### 2.1 核心原则

> **官网是 PC 产品的延伸，视觉必须同源；但作为营销站点，允许在同一体系内更加精致和表现力更强。**

1. **Token 同源**：消费 `@moryflow/ui/styles` 的语义化 Token，仅扩展营销专用 Token
2. **色调统一**：采用 PC 的暖中性色基底，品牌色过渡到与紫色体系协调的方向
3. **字体统一**：切换到 Inter，通过字重和字号建立层级
4. **现代克制**：在 Notion 式克制基调上加入现代 SaaS 常见的微妙渐变、玻璃效果和精致动效
5. **Dark Mode Ready**：消费语义化 token 自动获得 dark mode 能力

### 2.2 色彩体系重建

```
品牌主色（与 PC 统一）
├── Primary: 暖灰黑 #2A2825 (主 CTA、强调)
├── Brand Accent: #622AFF → 官网可用更亮的变体 #7C5CFC (渐变起点)
├── Gradient: #7C5CFC → #A78BFA (紫调渐变，用于 Hero、重点区域)
│
暖中性底色（与 PC 统一）
├── Background: #F7F5F2 (暖米白)
├── Card: #FCFAF7 (暖白卡片)
├── Paper: #FDFCFA (最浅暖白)
│
语义色（复用 @moryflow/ui）
├── Success: #3DA66E
├── Warning: #E8A035
├── Destructive: #E05550
│
营销扩展色
├── Hero Gradient: radial-gradient(800px, #7C5CFC/7%, transparent)
├── Section Subtle: linear-gradient(180deg, hsl(250 50% 98%), hsl(40 20% 96%))
└── CTA Glow: radial-gradient(600px, #7C5CFC/5%, transparent)
```

### 2.3 字体体系

```
Inter (与 PC 统一，Google Fonts 加载 400~800)
├── Display: Inter 800, text-5xl~7xl, tracking-tight
├── Heading: Inter 700, text-2xl~4xl, tracking-tight
├── Subheading: Inter 600, text-lg~xl
├── Body: Inter 400, text-base, leading-relaxed
└── Caption: Inter 500, text-sm, tracking-wide (eyebrow)
```

### 2.4 动效体系

```
入场动画 (IntersectionObserver, once: true)
├── fade-up: translateY(24px→0) + opacity, 600ms ease-out
├── fade-in: opacity only, 600ms
├── scale-up: scale(0.96→1) + opacity, 600ms
├── slide-left/right: translateX(±24px→0) + opacity, 600ms
│
Stagger（useScrollRevealGroup）
├── 默认间隔: 80~120ms
└── [data-reveal-item] 子元素自动编排
│
微交互
├── 卡片 hover: shadow-sm → shadow-lg + translateY(-0.5~-1px)
├── 链接箭头: hover translateX(+0.5px)
└── 按钮 hover: shadow-md
```

---

## 三、变更文件汇总

共涉及 **28 个文件**：

**基础设施 (3)**:

- `src/styles/globals.css` — Token 系统重建
- `src/hooks/useScrollReveal.ts` — 新建
- `src/routes/__root.tsx` — Inter 字体 + 语义化 body

**布局 (2)**:

- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`

**Landing sections (9)**:

- `AgentFirstHero.tsx`, `CorePillarsSection.tsx`, `WorkflowLoopSection.tsx`
- `UseCasesSection.tsx`, `TelegramAgentSection.tsx`, `CompareStripSection.tsx`
- `PublishingSection.tsx`, `SocialProofSection.tsx`, `DownloadCTA.tsx`

**Workspace demo**: 已移除（Hero 改为纯文案 + 视觉占位）

**共享组件 (2)**:

- `src/components/shared/FaqSection.tsx`
- `src/components/shared/DownloadCtaSection.tsx`

**SEO 模板 (2)**:

- `src/components/seo-pages/SeoLandingPage.tsx`
- `src/components/seo-pages/ComparePage.tsx`

**页面路由 (5)**:

- `features.tsx`, `download.tsx`, `pricing.tsx`, `use-cases.tsx`, `about.tsx`
- `privacy.tsx`, `terms.tsx` (仅移除 serif)

---

## 四、风险与约束

1. **i18n 文案不变**：本次重构仅涉及视觉和交互，不改变文案内容
2. **路由结构不变**：不新增或删除页面路由
3. **SEO 不受影响**：JsonLd、meta、sitemap 逻辑不变
4. **Dark Mode 自动获得**：消费语义化 token 后，只要 html 加上 `.dark` class 即可切换暗色主题
5. **Serif → Sans 调性变化**：从古典优雅变为现代科技感，这是有意为之，与 PC 端统一
