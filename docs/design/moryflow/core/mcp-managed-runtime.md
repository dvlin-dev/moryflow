---
title: MCP Managed Runtime（PC）
date: 2026-03-02
scope: apps/moryflow/pc
status: active
---

# MCP Managed Runtime（PC）

## 背景与目标

- 目标：将 MCP stdio 从“用户手写 command/cwd”收敛为“受管 npm 包”，并在应用启动时对所有已启用 MCP 做后台静默更新。
- 默认内置：`@moryflow/macos-kit` 作为内置 MCP，默认启用（新架构、零兼容，不做旧数据迁移）。
- 运行时要求：连接 MCP 前必须先解析本地可执行入口，避免 `npx` 冷启动导致的初始化超时与状态误报。

## 架构决策

### 1) 配置协议（stdio）

stdio MCP 配置固定为：

- `id`
- `enabled`
- `name`
- `packageName`
- `binName?`
- `args[]`
- `env?`

不再接受 `command/cwd`。

### 2) 受管 Runtime（main/mcp-runtime）

新增主进程受管模块：`apps/moryflow/pc/src/main/mcp-runtime/index.ts`

职责：

- 管理 npm 包安装与更新（`install <package>@latest`）
- 解析 package manifest 的 `bin` 并定位可执行脚本
- 生成最终启动命令（`node <resolved-bin-path> ...args`）
- 持久化每个 MCP 的运行状态（版本、更新时间、错误）
- 串行化安装/更新任务，避免并发安装冲突

策略：

- `if-missing`：连接前只补齐缺失包
- `latest`：启动时强制拉最新（仅针对 enabled servers）

### 3) MCP Manager 接入

`mcp-manager` 重载流程改为：

1. 先用 `mcp-runtime` 解析 enabled stdio servers（`if-missing`）
2. 解析失败的 server 直接标记 `failed` 状态（不中断其他 server）
3. 对解析成功的 server 建立 MCP 连接并加载工具
4. 保持 existing HTTP MCP 行为不变

### 4) 启动静默更新

`createAgentRuntime()` 初始化后执行：

1. 先 schedule 一次 MCP reload（保证可连接）
2. 后台执行 `refreshEnabledServers(..., latest)`
3. 更新任务完成后触发一次 reload，使新版本生效

## UI/表单改造

设置页 MCP（stdio）字段调整：

- 删除：`command`、`cwd`
- 新增：`packageName`、`binName(optional)`
- 保留：`args`、`env`、`enabled`、`name`

预设改造：

- 预设使用 package 元数据，不再回填 `npx` 命令
- 内置 `macOS Kit` 预设：`@moryflow/macos-kit` + `macos-kit-mcp`

## 默认值

主进程默认设置包含：

- `builtin-macos-kit`
- `enabled: true`
- `packageName: @moryflow/macos-kit`
- `binName: macos-kit-mcp`

## 执行步骤（实施顺序）

1. 收敛 IPC/Settings 契约：stdio 改为 package 模型，删除 command/cwd。
2. 落地主进程默认值：内置 `builtin-macos-kit` 且默认启用。
3. 新增 `mcp-runtime`：安装/更新/解析 bin/状态持久化/队列化。
4. 改造 `mcp-manager`：重载前走 runtime 解析，失败 server 降级 failed。
5. 接入启动静默更新：应用启动后台更新 enabled MCP，完成后自动 reload。
6. 改造设置页表单与预设：字段切换为 packageName/binName。
7. 补齐回归测试：settings normalize、runtime updater、mcp manager、form 映射。
8. 校验：`@moryflow/pc` typecheck + 受影响单测通过。

## 验收标准

- 新安装用户无需手动添加即可看到并使用 macOS Kit MCP。
- 启动后会后台更新所有 enabled stdio MCP 包。
- 任一 MCP 更新/解析失败不会阻断其他 MCP 的连接与工具加载。
- 设置页不再暴露 command/cwd，统一受管配置。
