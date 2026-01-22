---
title: 'UI 迁移：统一为 Moryflow 风格 + Hugeicons'
date: '2026-01-09'
scope: 'packages/ui, apps/anyhunt/*'
status: 'archived'
---

# 结论

- 组件入口统一为 `/ui`（默认导出 components/composed/hooks/lib）
- `primitives` 目录已移除，旧入口不再保留
- 图标统一 Hugeicons（组件库与业务页同规则）

# 迁移原则

- 不做兼容层，旧 API 直接删除
- 无用代码直接清理
- UI 风格统一为 Moryflow（圆角、阴影、柔和层级）

# 已完成内容

## packages/ui

- 移除 `primitives` 目录与导出入口
- 默认入口 `/ui` 直接导出 components/composed/hooks/lib
- 新增 `Icon` 封装，组件图标统一 Hugeicons
- Sidebar 已迁移到 components 并调整为圆角风格

## apps/anyhunt/console / admin / www

- 组件导入统一为 `/ui`
- 页面与组件图标替换为 Hugeicons
- 清理方角覆盖样式（不再使用 `rounded-none` 主题）

# 统一使用规则

## 组件导入

```tsx
import { Button, Card, Icon } from '@anyhunt/ui';
import { DataTable } from '@anyhunt/ui/composed';
```

## 图标

- 统一使用 `@hugeicons/react` + `@hugeicons/core-free-icons`
- 禁止使用 `lucide-react` / `@tabler/icons-react`
- 默认通过 `Icon` 封装（`size=18`，`strokeWidth=1.5`）

# 验收清单

- 旧 primitives 入口全局无引用
- Anyhunt 业务线不再依赖 lucide/tabler 图标
- 主要页面 UI 风格为圆角与柔和层级
