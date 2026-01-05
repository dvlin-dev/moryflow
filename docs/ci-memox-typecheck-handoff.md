---
title: CI Handoff - memox-server typecheck failures
date: 2026-01-05
scope: memox-server, model-registry-data
status: ✅ completed
---

# 背景

CI 在执行 `pnpm lint` 时会触发 Turborepo 的 `lint` pipeline，其中包含部分 package 的 `build`。本次主要问题分两段：

1. `@aiget/model-registry-data` 在 CI Linux runner 上 `tsup` 构建失败（Rollup native optional dependency 缺失）。
2. 修复 1) 后，`@aiget/memox-server` 的 TypeScript 类型检查出现较多报错（当前剩余 24 个 `TS` error），集中在 `BaseRepository` 的 Prisma 类型推断方案与部分 JSON 字段类型。

# 1) CI Linux Rollup native module 缺失（已修复）

**CI 报错（节选）：**

```
Error: Cannot find module @rollup/rollup-linux-x64-gnu
```

**原因：**
`rollup@4` 在 Linux 下需要 `@rollup/rollup-linux-x64-gnu` 这类平台包作为 optional dependency。CI 的 pnpm 安装流程未拿到该包时，`tsup` 在 build 阶段会直接炸。

**已做的修复：**

- 在根 `package.json` 增加：
  - `optionalDependencies["@rollup/rollup-linux-x64-gnu"] = "4.54.0"`
- 更新 `pnpm-lock.yaml`
- 根 `CLAUDE.md` 记录该 CI 依赖点（避免后续误删）

**验证：**
CI 进入下一阶段，不再因为 `@aiget/model-registry-data#build` 失败而中断。

# 2) memox-server typecheck 报错（未修完）

## 当前状态

本地运行：

```bash
pnpm --filter @aiget/memox-server typecheck
```

当前仍有 **24 个** `TS` 报错（统计命令）：

```bash
pnpm --filter @aiget/memox-server typecheck 2>&1 | rg "error TS" | wc -l
```

## 主要报错类别（摘要）

1. `apps/memox/server/src/common/base.repository.ts`
   - 尝试使用 `Prisma.TypeMap` 将 CRUD 的 args/result 统一抽象到 `BaseRepository`，但目前出现：
     - `TS2536`：`"args" | "result"` 无法索引 `TypeMap['model'][TModel]['operations'][TOperation]`
     - 以及由此引发的后续泛型/返回类型不稳定问题

2. `Entity/Relation/Memory` 相关：
   - 由于 BaseRepository 的返回类型不稳定，部分调用点把返回值推成了“字段可能是 `string | undefined`”的形态，导致：
     - `Entity` / `Relation` / `Memory` 的字段（如 `id/type/userId`）被推成可选，引发一连串不匹配

## 已做的“正确方向”改动（可保留）

1. 统一 JSON 字段的输入类型（Zod）
   - 新增 `apps/memox/server/src/common/utils/json.zod.ts`：
     - `JsonValue` + `JsonValueSchema`
   - 调整以下 DTO schema：
     - `apps/memox/server/src/entity/dto/entity.schema.ts`
     - `apps/memox/server/src/relation/dto/relation.schema.ts`
     - `apps/memox/server/src/memory/dto/memory.schema.ts`
   - 目标：让 `properties/metadata` 变成“可序列化 JSON”，并与 Prisma JSON 字段更接近，避免 `Record<string, unknown>` 直接进入 Prisma JSON 输入时报类型错。

2. 统一 JSON 字段的输出转换（服务端）
   - 新增 `apps/memox/server/src/common/utils/json.utils.ts`：
     - `asRecordOrNull(value)`：把 Prisma JSON 输出（可能是 `string/number/array/null/object`）安全收敛为 `Record<string, unknown> | null`
   - `graph.service.ts`、`entity.service.ts`、`memory.service.ts` 中使用该函数，避免把 JSON 标量/数组错误当成对象返回给 Console 视图。

3. LLM 抽取结果 properties 类型收敛
   - `apps/memox/server/src/llm/llm.service.ts`
   - 将 `ExtractedEntity/ExtractedRelation.properties` 从 `Record<string, unknown>` 收敛为 `Record<string, JsonValue>`，与 DTO schema 对齐。

## 建议的后续解决方案（优先级顺序）

### 方案 A（推荐）：放弃 TypeMap 抽象，改为“显式 args/result 泛型”的 BaseRepository

动机：Prisma 的 `TypeMap` / `PayloadToResult` 体系较复杂，抽象层越高越容易出现“字段被推成 optional”的问题。最稳定的做法是让 `BaseRepository` 只做隔离逻辑，不去推断所有模型。

建议做法：

- `BaseRepository` 改为显式泛型（每个模型 repo 传入 Prisma 生成的 Args 类型）：
  - `FindManyArgs`, `FindFirstArgs`, `CreateArgs`, `UpdateArgs`, `DeleteManyArgs`, `CountArgs`
  - 以及一个 `TModel`（一般直接用 `Prisma.<Model>`）
- 这样 `withApiKeyFilter()` 的 where 类型、create/update 的 data 类型都能保持完全类型安全。

优点：

- 最稳定、最可控；不会被 Prisma 内部类型计算“变形”影响。

缺点：

- 每个 repo 继承时写泛型会更长，但换来确定性。

### 方案 B：继续 TypeMap，但必须先解决 `TS2536` 与字段 optional 问题

如果坚持 TypeMap：

- 先确认 `Prisma.TypeMap` 的实际导出类型形态（建议直接查看 `apps/memox/server/generated/prisma/internal/prismaNamespace.ts` 的 `TypeMap` 定义）。
- 确保 `operations[*]` 的 value 类型在 TS 层面是 `{ args; result }`，而不是被推成 union/unknown。
- 一旦 `OperationResult` 仍然让字段变成 optional，需要追踪是否引入了 `omit` 或被当成“选择性返回”处理。

这条路线风险更高，且目前已证明很容易引入额外的类型噪音。

# 相关文件清单（当前工作区已变更）

- CI 修复：`package.json`, `pnpm-lock.yaml`, `CLAUDE.md`
- memox/common：`apps/memox/server/src/common/base.repository.ts`, `apps/memox/server/src/common/utils/*`
- memox/entity|relation|memory：对应 `dto/*.schema.ts`, `*.repository.ts`, `*.service.ts`
- memox/graph：`apps/memox/server/src/graph/graph.service.ts`
- memox/llm：`apps/memox/server/src/llm/llm.service.ts`

# 下一位执行者的建议工作流

1. 先跑单包：
   - `pnpm --filter @aiget/memox-server typecheck`
2. 把 `BaseRepository` 的策略定下来（方案 A 或 B）
3. 修完后再跑全局校验：
   - `pnpm lint`
   - `pnpm typecheck`
4. 最后再处理 warn（当前可以先不处理 warn）

---

# Progress Log

## 2026-01-05 - 完成修复

**执行者**: Claude (claude/fix-memox-typecheck-7Gz8p)

**修复前**: 24 个 TypeScript 错误

**采用方案**: 方案 A - 显式模型类型泛型

**改动摘要**:

1. **重写 `BaseRepository`** (`apps/memox/server/src/common/base.repository.ts`)
   - 移除 Prisma TypeMap 抽象，改用简化的 `TModel extends BaseModel` 泛型
   - 使用 `PrismaDelegate` 接口处理 CRUD 操作
   - 返回类型由具体 Repository 传入的模型类型决定，避免字段被推成 optional

2. **更新各 Repository 继承方式**:
   - `EntityRepository extends BaseRepository<Entity>` (原 `BaseRepository<'Entity'>`)
   - `MemoryRepository extends BaseRepository<Memory>` (原 `BaseRepository<'Memory'>`)
   - `RelationRepository extends BaseRepository<Relation>` (原 `BaseRepository<'Relation'>`)
   - 移除 `as unknown as any` 类型断言

3. **修复 properties 字段类型**:
   - `entity.service.ts`: `properties: dto.properties ?? null`
   - `relation.service.ts`: `properties: dto.properties ?? null`
   - 将 `undefined` 转换为 `null` 以匹配 Prisma JSON 类型

4. **修复 lint 错误**:
   - 移除 `Promise<unknown | null>` 中的冗余 `| null`（`unknown` 已包含 `null`）

**修复后**: 0 个 TypeScript 错误，lint 通过

**验证命令**:

```bash
pnpm --filter @aiget/memox-server typecheck  # ✅ 通过
pnpm --filter @aiget/memox-server lint       # ✅ 通过
pnpm lint                                     # ✅ 通过
pnpm typecheck                                # ✅ 通过
```
