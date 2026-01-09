# @aiget/ui

> 统一 UI 组件库，采用 Moryflow 风格与 Hugeicons

## 目录结构

```
src/
├── ai/                 # AI 相关组件（代码块、消息等）- 来自 Moryflow
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
import { Button, Card, Icon } from '@aiget/ui';
import { DataTable, PageHeader } from '@aiget/ui/composed';
import { CodeBlock } from '@aiget/ui/ai/code-block';
import { Highlight } from '@aiget/ui/animate/primitives/effects/highlight';
import { cn } from '@aiget/ui/lib';
import { useIsMobile } from '@aiget/ui/hooks/use-mobile';
```

## 图标规范

- 统一使用 `@hugeicons/react` + `@hugeicons/core-free-icons`
- 禁止使用 `lucide-react`、`@tabler/icons-react`
- 组件内默认使用 `Icon` 封装（`size=18`，`strokeWidth=1.5`）

## 主题与样式

- 统一 Token 来源为 `styles/index.css`，与 Moryflow 保持一致
- UI 组件依赖 `border-border-muted`、`shadow-float`、`duration-fast` 等 Token

## 约束

- `verbatimModuleSyntax` 开启时，类型必须使用 `import type`

## 技术栈

- React 19
- Tailwind CSS v4
- Radix UI / radix-ui（统一包）
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

_版本: 4.2 | 更新日期: 2026-01-09_
