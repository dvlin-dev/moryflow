---
title: Moryflow PC 全局权限开关与 Full Access 完全放开方案（决策冻结稿）
date: 2026-03-05
scope: apps/moryflow/pc + packages/agents-runtime + packages/agents-sandbox + packages/agents-tools
status: completed
owners: [moryflow-pc]
---

<!--
[INPUT]: 当前 ask/full_access 会话级模型、Vault 边界与外部路径授权现状
[OUTPUT]: “全局权限开关 + full_access 完全放开（仅保留危险拦截）”的决策冻结口径与文件级改造清单
[POS]: Moryflow PC 权限模型根因重构方案（实施前事实源）

[PROTOCOL]: 本文档变更需同步 `docs/design/moryflow/core/index.md` 与 `docs/index.md`。
-->

# Moryflow PC 全局权限开关与 Full Access 完全放开方案（决策冻结稿）

## 1. 决策冻结（不可变更）

本次按“彻底重构、无历史兼容”执行，冻结以下规则：

1. 权限模式是**全局开关**，不再是会话级状态。
2. 权限切换**入口仍在对话输入区**（chat prompt selector），不新增设置页并行入口。
3. `full_access` 定义为**全系统 unrestricted**：
   - 不受 `vaultPath`、workspace、external paths 授权列表限制；
   - 文件工具与 bash 都可访问系统路径。
4. 仅保留“特别危险动作”硬拦截（Hard Deny）；其他动作默认可执行。
5. 明确零兼容：不保留会话级 `mode`、不保留旧 IPC、不保留旧文案语义。
6. Ask 模式改为“**只记住 allow**”：
   - 同类 `allow` 命中后，外部路径直接放行；
   - `deny` 只拒绝当前这一次，不做持久化。
7. 决策优先级冻结为：
   - `HARD_DENY_PATTERNS`（含危险级 deny）> `toolPolicy.allow` > ask 下传统 allow/external-path 规则 > Ask 审批。
8. `Bash(commandPattern)` 语义冻结为“命令族匹配”而非整串 shell 文本匹配，避免语义绕过与误放行。

## 2. 根因结论（为什么之前会失真）

当前问题不是单点 bug，而是结构性不一致：

1. **模式事实源错位**：`mode` 在 session 上，无法表达“全局开关”。
2. **路径策略错位**：`vaultUtils.resolvePath` 强制 Vault 内，天然抵消 `full_access`。
3. **执行策略错位**：sandbox/path-authorization 仍以 Vault 外授权为前提。
4. **平台策略错位**：macOS Seatbelt profile 默认按 Vault 白名单放开。

结论：只改某个点（例如 `generateSeatbeltProfile`）无法根治，必须做“模式感知执行链路”的端到端收口。

## 3. `generateSeatbeltProfile` 是否要改：明确结论

要改，但不是单独改。

1. `ask` 模式下：保留 Seatbelt，并继续使用受限 profile（按最小权限原则）。
2. `full_access` 模式下：不再走 Vault 限制 profile。
   - 推荐做法：macOS 走 unrestricted 通道（跳过 `sandbox-exec`）。
   - 备选做法：使用 permissive profile（不推荐，复杂且容易与系统策略冲突）。
3. 无论是否使用 Seatbelt，危险命令硬拦截都在命令过滤层强制执行。

## 4. 目标模型（重构后）

## 4.1 单一事实源

建议配置事实源固定为 `~/.moryflow/config.jsonc`：

```jsonc
{
  "agents": {
    "runtime": {
      "mode": {
        "global": "ask | full_access",
      },
    },
  },
}
```

会话仅消费全局模式，不再持久化独立 `mode`。

## 4.2 行为矩阵

| 维度                | ask                                                           | full_access                |
| ------------------- | ------------------------------------------------------------- | -------------------------- |
| 文件工具路径        | 默认 Vault 内；命中同类 `allow` 后可越过 Vault/external paths | 系统路径 unrestricted      |
| bash 执行目录       | 默认 Vault 内；命中同类 `allow` 后可直接执行外部路径          | 任意目录 unrestricted      |
| external paths 列表 | 仅在“未命中同类 allow 且未命中危险级 deny”时生效              | 不参与决策                 |
| 命令过滤            | Hard Deny（含危险级 deny）+ 未命中则审批                      | Hard Deny（含危险级 deny） |
| macOS 沙盒          | Seatbelt 受限执行                                             | unrestricted 通道          |

## 4.3 同类允许记忆模型（已确认）

本次采用“结构化规则引擎 + 可读 DSL 展示”：

1. 持久化只保存 `allow` 规则（事实源）。
2. UI 展示使用 DSL 样式（可读层），如 `Bash(git:*)`。

示意结构：

```jsonc
{
  "agents": {
    "runtime": {
      "permission": {
        "toolPolicy": {
          "allow": [
            { "tool": "Read" },
            { "tool": "Edit" },
            { "tool": "Bash", "commandPattern": "git:*" },
          ],
        },
      },
    },
  },
}
```

执行优先级（冻结）：

1. `HARD_DENY_PATTERNS`（危险命令硬拦截，含危险级 deny）
2. 用户同类 `allow` 策略（已确认：命中后外部路径直接放行）
3. ask 下传统 permission rules allow / external paths 判定
4. 未命中则 Ask 审批

补充约束：用户点击 `Deny` 仅拒绝当前请求，不写入持久策略。
补充约束：`Deny` 会写入当前请求的临时上下文（仅本次推理可见），请求结束即销毁。

## 4.4 `Bash(commandPattern)` 语义（冻结）

为确保“激进可用 + 不可绕过”，`commandPattern` 采用命令族匹配，V1 规则如下：

1. 匹配基于 shell 解析后的执行段 `argv[0]`（可执行名），不是原始命令字符串全文匹配。
2. `Bash(git:*)` 中 `git` 表示命令族（`argv[0]` 归一化后匹配）。
3. 命令中包含多段执行（如 `&&`/`;`/`||`/`|`）时，逐段匹配：
   - 任一段命中 Hard Deny（含危险级 deny）-> 直接拒绝；
   - 全部执行段命中 allow -> 直接放行；
   - 否则进入 Ask 审批。
4. 包含高歧义 shell 特性（如命令替换 `$()`、反引号、heredoc、重定向链）时：
   - ask 模式：不应用 `allow_type` 自动放行，回退 Ask；
   - full_access 模式：仅执行 Hard Deny（含危险级 deny）拦截，其余继续执行。
5. 禁止按“整串文本 contains”做模糊匹配，避免 `git ...; rm ...` 一类绕过。

## 5. 平台口径（含 Windows）

1. macOS：
   - `ask`：`sandbox-exec + seatbelt`；
   - `full_access`：不走 seatbelt 限制，仅保留危险命令硬拦截。
2. Windows/Linux：
   - 继续 `SoftIsolation`（无 OS 级沙盒）；
   - 同样遵守 `ask/full_access` 模式逻辑与危险命令硬拦截。

## 6. 安全治理基线（full_access 下仍保留）

1. 将命令治理拆成两层：
   - `HARD_DENY_PATTERNS`：始终拒绝（如删根目录、格式化磁盘、fork bomb、`curl|bash` 等）。
   - `CONFIRM_PATTERNS`：仅在 ask 需要确认（如高风险但可恢复动作）。
2. 现状中 `killall` 被放在 Hard Deny 且 reason 写“requires confirmation”，语义冲突；需收口到单一策略。
3. 增强审计：记录 `mode`、cwd、exitCode、duration、命令摘要（脱敏）并可追溯。
4. Ask 审批按钮固定为：
   - `Approve once`
   - `Always allow`
   - `Deny`
5. 命中 `Always allow` 的 Bash/文件类别后，不再触发该类别对应的 external path 审批（按已确认口径 B）。
6. `Deny` 的策略边界：
   - 仅拒绝当前请求；
   - 不写入 `toolPolicy`；
   - 不跨会话生效。

## 6.1 C 端文案（简短易懂）

用户可见文案统一用短句，避免技术术语：

1. 模式说明：
   - `Ask`：先问再执行
   - `Full Access`：全开放（危险操作仍会被拦截）
2. 全局提示：对所有对话生效
3. 按钮上方补充说明（固定显示）：
   - `How to apply this approval`
   - `Always allow` applies to similar actions in all chats.
4. 审批按钮：
   - `Approve once`
   - `Always allow`
   - `Deny`
5. 路径审批提示：`Allow access to this location?`
6. 危险命令拦截提示：`This action is blocked for safety reasons.`

## 6.2 i18n Key 命名建议（直接可落地）

延续现有 chat 翻译命名风格（camelCase）：

1. 复用已有 key：
   - `approveOnce`: `Approve once`
   - `approveAlways`: `Always allow`
2. 新增 key：
   - `denyOnce`: `Deny`
   - `approvalHowToApplyTitle`: `How to apply this approval`
   - `approvalAlwaysAllowHint`: `Always allow applies to similar actions in all chats.`

建议同时在 `en/zh-CN/ja/de/ar` 保持同一组 key，避免各语言结构漂移。

## 7. 文件级改造清单（实施 checklist）

> 说明：以下按“新增/修改文件”给出最小可执行清单；不做历史兼容分支。

### 7.1 全局模式控制面（Main + IPC + Renderer）

| 文件                                                                                                                         | 动作      | 改造点                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/moryflow/pc/src/main/chat/handlers.ts`                                                                                 | 修改      | 删除 `chat:sessions:updateMode`；新增 `chat:permission:getGlobalMode`、`chat:permission:setGlobalMode`、`chat:permission:onGlobalModeChanged`（广播）。 |
| `apps/moryflow/pc/src/main/chat/session-mode-updater.ts`                                                                     | 删除/重构 | 会话模式更新器下线，替换为全局模式更新器（单一职责）。                                                                                                  |
| `apps/moryflow/pc/src/main/agent-runtime/runtime-config.ts`                                                                  | 修改      | 增加全局 mode 读写能力（不仅仅读）；保证 `agents.runtime.mode.global` 成为唯一事实源。                                                                  |
| `apps/moryflow/pc/src/shared/ipc/chat.ts`                                                                                    | 修改      | 删除 `ChatSessionSummary.mode`；新增 `ChatGlobalPermissionMode` 与 `chat:permission:*` 契约类型。                                                       |
| `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`                                                                             | 修改      | `chat.updateSessionMode` 替换为 `chat.getGlobalMode` / `chat.setGlobalMode` / `chat.onGlobalModeChanged`。                                              |
| `apps/moryflow/pc/src/preload/index.ts`                                                                                      | 修改      | 对应替换 invoke/on 绑定，清理旧 `chat:sessions:updateMode`。                                                                                            |
| `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-sessions.ts`                                              | 修改      | 删除会话 mode 更新动作与状态耦合。                                                                                                                      |
| `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-controller.ts`                                       | 修改      | 切换行为改为更新全局模式，提示文案改为“Applies to all chats”。                                                                                          |
| `apps/moryflow/pc/src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-access-mode-selector.tsx` | 修改      | 入口保留在对话内，但语义改为“全局模式切换”。                                                                                                            |
| `packages/i18n/src/translations/chat/en.ts`                                                                                  | 修改      | 新增/替换全局提示文案（例如 `accessModeAppliesGlobal`）。                                                                                               |
| `packages/i18n/src/translations/chat/zh-CN.ts`                                                                               | 修改      | 同步全局提示文案。                                                                                                                                      |
| `packages/i18n/src/translations/chat/ja.ts`                                                                                  | 修改      | 同步全局提示文案。                                                                                                                                      |
| `packages/i18n/src/translations/chat/de.ts`                                                                                  | 修改      | 同步全局提示文案。                                                                                                                                      |
| `packages/i18n/src/translations/chat/ar.ts`                                                                                  | 修改      | 同步全局提示文案。                                                                                                                                      |

### 7.2 会话存储去 mode 化（零兼容）

| 文件                                                          | 动作 | 改造点                                    |
| ------------------------------------------------------------- | ---- | ----------------------------------------- |
| `apps/moryflow/pc/src/main/chat-session-store/store.ts`       | 修改 | 移除 `mode` 正规化与持久化。              |
| `apps/moryflow/pc/src/main/chat-session-store/const.ts`       | 修改 | `PersistedChatSession` 删除 `mode` 字段。 |
| `apps/moryflow/pc/src/main/chat-session-store/handle.ts`      | 修改 | `ChatSessionSummary` 映射删除 `mode`。    |
| `apps/moryflow/pc/src/main/chat-session-store/store.test.ts`  | 修改 | 删除/重写 `mode` 相关断言。               |
| `apps/moryflow/pc/src/main/chat-session-store/handle.test.ts` | 修改 | 删除/重写 `mode` 更新断言。               |

### 7.3 同类允许记忆（Tool Policy）改造

| 文件                                                                                                  | 动作 | 改造点                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/agents-runtime/src/tool-policy/types.ts`                                                    | 新增 | 结构化规则类型（ToolPolicy/Rule/MatchResult）作为唯一类型事实源。                                                    |
| `packages/agents-runtime/src/tool-policy/dsl.ts`                                                      | 新增 | 结构化规则 <-> DSL（`Bash(git:*)`）双向映射，仅用于展示层。                                                          |
| `packages/agents-runtime/src/tool-policy/matcher.ts`                                                  | 新增 | 规则命中算法（Hard Deny/危险级 deny 优先、allow 次之、未命中返回 ask）。                                             |
| `packages/agents-runtime/src/tool-policy/index.ts`                                                    | 新增 | 对外导出入口，收口模块边界。                                                                                         |
| `packages/agents-runtime/src/index.ts`                                                                | 修改 | 导出 tool-policy 能力。                                                                                              |
| `apps/moryflow/pc/src/main/agent-runtime/permission-store.ts`                                         | 修改 | 扩展 `~/.moryflow/config.jsonc` 读写：`agents.runtime.permission.toolPolicy`。                                       |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.ts`                                       | 修改 | 在传统 rules 前接入 tool-policy 判定，并输出命中类别到审计。                                                         |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime-guards.ts`                                | 修改 | 新增“命中同类 allow 后 bypass external path”判定。                                                                   |
| `apps/moryflow/pc/src/main/chat/approval-store.ts`                                                    | 修改 | 审批入参扩展为 `once/allow_type/deny`，命中 `allow_type` 时持久化类别策略并绕过同类后续审批；`deny` 仅拒绝当前请求。 |
| `apps/moryflow/pc/src/main/chat/handlers.ts`                                                          | 修改 | `chat:approve-tool` IPC 契约改为支持类别级记忆动作。                                                                 |
| `apps/moryflow/pc/src/shared/ipc/chat.ts`                                                             | 修改 | 新增审批动作类型与 tool-policy 命中回传结构。                                                                        |
| `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`                                                      | 修改 | 更新 `approveTool` 入参与返回类型。                                                                                  |
| `apps/moryflow/pc/src/preload/index.ts`                                                               | 修改 | 同步 `approveTool` IPC 参数映射。                                                                                    |
| `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.tsx`                 | 修改 | 审批按钮升级为 `Approve once / Always allow / Deny`，并增加按钮上方补充说明。                                        |
| `apps/moryflow/pc/src/renderer/components/chat-pane/hooks/use-chat-pane-controller.approval.test.tsx` | 修改 | 覆盖 `allow_type/deny` 交互动作与状态收敛（deny 不持久化）。                                                         |
| `apps/moryflow/pc/src/renderer/components/chat-pane/components/message/tool-part.test.tsx`            | 修改 | 覆盖审批按钮显示、回传动作与重复弹窗消失。                                                                           |
| `packages/i18n/src/translations/chat/en.ts`                                                           | 修改 | 复用 `approveOnce/approveAlways`，新增 `denyOnce`、`approvalHowToApplyTitle`、`approvalAlwaysAllowHint`。            |
| `packages/i18n/src/translations/chat/zh-CN.ts`                                                        | 修改 | 同步同一组 key。                                                                                                     |
| `packages/i18n/src/translations/chat/ja.ts`                                                           | 修改 | 同步同一组 key。                                                                                                     |
| `packages/i18n/src/translations/chat/de.ts`                                                           | 修改 | 同步同一组 key。                                                                                                     |
| `packages/i18n/src/translations/chat/ar.ts`                                                           | 修改 | 同步同一组 key。                                                                                                     |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.test.ts`                                  | 修改 | 增加危险级 deny + 同类 allow 命中、优先级与 external path bypass 回归。                                              |
| `apps/moryflow/pc/src/main/chat/approval-store.test.ts`                                               | 修改 | 增加 `allow_type` 持久化、`deny` 不持久化与请求级临时上下文回归。                                                    |
| `apps/moryflow/pc/src/main/chat/handlers.messages-snapshot.test.ts`                                   | 修改 | 覆盖审批事件快照字段升级（动作类型、命中类别）。                                                                     |

### 7.4 Runtime/Permission 链路按全局模式收口

| 文件                                                                   | 动作 | 改造点                                                                                      |
| ---------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| `apps/moryflow/pc/src/main/chat/chat-request.ts`                       | 修改 | `sessionMode` 改为读取全局 mode 并注入运行时 context。                                      |
| `apps/moryflow/pc/src/main/agent-runtime/index.ts`                     | 修改 | `effectiveMode` 仅来自全局 mode；删除会话 mode 兜底。                                       |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.ts`        | 修改 | `full_access` 下绕过 external path ask；保留 Hard Deny 结果。                               |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime-guards.ts` | 修改 | 删除“full_access 不得覆盖 external_path_unapproved”限制；ask/full_access 分流外部路径策略。 |
| `apps/moryflow/pc/src/main/chat/approval-store.ts`                     | 修改 | 自动放行判定改读全局 mode；删除 session mode 依赖。                                         |
| `apps/moryflow/pc/src/main/agent-runtime/permission-runtime.test.ts`   | 修改 | 补充 full_access unrestricted 与 ask 边界回归。                                             |
| `apps/moryflow/pc/src/main/chat/approval-store.test.ts`                | 修改 | 补充“全局模式切换后即时生效”回归。                                                          |

### 7.5 文件工具路径策略重构（根因位点）

| 文件                                                      | 动作 | 改造点                                                                                |
| --------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `packages/agents-runtime/src/vault-utils.ts`              | 重构 | 从“只支持 Vault”升级为“策略驱动路径解析”（ask=VaultOnly，full_access=Unrestricted）。 |
| `packages/agents-runtime/src/types.ts`                    | 修改 | 为路径策略增加显式类型（避免隐式分支）。                                              |
| `packages/agents-runtime/src/index.ts`                    | 修改 | 导出新的路径策略接口。                                                                |
| `packages/agents-tools/src/create-tools.ts`               | 修改 | 从 `vaultUtils` 依赖切到策略化 path utils。                                           |
| `packages/agents-tools/src/file/read-tool.ts`             | 修改 | 支持 unrestricted 解析与读取。                                                        |
| `packages/agents-tools/src/file/write-tool.ts`            | 修改 | 支持 unrestricted 写入与 patch。                                                      |
| `packages/agents-tools/src/file/edit-tool.ts`             | 修改 | 支持 unrestricted 编辑。                                                              |
| `packages/agents-tools/src/file/delete-tool.ts`           | 修改 | 支持 unrestricted 删除。                                                              |
| `packages/agents-tools/src/file/move-tool.ts`             | 修改 | 支持 unrestricted 移动。                                                              |
| `packages/agents-tools/src/file/ls-tool.ts`               | 修改 | 支持 unrestricted 列目录。                                                            |
| `packages/agents-tools/src/search/glob-tool.ts`           | 修改 | root 选择按模式分流（ask=Vault，full_access=cwd/system）。                            |
| `packages/agents-tools/src/search/grep-tool.ts`           | 修改 | root 选择按模式分流。                                                                 |
| `packages/agents-tools/src/search/search-in-file-tool.ts` | 修改 | 路径解析按模式分流。                                                                  |

### 7.6 Sandbox 与命令治理重构（含 `generateSeatbeltProfile`）

| 文件                                                    | 动作 | 改造点                                                                           |
| ------------------------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| `packages/agents-sandbox/src/types.ts`                  | 修改 | 为执行请求增加 `mode`（ask/full_access）。                                       |
| `packages/agents-sandbox/src/bash-tool.ts`              | 修改 | 将 `runContext.context.mode` 透传到 `sandbox.execute`。                          |
| `packages/agents-sandbox/src/sandbox-manager.ts`        | 修改 | `execute` 按 mode 分流：ask 走 path auth + sandbox；full_access 跳过 path auth。 |
| `packages/agents-sandbox/src/command/command-filter.ts` | 重构 | 拆分 Hard Deny 与 Confirm 规则，修复 `killall` 语义冲突。                        |
| `packages/agents-sandbox/src/platform/macos-sandbox.ts` | 重构 | `generateSeatbeltProfile` 仅服务 ask；full_access 不走 Vault 限制 profile。      |
| `packages/agents-sandbox/src/command/executor.ts`       | 修改 | 允许按 mode 选择是否使用 `platform.wrapCommand` 的受限路径。                     |
| `packages/agents-sandbox/test/command-filter.test.ts`   | 修改 | 覆盖 Hard Deny/Confirm 分类与 `killall` 回归。                                   |
| `packages/agents-sandbox/test/macos-sandbox.test.ts`    | 修改 | 覆盖 ask/full_access 双执行通道。                                                |
| `packages/agents-sandbox/test/bash-tool.test.ts`        | 修改 | 覆盖 mode 透传与 full_access 跳过 path auth。                                    |

### 7.7 兼容清理与文档同步

| 文件                                                          | 动作 | 改造点                                                                                                                                                                                                  |
| ------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/moryflow/pc/src/main/CLAUDE.md`                         | 修改 | 回写“全局 mode + unrestricted full_access”事实。                                                                                                                                                        |
| `apps/moryflow/pc/src/shared/ipc/CLAUDE.md`                   | 修改 | 更新 chat IPC 合同（移除会话 mode）。                                                                                                                                                                   |
| `packages/agents-runtime/CLAUDE.md`                           | 修改 | 更新路径策略与 mode 语义。                                                                                                                                                                              |
| `packages/agents-sandbox/CLAUDE.md`                           | 修改 | 更新 ask/full_access 双通道与危险拦截基线。                                                                                                                                                             |
| `packages/agents-tools/CLAUDE.md`                             | 修改 | 更新文件工具路径策略。                                                                                                                                                                                  |
| `apps/moryflow/pc/src/main/chat-session-store/store.ts`       | 修改 | 启动时一次性清理旧 `session.mode` 脏数据（删除字段，不迁移）。                                                                                                                                          |
| `apps/moryflow/pc/src/main/agent-runtime/permission-store.ts` | 修改 | 启动时清理旧顶层 `toolPolicy`、旧 remember 缓存键，统一写入 `agents.runtime.permission.toolPolicy`；并将历史 `permission.rules` 中非危险 deny 清理出执行链路，仅保留危险级 deny 并并入 Hard Deny 集合。 |
| `apps/moryflow/pc/src/main/chat/approval-store.ts`            | 修改 | 清理旧审批动作枚举（仅保留 `once/allow_type/deny`）。                                                                                                                                                   |
| `apps/moryflow/pc/src/main/index.ts`                          | 修改 | 应用启动执行一次“权限模型零兼容清理”流程并记录审计日志。                                                                                                                                                |

## 8. 实施阶段（一次性收口顺序）

1. 控制面先行：全局 mode IPC + renderer 入口改造完成。
2. 同类允许记忆：tool-policy 引擎 + 审批动作升级（`once/allow_type/deny`）。
3. 路径策略收口：`vault-utils` 与 file/search tools 改成策略驱动。
4. sandbox 收口：`execute(mode)` + macOS ask/full_access 双通道。
5. 清理旧语义：删除 session mode 与旧测试。
6. 文档与 CLAUDE 同步回写。

## 8.1 实施进度（实时）

> 更新时间：2026-03-05（第二轮收口）

- [x] 阶段 1：全局 mode 控制面 + 会话去 mode
  - `chat:sessions:updateMode` 已下线，替换为：
    - `chat:permission:getGlobalMode`
    - `chat:permission:setGlobalMode`
    - `chat:permission:global-mode-changed` 广播
  - `ChatSessionSummary` / 会话持久化已移除 `mode` 字段；启动时清理 legacy `session.mode` 脏数据。
  - Renderer 输入区切换已改为全局模式，保留原入口位置（对话输入区）。
- [x] 阶段 2：runtime/approval 链路改读全局 mode
  - `chat-request`、`approval-store`、`agent-runtime` 已统一读取 `agents.runtime.mode.global`。
  - `runtime-config` 已支持全局模式读写，并在写入时移除旧 `mode.default`，保证单一事实源。
  - 定向测试与类型检查通过（见第 10 节前置校验记录）。
- [x] 阶段 3：tool-policy 结构化规则（同类 allow 记忆）全面收口
  - 新增 `packages/agents-runtime/src/tool-policy/{types,dsl,matcher,index}.ts`，并导出到 `packages/agents-runtime/src/index.ts`。
  - `permission-store` 持久化扩展到 `agents.runtime.permission.toolPolicy.allow`，`allow_type` 命中后以同类规则持久化（外部路径审批同样生效）。
  - Ask 下 `deny` 已收口为“仅本次拒绝 + 不持久化”。
- [x] 阶段 4：路径策略（VaultOnly vs Unrestricted）与 agents-tools 改造
  - `vault-utils.resolvePath/readFile` 已改为按 `runContext.context.mode` 分流（ask=VaultOnly，full_access=Unrestricted）。
  - 文件工具（read/write/edit/delete/move/ls/search_in_file）已全量透传 runContext。
  - 搜索工具（glob/grep）在 full_access 下 root 已切为 `process.cwd()`。
- [x] 阶段 5：agents-sandbox ask/full_access 双通道与命令治理收口
  - `SandboxConfig` 新增 `mode`，`bash-tool -> sandbox-manager -> command executor/platform` 全链路透传。
  - ask：保留命令确认 + 外部路径授权；full_access：跳过二者，仅保留 Hard Deny。
  - macOS：ask 继续 `sandbox-exec + seatbelt`，full_access 走 unrestricted 通道；`killall` 已从 Hard Deny 调整为确认类命令。
- [x] 阶段 6：全量回归、CLAUDE/doc 最终同步
  - 已同步 CLAUDE：`main`、`shared/ipc`、`chat-pane`、`agents-runtime`、`agents-sandbox`、`agents-tools`、`i18n`。
  - 已完成关键回归验证并全部通过（见第 10.1 节）。

## 9. 验收标准（DoD）

1. 任意对话切换模式，全应用会话立即同步为同一模式。
2. `full_access` 下：
   - 文件工具可访问 Vault 外任意绝对路径；
   - bash 可在任意 cwd 执行；
   - 不再触发 external path authorize。
3. `ask` 下：
   - 保留外部路径授权流程（仅针对未命中同类 allow 且未命中危险级 deny 的请求）；
   - 保留审批体验。
4. Ask 同类 `allow_type` 命中后不再重复弹窗；`deny` 仅对当前请求生效且只在本次请求上下文可见。
5. 命中同类 `allow` 的请求会直接放行并跳过 external path 审批（已确认口径 B）。
6. 危险命令在两种模式下均 Hard Deny。
7. 模式切换入口仍在对话输入区，且文案明确“作用于所有对话”。

## 10. 测试与发布闸门（L2）

必须通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

新增回归最小集合：

1. 全局模式切换跨会话同步。
2. Ask 同类策略：`allow_type` 持久化后，同类请求不再重复弹窗；`deny` 不持久化且仅请求级上下文生效。
3. Ask 同类 `allow` 命中后直接放行并绕过 external path 审批（口径 B）。
4. `full_access` 文件工具越出 Vault 的读写/编辑/移动/删除。
5. `full_access` bash 外部 cwd 执行 + 不触发 path authorize。
6. `ask` 外部路径审批（拒绝/授权后放行，且仅在未命中同类 allow 且未命中危险级 deny 时触发）。
7. 危险命令 Hard Deny（含 `rm /`、`mkfs`、`curl|bash`、`kill -9 1` 等）。
8. macOS ask/full_access 双通道执行行为断言。

## 10.1 本次收口验证记录（2026-03-05）

1. `pnpm --filter @moryflow/agents-runtime exec vitest run src/__tests__/runtime-config.test.ts src/__tests__/tool-policy.test.ts src/__tests__/vault-utils.test.ts`
   - 结果：3 files / 11 tests passed
2. `pnpm --filter @moryflow/agents-sandbox test`
   - 结果：7 files / 112 tests passed
3. `pnpm --filter @moryflow/agents-tools test:unit`
   - 结果：5 files / 14 tests passed
4. `pnpm --filter @moryflow/agents-tools exec tsc --noEmit`
   - 结果：passed
5. `pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/permission-runtime.test.ts src/main/chat/approval-store.test.ts src/main/chat/handlers.messages-snapshot.test.ts src/main/chat-session-store/store.test.ts src/main/chat-session-store/handle.test.ts`
   - 结果：5 files / 34 tests passed
6. `pnpm --filter @moryflow/pc exec vitest run src/renderer/components/chat-pane/hooks/use-chat-pane-controller.test.tsx src/renderer/components/chat-pane/hooks/use-chat-pane-controller.approval.test.tsx src/renderer/components/chat-pane/components/chat-prompt-input/chat-prompt-input-access-mode-selector.test.tsx`
   - 结果：3 files / 11 tests passed
7. `pnpm --filter @moryflow/pc typecheck`
   - 结果：passed
