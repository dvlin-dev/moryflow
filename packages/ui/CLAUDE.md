# @aiget/ui

> 统一 UI 组件库，基于 shadcn/ui + Radix UI + Tailwind CSS v4

## 目录结构

```
src/
├── components/
│   ├── primitives/      # 基础 shadcn/ui 组件
│   └── composed/        # 组合业务组件
├── hooks/               # 通用 Hooks
├── lib/                 # 工具函数
└── styles/              # 全局样式
```

## 导入方式

```tsx
// 基础组件
import { Button, Card } from '@aiget/ui/primitives';

// 组合组件
import { DataTable, PageHeader } from '@aiget/ui/composed';

// 工具
import { cn } from '@aiget/ui/lib';
```

## 技术栈

- React 19
- Tailwind CSS v4
- Radix UI (via radix-ui package)
- shadcn/ui 组件模式

## 开发命令

```bash
# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

## 来源说明

- `primitives/` - 统一的 shadcn/ui 基础组件
- `composed/` - 跨产品共享的业务组件

## TODO

- [ ] 在第三阶段迁移 Flowx 时添加 AI 组件（ai/）
- [ ] 在第三阶段迁移 Flowx 时添加动画组件（animate/）
- [ ] 在第三阶段迁移 Flowx 时添加图标组件（icons/）

---

_版本: 1.0 | 创建日期: 2026-01-05_
