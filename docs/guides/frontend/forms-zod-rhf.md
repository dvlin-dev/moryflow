---
title: 表单：Zod + react-hook-form 兼容性（zod/v3）
date: 2026-01-12
scope: frontend, console/admin
status: active
---

<!--
[INPUT]: Zod v4 + @hookform/resolvers；monorepo 依赖解析差异（本地 vs Docker）
[OUTPUT]: 可复用的解决方案与验证步骤（使用 `zod/v3` 兼容层）
[POS]: 表单技术指南（避免“同仓库不同环境类型不一致”）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`。
-->

# Zod + @hookform/resolvers 兼容性问题

> 记录日期：2026-01-12
> 状态：已解决（使用 zod/v3 兼容层）

## 问题描述

Console 应用在 Docker 构建时出现 TypeScript 类型错误：

```
error TS2769: No overload matches this call.
The types of '_zod.version.minor' are incompatible between these types.
Type '0' is not assignable to type '3'.
// 或反向：Type '3' is not assignable to type '0'.
```

## 根本原因

1. **Zod v4 内部版本号变化**：
   - `zod@4.0.x` 的 `_zod.version.minor = 0`
   - `zod@4.3.x` 的 `_zod.version.minor = 3`

2. **@hookform/resolvers 类型定义**：
   - `zodResolver` 的类型重载基于 `zod/v4/core` 的版本号判断
   - 当 schema 和 resolver 解析到不同 minor 版本的 zod 时，类型不兼容

3. **Monorepo 依赖冲突**：
   - `better-auth`、`ai` SDK 等 peer depend `zod@4.3.5`
   - pnpm hoisting 导致 Docker 和本地解析到不同版本

## 相关 Issues

- [react-hook-form/resolvers#813](https://github.com/react-hook-form/resolvers/issues/813)
- [colinhacks/zod#4992](https://github.com/colinhacks/zod/issues/4992)

## 解决方案

### 采用方案：使用 zod/v3 兼容层

Zod v4 提供了 `zod/v3` 兼容入口，类型与 @hookform/resolvers 完美兼容：

```typescript
// schemas.ts
- import { z } from 'zod';
+ import { z } from 'zod/v3';  // 使用 v3 兼容层
```

**优点**：

- 改动最小（只改 import）
- 运行时仍用 zod v4 引擎
- 类型与 @hookform/resolvers 100% 兼容
- 不影响其他包

### 备选方案

| 方案                   | 说明                     | 风险                         |
| ---------------------- | ------------------------ | ---------------------------- |
| 统一 zod 4.0.17        | pnpm.overrides 强制版本  | 破坏 agents 包（API 不兼容） |
| 降级 zod v3            | console 用 zod@3.25.x    | 与其他包版本不一致           |
| standardSchemaResolver | 换 resolver 实现         | 需额外依赖，改动较大         |
| 移除显式泛型           | 不指定 `useForm<T>` 泛型 | 改动所有表单文件             |

## 受影响文件

- `apps/anyhunt/console/src/features/playground-shared/schemas.ts`
- `apps/anyhunt/console/src/pages/ExtractPlaygroundPage.tsx`
- `apps/anyhunt/console/src/pages/GraphPage.tsx`
- `apps/anyhunt/console/src/pages/MapPlaygroundPage.tsx`
- `apps/anyhunt/console/src/pages/MemoxPlaygroundPage.tsx`
- `apps/anyhunt/console/src/pages/SearchPlaygroundPage.tsx`

## 验证步骤

```bash
# 本地验证
pnpm --filter @anyhunt/console typecheck
pnpm --filter @anyhunt/console build

# Docker 验证
docker build -f apps/anyhunt/console/Dockerfile .
```

## 长期跟踪

- [ ] 监控 @hookform/resolvers 对 zod v4.3+ 的官方支持
- [ ] 当官方修复后，可考虑回退到 `import { z } from 'zod'`

---

_最后更新：2026-01-12_
