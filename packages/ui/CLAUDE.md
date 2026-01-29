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
- MessageList：新增通用消息列表封装，统一占位与滚动布局并补齐稳定 key
- useConversationLayout：优化最新消息查找与渲染路径，避免多余数组反转
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

_版本: 4.6 | 更新日期: 2026-01-28_
