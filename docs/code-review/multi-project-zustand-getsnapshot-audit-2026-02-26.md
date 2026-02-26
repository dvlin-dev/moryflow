---
title: Multi-project Zustand/getSnapshot 专项审计（排除 Moryflow PC）
date: 2026-02-26
scope: frontend-multi-project
status: completed
---

<!--
[INPUT]: 9 个前端项目源码（排除 apps/moryflow/pc）
[OUTPUT]: 全量问题台账、统一修复记录、验证结果与残余风险
[POS]: Zustand/getSnapshot 稳定性专项闭环文档（单对话）

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md`、`docs/CLAUDE.md`、`docs/code-review/index.md`。
-->

# Multi-project Zustand/getSnapshot 专项审计（2026-02-26）

## 审计目标

在单次执行中完成 9 个前端项目的 Zustand/getSnapshot 风险闭环：

1. 建档与台账初始化
2. 全量定位（仅扫描，不改业务代码）
3. 统一修复（按 P0 -> P1 -> P2）
4. 回归验证（至少 typecheck + test:unit）
5. 文档回写收口

## 范围项目（9 个）

1. `apps/anyhunt/admin/www`
2. `apps/anyhunt/console`
3. `apps/anyhunt/docs`
4. `apps/anyhunt/www`
5. `apps/moryflow/admin`
6. `apps/moryflow/docs`
7. `apps/moryflow/mobile`
8. `apps/moryflow/site-template`
9. `apps/moryflow/www`

## 扫描规则

至少覆盖以下模式：

1. `useXxxStore((state) => ({ ... }))`
2. `useXxxStore((state) => ([ ... ]))`
3. `useStore(store, selector)` 中 selector 返回对象/数组字面量
4. `useSync*Store` / 同步桥接 hook 无条件 `setSnapshot/setState`
5. `useSyncExternalStore` 自定义 `getSnapshot` 不稳定引用
6. effect 依赖抖动导致循环 `setState`

风险分级：

- `P0`：可直接触发无限更新或 `getSnapshot should be cached`
- `P1`：高频重渲染/抖动，存在循环更新风险
- `P2`：模式不规范，短期无直接故障但有稳定性隐患

## 修复规则

1. selector 改为原子订阅（字段级读取）
2. 必要时使用稳定化策略（`shallow` 或稳定 memo）
3. `useSync*Store` 必须添加 `shouldSync` 等价判断，禁止无变化写入
4. 删除无效/重复逻辑，不增加兼容层
5. 每类修复至少补 1 个回归测试

## 项目执行台账（初始化）

| 项目                        | 扫描状态 | 命中数 | 修复状态 | 验证状态     | 备注                                                                  |
| --------------------------- | -------- | ------ | -------- | ------------ | --------------------------------------------------------------------- |
| apps/anyhunt/admin/www      | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/anyhunt/console        | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/anyhunt/docs           | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/anyhunt/www            | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/moryflow/admin         | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/moryflow/docs          | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/moryflow/mobile        | done     | 2      | fixed    | partial-pass | `sync-engine` 已修复；`test:unit` 通过，`check:type` 存在既有基线失败 |
| apps/moryflow/site-template | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |
| apps/moryflow/www           | done     | 0      | n/a      | n/a          | 全规则扫描无命中                                                      |

## Phase 1 - 全量定位（只扫描，不改代码）

### 扫描记录

#### 1. apps/anyhunt/admin/www

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 2. apps/anyhunt/console

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 3. apps/anyhunt/docs

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 4. apps/anyhunt/www

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 5. apps/moryflow/admin

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 6. apps/moryflow/docs

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 7. apps/moryflow/mobile

- 扫描状态：done
- 命中总数：2
- 风险分布：P0=0 / P1=2 / P2=0
- 命中问题列表：

| 文件                                                 | 行号  | 模式                             | 风险等级 | 说明                                                                     |
| ---------------------------------------------------- | ----- | -------------------------------- | -------- | ------------------------------------------------------------------------ |
| `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts` | 79    | `getSnapshot` 每次构造对象字面量 | P1       | 无稳定缓存，快照引用恒变化，具备 `getSnapshot should be cached` 同类风险 |
| `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts` | 71-76 | setter 无条件 `set` 写入         | P1       | 等价值仍写入，易触发订阅抖动，具备循环更新放大风险                       |

#### 8. apps/moryflow/site-template

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

#### 9. apps/moryflow/www

- 扫描状态：done
- 命中总数：0
- 风险分布：P0=0 / P1=0 / P2=0
- 命中问题列表：无

### 总问题清单（去重）

| 问题 ID | 问题描述                                               | 风险等级 | 命中文件                                                   |
| ------- | ------------------------------------------------------ | -------- | ---------------------------------------------------------- |
| ZGS-001 | `getSnapshot` 返回对象字面量且无稳定缓存               | P1       | `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts:79`    |
| ZGS-002 | 状态 setter 缺少 `shouldSync` 等价判断，存在无变化写入 | P1       | `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts:71-76` |

## Phase 2 - 统一修复

按风险顺序执行结果：

1. `P0`：无命中
2. `P1`：完成 `ZGS-001`、`ZGS-002` 修复
3. `P2`：无命中

### 修复明细

| 问题 ID | 修复状态 | 修复说明                                                                                                         | 修复文件（行号）                                                   |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ZGS-001 | fixed    | `getSnapshot` 改为缓存快照返回；状态不变时复用同一引用                                                           | `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts:72-108,142`    |
| ZGS-002 | fixed    | `setStatus/setVault/setLastSync/setError/setPendingCount/setSettings` 增加 `shouldSync` 等价判断，禁止无变化写入 | `apps/moryflow/mobile/lib/cloud-sync/sync-engine.ts:58-70,124-140` |

### 回归测试

新增 `apps/moryflow/mobile/lib/cloud-sync/__tests__/sync-engine-store.spec.ts`（3 个回归用例）：

1. 等价快照不写入（no-op setter 不触发订阅）
2. `getSnapshot` 缓存稳定（状态未变时引用不变）
3. 防循环写入（订阅反馈中 no-op set 不会形成 `Maximum update depth exceeded` 类循环）

## Phase 3 - 校验

执行命令：

1. `pnpm --filter @moryflow/mobile check:type` -> **fail**
2. `pnpm --filter @moryflow/mobile test:unit` -> **pass**
3. `pnpm --filter @moryflow/mobile exec vitest run lib/cloud-sync/__tests__/sync-engine-store.spec.ts` -> **pass**

结果分流：

- 本次改动导致的问题：
  - 无。`sync-engine.ts` 与新增 `sync-engine-store.spec.ts` 均已通过单测编译与执行。
- 与本次改动无关的既有基线失败（`check:type`）：
  - `components/chat/ChatInputBar/types/index.ts`（`ChatMessageMeta` 导出缺失）
  - `components/membership/UpgradeSheet.tsx`（`Record<UserTier, string>` 动态索引）
  - `lib/agent-runtime/tasks-store.ts`（SQLite 泛型与 unknown 推断）
  - `lib/cloud-sync/api-client.ts`（`fetch` body 类型）
  - `src/editor-bundle/index.ts`（`@moryflow/tiptap/*` 类型解析缺失）
  - 以上失败文件均不在本次改动集合内。

## Phase 4 - 文档收口

已完成：

1. 本专项文档更新（问题状态、修复位置、验证结论、残余风险）
2. 索引回写：
   - `docs/index.md`
   - `docs/CLAUDE.md`
   - `docs/code-review/index.md`
3. 受影响目录 CLAUDE 回写：
   - `apps/moryflow/mobile/CLAUDE.md`
   - `apps/moryflow/mobile/lib/CLAUDE.md`

## 残余风险

1. `@moryflow/mobile check:type` 当前存在较多历史基线错误，尚未纳入本次修复范围，后续若推进全量类型门禁需先清基线。
2. 本次命中集中在 Cloud Sync store；其余 8 个项目本轮未发现同类命中，但建议后续新增 store/hook 时复用同一 `shouldSync + snapshot cache` 模式。
