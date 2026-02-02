---
title: Sandx（PC）适配 Apple Container + Docker 隔离方案草图
date: 2026-02-02
scope: moryflow-pc
status: draft
---

<!--
[INPUT]: NanoClaw 的 Apple Container 隔离实践 + 现有 PC 端 sandbox/agent-runtime 结构
[OUTPUT]: Sandx 在 Moryflow PC 的隔离落地草图（目录/权限边界、挂载/allowlist、最小改动路径、成本评估）
[POS]: 研究类文档，供后续架构方案与实现拆解参考
-->

# Sandx（PC）适配 Apple Container + Docker 隔离方案草图

## 目标与边界

- **目标**：在 `apps/moryflow/pc` 的 Agent 运行链路中，引入 OS 级隔离（Apple Container / Docker），取代“仅命令过滤”的软隔离，形成更强的文件系统边界。
- **范围**：仅聚焦 PC 主进程执行（Agent Runtime + Bash Tool）；不涉及服务端（Anyhunt Server）与移动端。
- **兼容性**：macOS 优先 Apple Container；Docker 作为跨平台替代路径（macOS/Linux）。

## 现有接入点与可复用模块

- **Agent Runtime 主入口**：`apps/moryflow/pc/src/main/agent-runtime/index.ts`
  - 当前通过 `createSandboxBashTool` 注入 Bash 工具，依赖 `@anyhunt/agents-sandbox`。
- **Sandbox 管理与授权**：`apps/moryflow/pc/src/main/sandbox/index.ts`
  - 提供 IPC 授权流程与授权路径管理。
- **Sandbox Core**：`packages/agents-sandbox/src/sandbox-manager.ts`
  - 已具备命令过滤 + 外部路径授权 + 授权持久化能力。

> **结论**：最小改动路径是“替换 Bash 执行通道”，保留现有授权 UX，改为在容器中执行命令，并以挂载替代路径白名单绕过。

## 隔离边界设计（建议）

### 1) 运行时边界

- **Host（可信）**：Electron 主进程负责路由、权限决策、容器生命周期。
- **Container（不可信）**：Agent 的 Bash/工具执行在容器内完成；仅能访问显式挂载的目录。

### 2) 目录与权限边界（建议）

建议引入 Sandx 的标准目录结构（路径可落在 `app.getPath('userData')`）

```
{USER_DATA}/sandx/
  sessions/{chatId}/.claude/      # 每会话隔离
  ipc/{chatId}/                   # IPC 与工具输出
  env/                             # 仅授权变量（token）
  mounts/                          # allowlist 结果快照（只读）
```

**强制挂载（按会话）**：
- `vaultRoot` → `/workspace/vault`（rw）
- `sessions/{chatId}/.claude/` → `/home/node/.claude`（rw）
- `ipc/{chatId}/` → `/workspace/ipc`（rw）

**可选挂载（授权后）**：
- `authorizedPaths[]` → `/workspace/extra/{alias}`（ro 或 rw）

**只读策略（默认）**：
- 非主会话（或非主 workspace）强制只读
- 只读挂载使用 `--mount ... readonly`（Apple Container）或 `-v host:container:ro`（Docker）

### 3) Allowlist / 授权策略（建议）

- **授权持久化位置**：移到用户配置目录（例如 `{USER_CONFIG}/sandx/mount-allowlist.json`），禁止挂载进容器。
- **校验规则**：
  - `realpath` 解析与 `path.relative` 边界校验
  - 内置敏感路径黑名单（`.ssh`, `.aws`, `.env`, `id_rsa` 等）
  - 非主会话强制只读（即使用户申请 rw）

> 可复用 `packages/agents-sandbox` 的授权流程，但存储路径与校验规则需升级为“容器挂载安全模型”。

## Apple Container / Docker 兼容路径

### 运行时适配层（建议）

抽象 `ContainerRuntimeAdapter`：

```ts
interface ContainerRuntimeAdapter {
  ensureRuntimeReady(): void
  buildRunArgs(mounts: MountSpec[], image: string): string[]
  spawn(args: string[], input: string): ChildProcess
}
```

- **Apple Container**
  - `container system status/start`
  - 只读挂载：`--mount type=bind,source=...,target=...,readonly`
  - 读写挂载：`-v host:container`
  - `-i --rm`（stdin 传入请求）

- **Docker**
  - `docker info` 检测可用
  - 只读挂载：`-v host:container:ro`
  - 读写挂载：`-v host:container`
  - `-i --rm`

### 环境变量策略

- Apple Container 在 `-i` 下丢 `-e` 的已知问题，可沿用 “env 文件挂载 + entrypoint source” 模式。
- Docker 路径可选：保留 `-e` 方式或沿用 env 文件以简化一致性。

## 最小改动路径（推荐执行序）

1) **新增容器执行通道（PC 主进程）**
   - 新建 `apps/moryflow/pc/src/main/sandx/`（container-runner + mount 策略 + allowlist 读取）
   - 提供 `runSandboxCommand()` 或 `runSandboxTool()` API

2) **替换 Bash Tool 执行通道**
   - 在 `apps/moryflow/pc/src/main/agent-runtime/index.ts` 中，将 `createSandboxBashTool` 的执行底层切换为容器 runner。
   - 继续复用现有授权 UI 与 IPC（`apps/moryflow/pc/src/main/sandbox/index.ts`）。

3) **落地 allowlist + 授权存储**
   - 复用 `packages/agents-sandbox` 的授权逻辑，但将“授权路径列表”迁移到外部配置目录（不可被容器访问）。

4) **Docker 兼容开关**
   - 通过配置或平台检测选择 Apple Container / Docker。
   - 在运行时输出当前 runtime 与版本，便于诊断。

## 改造成本评估（粗略）

- **低成本（1-2 天）**
  - 新增容器 runner + mount 规则（Apple Container 版）
  - Bash 工具执行切换
  - 基础日志与错误处理

- **中成本（2-4 天）**
  - allowlist 文件 + 黑名单校验 + realpath 防穿越
  - Docker 兼容路径（adapter + mount 规则差异）
  - 运行时自检（container / docker ready）

- **高成本（> 1 周）**
  - 全量 Agent 运行迁移到容器（不仅仅是 Bash）
  - 细粒度网络隔离与资源配额
  - 跨平台 UI/权限授权统一

## 接入点与影响范围清单

- **直接改动**
  - `apps/moryflow/pc/src/main/agent-runtime/index.ts`
  - `apps/moryflow/pc/src/main/sandbox/index.ts`
  - `packages/agents-sandbox/*`（授权存储与校验扩展）

- **新增模块（建议）**
  - `apps/moryflow/pc/src/main/sandx/container-runner.ts`
  - `apps/moryflow/pc/src/main/sandx/mount-policy.ts`
  - `apps/moryflow/pc/src/main/sandx/runtime-adapter.ts`

## 风险与注意事项

- **Apple Container 仅 macOS 可用**：必须提供 Docker fallback。
- **授权路径暴露风险**：allowlist 需放在 host-only 目录，严禁挂载。
- **Bash 与 Agent 混跑**：若仅替换 Bash 工具，仍可能存在非 Bash 工具直接访问宿主资源的路径（需逐步收敛工具能力）。
- **Token 暴露**：env 文件挂载后容器内可读取 token；需在权限模型中明确风险。

## 下一步（待确认）

- 明确 Sandx 在 PC 端的最小目标：仅 Bash 工具隔离，还是全量 Agent 隔离。
- 确定授权策略与默认挂载目录（Vault / Workspace / 外部路径）。
- 确认 Docker 作为默认 fallback 还是手动开关。

