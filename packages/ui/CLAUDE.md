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

- 2026-03-05：`src/ai/tool.tsx` 状态徽章职责从 `ToolHeader` 下沉到 `ToolContent`：`ToolHeader` 保持两行纯展示，`ToolContent` 新增 `state/statusLabels` 显式入参负责右下角悬浮状态，消除绝对定位对父级上下文的隐式耦合；`test/tool-shell-redesign.test.tsx` 同步更新。
- 2026-03-05：修复复制链路稳定性：`src/ai/tool.tsx` 的 `OutputCopyButton` 与 `src/ai/markdown-table.tsx` 的 `MarkdownTable` 统一改为“重复点击先清理旧 timer + 组件卸载清理悬挂 timer”；同时修复 Markdown 表格复制时对单元格 `|` 与换行的转义，避免复制后列结构损坏；新增 `test/markdown-table.test.tsx`，并在 `test/tool-shell-redesign.test.tsx` 增补回归断言，覆盖 rapid re-click、unmount 与转义场景。
- 2026-03-05：`src/ai/reasoning.tsx` 折叠箭头方向与 ToolSummary 对齐：关闭态改为向右（`-rotate-90`），展开态向下（`rotate-0`）；`test/reasoning.test.tsx` 新增回归断言。
- 2026-03-05：`src/ai/conversation.tsx` 提升消息列表项默认垂直间距：`ConversationContent` 从 `gap-1` 调整为 `gap-2.5`，用于改善 user 消息与前后 assistant 消息的视觉分组；`test/message-list.test.tsx` 新增回归断言。
- 2026-03-05：`src/ai/reasoning.tsx` 触发器样式收敛：移除前置思考 icon，仅保留“文案 + 下拉箭头”；默认文案由 `Thought process` 改为 `Thinking`，并在 `test/reasoning.test.tsx` 新增“无前置 icon”回归断言。
- 2026-03-05：修复 `src/ai/tool.tsx` 输出区超高不可滚动：为 `ScrollArea` 增加 viewport 级高度约束（`h-auto + max-h-[168px]`）并将内容容器宽度改为 `w-max + min-w-full`，确保输出超长时可同时横向/纵向滚动；`test/tool-shell-redesign.test.tsx` 新增回归断言。
- 2026-03-05：`src/ai/tool.tsx` 二轮修正：CommandResult 输出移除重复命令行（Header 已展示）；ToolOutput 移除 `px-3` 与 `rounded-lg` 消除内层容器视觉；输出区高度降为 `max-h-[168px]`（原 `max-h-60` 的 70%）；输出文本改为 `whitespace-pre` 启用横向+纵向滚动。
- 2026-03-05：`src/ai/tool.tsx` 修正 Tool Bash 卡片样式：外层摘要与卡片间距 `mt-0.5` → `mt-2`；移除 ToolOutput 内层独立边框/背景消除双层卡片视觉；状态徽章定位上下文提升至 ToolContent（`relative`），ToolHeader 移除 `relative` 与多余 `pb-7`；输出区顶部遮罩降低强度。
- 2026-03-05：`src/ai/tool.tsx` 收敛 Tool 外层摘要与 Bash 卡片间距：`ToolSummary` 改为行内触发器（icon 紧贴文本，去除 `flex-1` 拉伸）、Tool 外层默认去除额外 `mb`，并同步收敛输出区遮罩强度与内边距；`test/tool-shell-redesign.test.tsx` 新增行内触发器回归断言。
- 2026-03-05：`src/ai/tool.tsx` 新增 `ToolSummary` 外层折叠标题并将 `ToolHeader` 降级为纯展示层（不再承担触发器）；外层标题优先消费 Tool 内置摘要（`input.summary`），缺失时由共享命令摘要兜底自然句式；同步保留内层 Bash Card（两行 Header、固定滚动输出、复制按钮、右下状态）并补齐 `test/tool-shell-redesign.test.tsx` 回归。
- 2026-03-05：`src/ai/tool.tsx` 清理无效 API：删除 `ToolOutput` 的 `onOpenFullOutput` 入参及 `viewFullOutput` label 协议，避免“类型仍保留但 UI 不消费”的死链路；Truncated 输出保持“预览 + full path”文本表达。
- 2026-03-05：`src/ai/tool.tsx` 重构为 Bash Card 结构：Header 固定两行（script type + command）、移除前置状态 icon、输出区固定 `max-h-60` 滚动 + 顶部遮罩 + 右上复制按钮、右下悬浮状态；保留 `Apply to file` 条件动作。新增 `test/tool-shell-redesign.test.tsx` 回归覆盖。
- 2026-03-02：Reasoning 组件开合策略收敛：streaming 进入时自动展开，streaming 结束后立即自动折叠（无延迟）；用户手动展开后不再自动折叠。Tool/Reasoning 样式同步去容器化（同层文字流表达），并补齐 `reasoning.test.tsx` 自动折叠回归用例。
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
