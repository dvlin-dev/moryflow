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
import { Button, Card } from '@anyhunt/ui';
import { DataTable, PageHeader } from '@anyhunt/ui/composed';
import { CodeBlock } from '@anyhunt/ui/ai/code-block';
import { Highlight } from '@anyhunt/ui/animate/primitives/effects/highlight';
import { cn } from '@anyhunt/ui/lib';
import { useIsMobile } from '@anyhunt/ui/hooks/use-mobile';
import { ChevronDown } from 'lucide-react';
```

## 图标规范

- 统一使用 `lucide-react`（Web/PC）与 `lucide-react-native`（Mobile）
- 组件内直接使用 Lucide 组件，不新增 `Icon` 包装层
- 动态 icon 通过 `LucideIcon` 类型 + `<IconComponent />` 渲染
- 禁止 `@hugeicons/*`、`@tabler/icons-react`

## 主题与样式

- 统一 Token 与基础样式来自 `styles/index.css`（含 `tailwindcss` + `tw-animate-css`）
- 业务侧只需 `@import '@anyhunt/ui/styles'`，再为自身代码声明 `@source`
- 应用专属样式（Electron/编辑器等）仅放在应用内，不放入 UI 包

## 约束

- `verbatimModuleSyntax` 开启时，类型必须使用 `import type`

## 近期变更

- ConversationViewport/Slack：新增顶部 inset 计算，避免顶部 header 遮挡最新消息
- ConversationViewport：启用 scroll-smooth 曲线并记录距底距离/滚动中状态
- ScrollButton：仅在上滚超过一屏时显示，自动滚动期间隐藏
- MessageList/Viewport：移除 content/emptyState 的 full height，Footer 使用 mt-auto，恢复 sticky 正常贴底
- MessageList：初次加载自动滚动、run start/新 user 消息触发滚动、流式时插入 thinking 占位
- MessageList/Viewport：补齐 min-h-0，避免 Slack 拉高容器导致输入区不可见
- MessageList：锚点与 Slack 逻辑回到列表层，避免 Message 依赖 Viewport
- MessageList：Slack 仅作用于最后一条消息，减少订阅与 DOM 更新
- ConversationViewport：AutoScroll/ResizeObserver/MutationObserver 对齐 assistant-ui，top anchor 滚动锁覆盖内容扩展
- ConversationViewport：Resize/Mutation 触发使用 rAF 节流，降低 streaming 抖动
- ConversationViewport：useSizeHandle 改为受控 ref 测量与清理
- ConversationViewportSlack：订阅式 min-height + em/rem clamp，避免首帧闪烁
- ScrollButton：迁移到 ViewportFooter，固定在输入框上方
- Breadcrumb/Pagination/Carousel/Calendar/ContextMenu/Menubar/AI 导航箭头统一改为 ChevronLeft/ChevronRight（无中轴）
- Form：回退场景使用稳定 id，避免 aria 关联错位
- Form：生产环境缺失 FormField/FormItem 上下文时回退渲染，避免白屏
- Select/Accordion/NavigationMenu/Calendar 等下拉/折叠箭头统一改为 ChevronDown（无中轴）
- Tool：折叠箭头改为 ChevronDown（无中轴）
- DropdownMenu：子菜单指示箭头改为 ChevronRight（无中轴）
- RadioGroup/ContextMenu/Menubar：单选指示图标统一为实心圆（移除空心外环）
- DropdownMenu：单选指示图标改为实心圆，保持选中态更清晰
- UI 包图标回退到 Lucide，移除 Icon 包装与 Hugeicons 依赖
- 类型映射统一为 Record，移除 Circle 泛型依赖
- ToolOutput：打开完整输出时补齐错误边界
- ToolOutput：新增截断输出标识与完整输出打开入口
- PromptInput：附件转换失败/提交失败通过 `onError` 反馈，`accept` 规则支持扩展名与 MIME
- ToolOutput：允许渲染 `0`/`false` 等非空输出
- MessageList：切换为 Viewport/Slack 交互，移除占位逻辑与消息高度外置计算
- ConversationViewport：新增滚动状态与高度测量 primitives（Viewport/Footer/Slack/ScrollButton）
- TurnAnchor 交互固定为 top，移除 turnAnchor/autoScroll 对外配置
- ConversationViewport：Slack 仅在有效测量后生效，避免首帧大空白
- Sidebar：统一 `offcanvas` 命名与 Slot 引用，移除 `radix-ui` 依赖
- Accordion/Highlight：状态派生与 ref 清理，补齐 client 边界
- Chart：Tooltip 支持 `0` 值展示并补充单测
- Testing：新增 packages/ui 单元测试配置与基础用例

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

_版本: 4.6 | 更新日期: 2026-02-03_
