---
title: 设计系统
date: 2026-03-15
scope: monorepo
status: active
---

<!--
[INPUT]: macOS 原生质感北极星 + 现有 UI token + 跨产品交互约束
[OUTPUT]: 全产品线统一设计系统（Moryflow + Anyhunt，PC/Mobile/Web）
[POS]: docs/reference/ 设计系统唯一事实源

[PROTOCOL]: 仅在设计原则、token 定义、交互约束或平台差异失真时更新本文件。
-->

# 设计系统

全产品线（Moryflow PC/Mobile/Web + Anyhunt Console/Admin）统一遵守的设计系统。

北极星：**macOS 原生应用质感** — 克制、层次分明、手感精致。

## 设计原则

1. **黑白灰为主**：彩色仅用于状态指示和关键强调，不作为装饰
2. **圆润边角**：禁止生硬直角，所有容器、卡片、输入框都使用圆角
3. **留白即设计**：宁可多留白，不可拥挤；间距传达层级
4. **阴影微妙克制**：不使用重阴影，通过极细边框 + 微阴影表达层级
5. **动效自然**：200-300ms 的流畅过渡，遵循 `prefers-reduced-motion`
6. **层级感**：通过表面颜色差异和阴影建立深度，不依赖强边框
7. **直接操控**：优先就地编辑/展开，减少模态打断
8. **渐进式披露**：默认展示最少信息，按需展开细节

## 交互约束

- 少打扰、少术语、少入口、明确下一步
- 主路径文案面向普通用户，禁止暴露内部协议术语
- 成功状态优先安静反馈（如 inline 状态变化），避免无意义 toast
- 破坏性操作（删除、重置）必须有确认，且按钮使用 `destructive` 变体
- 加载状态使用 Skeleton 或 inline spinner，不使用全屏 loading
- 空状态使用 `Empty` 组件，提供引导文案和操作入口

## 颜色

Token 单一事实源：`packages/ui/styles/index.css`

### Light（冷灰基调，对齐 macOS 系统偏好）

| Token         | HSL           | Hex 参考 | 用途            |
| ------------- | ------------- | -------- | --------------- |
| `background`  | `240 11% 96%` | #F2F2F7  | 页面背景        |
| `card`        | `0 0% 100%`   | #FFFFFF  | 卡片/面板       |
| `popover`     | `240 10% 98%` | #F8F8FC  | 浮层/下拉       |
| `primary`     | —             | #181824  | 主按钮/关键文字 |
| `secondary`   | `240 8% 93%`  | —        | 次级按钮/背景   |
| `muted`       | `240 8% 93%`  | —        | 禁用/辅助       |
| `border`      | `240 6% 89%`  | #E1E1E9  | 边框            |
| `destructive` | `4 70% 55%`   | #E05550  | 危险操作        |
| `success`     | `145 55% 42%` | #3DA66E  | 成功状态        |
| `warning`     | `35 85% 52%`  | #E8A035  | 警告状态        |

### Dark（深邃冷黑，微妙表面层级）

| Token        | HSL          | Hex 参考 | 用途      |
| ------------ | ------------ | -------- | --------- |
| `background` | `240 5% 8%`  | #131316  | 页面背景  |
| `card`       | `240 4% 11%` | #1B1B1E  | 卡片/面板 |
| `popover`    | `240 3% 14%` | #222226  | 浮层/下拉 |
| `foreground` | `240 4% 92%` | #E9E9EE  | 主文字    |
| `border`     | `240 4% 17%` | —        | 边框      |
| `sidebar`    | `240 4% 11%` | #1B1B1E  | 侧边栏    |

暗黑模式阴影使用更高透明度（0.2-0.5 vs 亮色 0.03-0.15）。

## 字体

- 系统字体栈：`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 代码字体：`"SF Mono", "Fira Code", "Cascadia Code", monospace`

### 字号阶梯

| 用途     | className                             | 场景              |
| -------- | ------------------------------------- | ----------------- |
| 页面标题 | `text-xl font-semibold`               | 页面/模块标题     |
| 区域标题 | `text-sm font-semibold`               | 卡片标题/分组标题 |
| 正文     | `text-sm`                             | 主要内容          |
| 辅助文字 | `text-xs text-muted-foreground`       | 时间、标签、说明  |
| 上标标签 | `text-xs uppercase tracking-[0.16em]` | 分类标签          |

## 圆角

| 场景           | className     | 实际值 |
| -------------- | ------------- | ------ |
| 标签、徽章     | `rounded`     | 4px    |
| 按钮、输入框   | `rounded-lg`  | 8px    |
| 卡片、面板     | `rounded-xl`  | 12px   |
| 大卡片、模态框 | `rounded-2xl` | 16px   |
| Sheet、抽屉    | `rounded-2xl` | 16px   |
| 消息气泡       | `rounded-3xl` | 24px   |

## 阴影

| 级别     | Token          | 用途                             |
| -------- | -------------- | -------------------------------- |
| 微阴影   | `shadow-xs`    | 卡片默认状态                     |
| 轻阴影   | `shadow-sm`    | 悬浮卡片、下拉菜单               |
| 中阴影   | `shadow-md`    | 模态/对话框                      |
| 浮动阴影 | `shadow-float` | 拖拽元素、浮动按钮（含边框强调） |

优先使用 `border border-border/60` + `shadow-xs` 组合表达层级，而非重阴影。

## 间距

基于 4px 网格。

| 场景           | className       | 实际值      |
| -------------- | --------------- | ----------- |
| 元素内紧凑间距 | `gap-1` / `p-1` | 4px         |
| 组件内间距     | `gap-2` / `p-2` | 8px         |
| 紧凑区域内边距 | `p-3`           | 12px        |
| 标准区域内边距 | `p-4`           | 16px        |
| 宽松区域内边距 | `p-5` / `p-6`   | 20px / 24px |
| 页面侧边距     | `px-6`          | 24px        |

## 动效

| Token             | 时长  | 用途                 |
| ----------------- | ----- | -------------------- |
| `duration-fast`   | 150ms | hover/focus 响应     |
| `duration-normal` | 200ms | 展开/折叠、tab 切换  |
| `duration-slow`   | 300ms | 页面过渡、Sheet 进出 |

缓动曲线：

| Token          | 值                                  | 用途     |
| -------------- | ----------------------------------- | -------- |
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)`      | 通用过渡 |
| `ease-in`      | `cubic-bezier(0.4, 0, 1, 1)`        | 退出动画 |
| `ease-out`     | `cubic-bezier(0, 0, 0.2, 1)`        | 进入动画 |
| `ease-bounce`  | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性强调 |

所有动效必须尊重 `prefers-reduced-motion`。

## 图标

- 统一使用 Lucide：PC/Web `lucide-react`，Mobile `lucide-react-native`
- 禁止 `@hugeicons/*` 或其他并行图标体系
- 能直接用 Lucide 组件就直接用，不新增无意义包装层
- 标准尺寸：`size-4`（16px）正文内，`size-5`（20px）独立图标

## 组件约定

- 容器编排与展示组件分离（单一职责）
- 共享业务状态遵循 Store-first（Zustand + methods）
- Zustand selector 禁止返回对象/数组字面量新引用
- 多状态 UI 使用"状态片段化 + switch/renderByState"，禁止链式三元
- 表单统一 `react-hook-form` + `zod/v3`（服务端保持 `zod` 主入口）
- Markdown 渲染统一走 `@moryflow/ui` 消息组件
- Streamdown 动画参数单一事实源：`packages/ui/src/ai/streamdown-anim.ts`

## 平台差异

| 能力            | PC (Electron)                        | Mobile (RN)                       | Web (TanStack)           |
| --------------- | ------------------------------------ | --------------------------------- | ------------------------ |
| 样式框架        | Tailwind v4 + shadcn/ui              | Uniwind (Tailwind v4 for RN)      | Tailwind v4 + shadcn/ui  |
| 图标            | `lucide-react`                       | `lucide-react-native`             | `lucide-react`           |
| 主题            | CSS 变量 + `next-themes`             | CSS 变量 + `@variant dark`        | CSS 变量 + `next-themes` |
| 全局样式        | `@moryflow/ui/styles` + `global.css` | `global.css` (Uniwind)            | `@moryflow/ui/styles`    |
| 动画            | Motion (`motion/react`)              | RN Animated                       | Motion (`motion/react`)  |
| 保留 `style={}` | —                                    | 动态值、Animated.View、第三方组件 | —                        |

## Token 实现事实源

- CSS Token：`packages/ui/styles/index.css`
- Mobile Token：`apps/moryflow/mobile/global.css`
- Streamdown 动画：`packages/ui/src/ai/streamdown-anim.ts`

## 变更门禁

涉及以下改动时，必须同步更新本文件：

1. 设计原则变化
2. 颜色/圆角/阴影/动效 token 变化
3. 图标体系变化
4. 组件架构模式变化
5. 平台差异矩阵变化
