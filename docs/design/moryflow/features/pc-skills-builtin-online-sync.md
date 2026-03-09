---
title: Moryflow PC 内置 Skills 在线同步方案（基线打包 + 启动逐项检查 + 原子覆盖）
date: 2026-03-03
scope: apps/moryflow/pc
status: completed
---

<!--
[INPUT]:
- 目标：Moryflow PC 内置更多 skills，并支持“本地打包基线 + 在线逐项检查 + 自动覆盖更新”。
- 用户要求：每次应用打开都检查在线版本；有更新则下载并覆盖旧版本；新增 `agent-browser`、`macos-automation` 为自动预装。
- 约束：不做历史代码兼容；仅对用户已存在的预装卸载偏好做最小状态迁移。

[OUTPUT]:
- 技术方案：技能清单、模块划分、启动流程、更新算法、安全边界与验证基线。

[POS]:
- Moryflow PC Skills 内置与在线更新的单一事实源。
-->

# Moryflow PC 内置 Skills 在线同步方案

## 1. 当前状态

1. Skills 已经改为“安装包内置基线 + 冷启动逐项在线 revision 检查 + 原子覆盖更新”的单轨模型。
2. 受管技能分成两类：
   - 自动预装：默认安装，离线可用
   - 内置推荐但不自动预装：显示在推荐区，但不强制安装
3. 用户对预装 skill 的显式卸载偏好会被持久化，不会在下一次 `refresh()` 时自动装回。
4. 本文只保留当前技能管理模型、更新边界与验证基线；执行进度与 review 闭环日志不再继续维护。

## 2. 目标

1. 指定 skills 全部内置到安装包，首次离线可用。
2. 每次应用冷启动都对受管 skills 逐项检查在线 revision。
3. 在线 revision 变化后，自动下载并原子覆盖本地版本。
4. 更新失败不影响主链路，聊天与主界面仍可继续使用。
5. 用户禁用或卸载预装 skill 后，自动更新不篡改该偏好。

## 3. 技术架构

采用四模块最小架构：

1. `skills-catalog.ts`：声明受管 skills 列表（name/source/preinstall/recommended/ref/path）。
2. `skills-remote.ts`：逐 skill 在线检查最新 revision。
3. `skills-installer.ts`：下载、校验、原子覆盖与回滚。
4. `skills-registry.ts`：启动编排、状态缓存与 IPC 出口。

## 4. 关键约束

1. 默认可离线运行：内置基线始终可用，在线更新只是增强。
2. 在线下载必须校验来源与体积边界，避免把远端同步变成安全后门。
3. 原子覆盖必须支持回滚，不允许留下半更新目录。
4. 目录名是 canonical skill name，不依赖 frontmatter 名称作为唯一标识。
5. 预装卸载偏好、disabled 状态与后台同步必须串行化，避免用户操作被回滚覆盖。

## 5. 验收标准（DoD）

1. 自动预装 skills 在首次启动即全部可见。
2. 每次冷启动都会检查受管 skill 的在线 revision。
3. revision 变化后，下一次启动可自动更新并覆盖本地旧版。
4. 用户显式禁用或卸载 skill 后，自动同步不会擅自恢复。
5. 更新失败、网络抖动、上游路径失效不会阻塞主进程启动。

## 6. 当前验证基线

1. `apps/moryflow/pc/src/main/skills/*` 负责 catalog、remote、installer、registry 与状态迁移回归。
2. 修改 revision 判定、下载覆盖、预装状态迁移或目录命名规则时，至少执行受影响文件的 `typecheck` 与 `test:unit`。
3. 涉及在线下载安全边界、体积限制或执行权限保留时，按 L2 执行根级校验。
