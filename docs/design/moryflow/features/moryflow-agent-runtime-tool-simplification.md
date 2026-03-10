---
title: Moryflow Agent Runtime Tool 精简改造方案（Bash-First）
date: 2026-03-03
scope: docs/design/moryflow/features
status: completed
---

# Moryflow Agent Runtime Tool 精简改造方案（Bash-First）

## 0. 当前状态

1. 本方案的改造范围只覆盖 PC 端 Agent Runtime；Mobile 继续保持非 bash 工具集。
2. PC 端默认工具策略已经收口为 Bash-First，删除了与 bash 重叠的默认文件/搜索工具注入。
3. 工具装配、审计写入、安全边界与 subagent 能力面都已同步到当前实现，不再维护多套旧入口。
4. 本文只保留当前工具策略、跨端边界与验证基线；P0-P4 分阶段执行日志不再继续维护。

## 1. 范围声明

1. PC：默认文件/搜索能力收敛为 Bash-First。
2. Mobile：不具备 bash 能力，继续使用现有文件/搜索工具集，不在本轮变更。

## 2. 重构目标

1. 将 PC 端工具策略收敛为 Bash-First，降低模型在重叠工具之间的选择负担。
2. 保留高价值非 bash 工具：`web_fetch`、`web_search`、`task`、`subagent`、`generate_image`、`skill`、MCP/external。
3. 保持现有安全边界不退化：继续使用 `@moryflow/agents-sandbox` 的命令过滤与外部路径授权。
4. 保持 Prompt 口径与运行时注入一致，避免“文案能力 > 实际能力”的漂移。

## 3. 当前工具策略

### 3.1 PC

1. 默认通过 bash 承担大部分文件与搜索操作。
2. 保留 `task`、`subagent`、`skill`、MCP/external、网络类与图像类工具。
3. 审计写入已改为统一安全基座，默认不落盘 bash 明文命令。

### 3.2 Mobile

1. 保留文件/搜索/网络/`task`/`generate_image`。
2. 不支持 `bash`、`skill`、MCP 与 `subagent`。

## 4. 当前收口结果

1. `packages/agents-tools` 的死 API 与旧装配入口已经删除，只保留业务实际使用的稳定装配面。
2. `subagent` 已移除角色分流型 `type` 参数，改为单一工具集合，由 runtime 动态注入能力。
3. bash 审计默认只记录结构化元数据与指纹；命令预览需要显式开关并强制脱敏。
4. 路径安全写入、审计日志文件名与目录逃逸校验已经统一到单一基座。

## 5. 验收标准（DoD）

1. PC 默认链路不再注入与 bash 重叠的文件/搜索工具。
2. Mobile 工具策略保持现状，不被 PC Bash-First 误伤。
3. 审计落盘默认不泄露 bash 明文命令。
4. subagent 与主 agent 共用同一工具事实源，不再存在静态角色分流能力面。

## 6. 当前验证基线

1. `packages/agents-tools` 负责装配入口、导出面与 PC/Mobile 差异回归。
2. `packages/agents-sandbox` 负责 bash 工具描述、审计 hook 与安全边界回归。
3. `apps/moryflow/pc/src/main/agent-runtime` 负责审计写入、安全路径、runtime 注入与 subagent 能力面回归。
4. 修改工具装配面、审计字段或 subagent 协议时，按 L2 执行根级校验。
