# @aiget/ui

> 统一 UI 组件库，整合 Moryflow 和 Fetchx 项目

## 目录结构

```
src/
├── ai/                 # AI 相关组件（代码块、消息等）- 来自 Moryflow
├── animate/            # 动画组件和效果 - 来自 Moryflow
├── components/         # Moryflow 风格基础 UI 组件
├── primitives/         # Fetchx 风格基础 UI 组件（radix-lyra 风格）
├── composed/           # Fetchx 组合组件
├── hooks/              # 通用 Hooks
├── icons/              # 图标组件
├── lib/                # 工具函数
└── index.ts            # 主入口
styles/                 # 全局样式
```

## 导入方式

```tsx
// Moryflow 风格组件
import { Button, Card } from '@aiget/ui/components/button';

// Fetchx 风格组件（radix-lyra 风格，方角设计）
import { Button, Card } from '@aiget/ui/primitives';

// Fetchx 组合组件
import { DataTable, PageHeader } from '@aiget/ui/composed';

// AI 组件
import { CodeBlock } from '@aiget/ui/ai/code-block';

// 动画
import { Highlight } from '@aiget/ui/animate/primitives/effects/highlight';

// 工具
import { cn } from '@aiget/ui/lib';

// Hooks
import { useIsMobile } from '@aiget/ui/hooks/use-mobile';
```

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
- `primitives/`、`composed/` - 来自 Fetchx

---

_版本: 3.0 | 更新日期: 2026-01-05_
