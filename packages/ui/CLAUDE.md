# /ui

> 统一 UI 组件库，采用 Moryflow 风格与 Lucide

## 目录结构

```
src/
├── ai/                 # AI 相关组件（代码块、消息、输入、工具等）- 来自 Moryflow
├── animate/            # 动画组件和效果 - 来自 Moryflow
├── components/         # Moryflow 风格基础 UI 组件
├── composed/           # 组合组件（基于 components）
├── hooks/              # 通用 Hooks
├── icons/              # 图标组件
├── lib/                # 工具函数
└── index.ts            # 主入口
styles/                 # 全局样式
```

## 导入方式

```tsx
import { Button, Card } from '@moryflow/ui';
import { DataTable, PageHeader } from '@moryflow/ui/composed';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import { Highlight } from '@moryflow/ui/animate/primitives/effects/highlight';
import { cn } from '@moryflow/ui/lib';
import { useIsMobile } from '@moryflow/ui/hooks/use-mobile';
import { ChevronDown } from 'lucide-react';
```

## 图标规范

- 统一使用 `lucide-react`（Web/PC）与 `lucide-react-native`（Mobile）
- 组件内直接使用 Lucide 组件，不新增 `Icon` 包装层
- 动态 icon 通过 `LucideIcon` 类型 + `<IconComponent />` 渲染
- 禁止 `@hugeicons/*`、`@tabler/icons-react`

## 主题与样式

- 统一 Token 与基础样式来自 `styles/index.css`（含 `tailwindcss` + `tw-animate-css`）
- 业务侧只需 `@import '@moryflow/ui/styles'`，再为自身代码声明 `@source`
- 应用专属样式（Electron/编辑器等）仅放在应用内，不放入 UI 包

## 约束

- `verbatimModuleSyntax` 开启时，类型必须使用 `import type`

## 近期变更

- 2026-03-02：Reasoning 组件开合策略收敛：streaming 进入时自动展开，streaming 结束 `1000ms` 自动折叠；用户手动展开后不再自动折叠。Tool/Reasoning 样式同步去容器化（同层文字流表达），并补齐 `reasoning.test.tsx` 自动折叠回归用例。
- 2026-02-10：Streamdown 升级至 v2.2：启用逐词流式动画；`@source` 扫描 `streamdown/dist/*.js`（Tailwind v4 生成依赖类名）；Streamdown 动画基础样式改为在 `styles/index.css` 内联（避免部分 Vite/PostCSS 环境无法解析 `streamdown/styles.css` 导致 dev 崩溃）；新增 `findLastTextPartIndex` 供多端精确定位最后一个 text part；新增全局检索标记 `STREAMDOWN_ANIM` 便于定位动画链路与作用点；新增 `src/ai/streamdown-anim.ts` 作为动画参数单一事实来源（duration/easing/sep/animation）。
- 2026-02-10：ScrollArea：修复可拖拽侧栏等窄容器内的列表省略号不生效问题（覆盖 Radix ScrollArea Viewport 默认 `display: table` 的内容容器为 `block + w-full`，避免宽度按内容扩张）。
- 2026-02-08：Message parts 解析抽为纯函数（`splitMessageParts/cleanFileRefMarker`），PC/Console 统一复用，避免语义漂移。
- 2026-02-08：MessageList：未传 threadId 时使用稳定默认 key，避免消息数组截断/压缩导致的意外 remount。
- 2026-02-08：ConversationViewport：消息区域与 Footer 分离，滚动条仅出现在消息区域（不覆盖输入框）。
- 2026-02-07：消息列表交互回归经典 chat（bottom-anchor Following）：AI 流式输出自动追随；用户任意上滑暂停；滚回底部/按钮恢复。
- 2026-02-07：AutoScroll：改为纯滚动指标判定上滑取消；同时过滤 layout shrink / viewport resize 造成的 scrollTop 回退，避免 following 被误关（导致“滚动条拖不动/追随失效”）。
- 2026-02-07：AutoScroll：移除调试日志输出，避免无用噪音。
- 2026-02-07：ConversationViewport：禁用 `overflow-anchor` + `scrollbar-gutter: stable`，降低滚动抖动与闪烁。
- 2026-02-07：移除 `packages/ui/src/ai/assistant-ui` 目录；AutoScroll/Store 内聚到 `packages/ui/src/ai/conversation-viewport/*`。
- 2026-02-07：runStart：进入 running 时触发一次 `scrollToBottom({ behavior: 'smooth' })`，让“用户消息 + AI loading”在底部可见（不再发送贴顶）。
- 2026-02-07：runStart：新增消息入场动效（user + AI loading，`160ms` 向上滑入 + 淡入），增强“向上出现”的反馈。
- 2026-02-01：图标库回退 Lucide（`lucide-react` / `lucide-react-native`），移除 Hugeicons 依赖与 Icon 包装层。

## 技术栈

- React 19
- Tailwind CSS v4
- Radix UI（@radix-ui/\*）
- Shiki（代码高亮）
- Motion（动画）
- next-themes（主题切换）

## 开发命令

```bash
# 类型检查
pnpm typecheck
```

## 来源说明

- `components/`、`ai/`、`animate/`、`icons/` - 来自 Moryflow
- `composed/` - 来自 Fetchx（已统一基于 components）

---

_版本: 4.19 | 更新日期: 2026-03-02_
