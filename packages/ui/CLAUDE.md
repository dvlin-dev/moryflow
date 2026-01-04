# @aiget/ui

> 统一 UI 组件库，来自 Moryflow 项目

## 目录结构

```
src/
├── ai/                 # AI 相关组件（代码块、消息等）
├── animate/            # 动画组件和效果
├── components/         # 基础 UI 组件
├── hooks/              # 通用 Hooks
├── icons/              # 图标组件
├── lib/                # 工具函数
└── index.ts            # 主入口
styles/                 # 全局样式
```

## 导入方式

```tsx
// 组件
import { Button, Card } from '@aiget/ui/components/button';

// AI 组件
import { CodeBlock } from '@aiget/ui/ai/code-block';

// 动画
import { Highlight } from '@aiget/ui/animate/primitives/effects/highlight';

// 工具
import { cn } from '@aiget/ui/lib/utils';

// Hooks
import { useMobile } from '@aiget/ui/hooks/use-mobile';
```

## 技术栈

- React 19
- Tailwind CSS v4
- Radix UI
- Shiki（代码高亮）
- Motion（动画）

## 开发命令

```bash
# 类型检查
pnpm typecheck
```

## 来源说明

此包的内容来自 Moryflow 项目的 `@moryflow/ui` 包，保持 `@aiget/ui` 命名以兼容 Aiget monorepo。

---

_版本: 2.0 | 更新日期: 2026-01-05_
