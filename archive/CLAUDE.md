<!--
[INPUT]: 从历史独立仓库迁移进来的源码快照（仅供查阅/对照）
[OUTPUT]: 迁移目录说明、边界与使用方式
[POS]: `archive/` 的协作入口，保证“只看本仓库”也能找到旧代码

[PROTOCOL]: 本目录新增/删除快照时，需同步更新本文件与根 `CLAUDE.md` 的索引。
-->

# archive/

本目录用于保存“外部独立仓库”的**源码快照**，目标是让后续改造/迁移时**只需要看当前 monorepo**，不再依赖本机其它绝对路径仓库。

## 约束

- `archive/` 默认 **不参与** workspace / turbo 任务（避免未改造代码影响 `pnpm lint/typecheck/test:unit`）。
- 只保留源代码与文档；排除构建产物与缓存（如 `node_modules/`、`dist/`、`Pods/`、`.turbo/` 等）。
- 当某个模块被正式整合到 `apps/` 或 `packages/` 后，仍可保留快照用于对照，但以“现行实现”为准。

## 快照列表

- `archive/external-repos/moryflow/`：原 `/Users/bowling/code/me/moryflow`
- `archive/external-repos/fetchx/`：原 `/Users/bowling/code/me/fetchx`
- `archive/external-repos/memai/`：原 `/Users/bowling/code/me/memai`

