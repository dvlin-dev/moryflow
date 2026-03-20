---
title: Moryflow PC 权限架构
date: 2026-03-08
scope: apps/moryflow/pc + packages/automations-core + packages/agents-runtime + packages/agents-sandbox + packages/agents-tools
status: active
---

<!--
[INPUT]: Moryflow PC 当前权限模型、审批链路、首次授权交互与工具策略
[OUTPUT]: 单一权限事实源（全局模式 + 审批协议 + 风险边界）
[POS]: Moryflow Core / PC 权限架构

[PROTOCOL]: 仅在权限模型、不变量、代码入口或跨文档引用失真时更新；不维护历史迁移日志。
-->

# Moryflow PC 权限架构

## 1. 当前状态

1. 权限模式已经收口为全局 `ask | full_access` 开关，不再维护会话级 `mode`。
2. `full_access` 已定义为系统级 unrestricted：文件工具与 bash 都可访问 Vault 外路径，不再依赖 external path authorize。
3. Ask 模式只持久化同类 `allow`；`deny` 只对当前请求生效，不再作为长期规则留存。
4. 危险命令始终走 Hard Deny，两种模式都不能绕过。
5. 新用户默认进入 `ask`；首次命中需要授权的操作时，会收到单次 `full_access` 升级提醒。
6. 用户在会话中切换到 `full_access` 后，挂起审批会立即收敛；自动放行场景不再留下可点击但已失效的审批卡。
7. `Automations` 的后台执行不复用会话级交互审批；它们会把 `AutomationExecutionPolicy` 映射为本次 run 的 runtime override，并固定使用 `approvalMode='deny_on_ask'` 执行，任何需要 ask 的动作都会在本次 run 内即时拒绝。

## 2. 冻结模型

### 2.1 全局模式

```ts
type GlobalPermissionMode = 'ask' | 'full_access';
```

约束：

1. 事实源固定在 runtime 配置层，不再由会话独立持久化。
2. 输入框仍是权限切换入口，但入口只消费全局状态，不再创建第二套设置页开关。
3. 历史 `session.mode`、旧 IPC、旧文案与旧审批动作都必须被清理。

### 2.2 决策顺序

权限判定顺序固定为：

1. `Hard Deny`
2. Ask 模式下的持久化 `allow`
3. Ask 模式下的审批 / 首次升级提醒
4. `full_access` 的 unrestricted 放行

不变量：

1. Hard Deny 优先级最高，任何模式都不能覆盖。
2. `full_access` 只绕过一般权限边界，不绕过特别危险动作限制。
3. Ask 模式中的 external path / 同类 allow / 审批协议属于同一条权限链，不能拆成多套平行规则。

### 2.3 Automations 后台执行

约束：

1. Automations 仍共享同一套 runtime permission pipeline，不单独维护第二套 sandbox。
2. 自动化 run 的审批语义固定为“不可交互、命中 ask 即拒绝”，不能把审批卡片泄漏到后台执行链路。
3. 自动化 run 的文件/工具/网络边界必须由 `AutomationExecutionPolicy -> runtimeConfigOverride` 单向映射，不允许 renderer 或 IPC 临时拼装第二套权限规则。

## 3. 行为矩阵

| 场景                | ask                 | full_access  |
| ------------------- | ------------------- | ------------ |
| Vault 内文件操作    | 未命中 allow 时审批 | unrestricted |
| Vault 外文件操作    | 未命中 allow 时审批 | unrestricted |
| bash cwd / 系统路径 | 未命中 allow 时审批 | unrestricted |
| external paths 列表 | 仅 ask 下参与决策   | 不参与决策   |
| 危险命令            | Hard Deny           | Hard Deny    |

补充：

1. `Bash(commandPattern)` 语义固定为命令族匹配，不是整串 shell 文本匹配。
2. 路径策略、tool policy 与 sandbox 执行都必须感知全局模式，不能再默认以 Vault 白名单覆盖 `full_access`。

### 3.1 无人值守自动化约束

1. 自动化 run 仍复用同一套运行时权限系统，但执行入口固定为无人值守语义，不复用会话里的交互审批卡。
2. `@moryflow/automations-core` 的 `AutomationExecutionPolicy` 是自动化权限合同唯一事实源；PC 主进程必须先把它映射成 runtime `permission rules + toolPolicy override`，再交给运行时执行。
3. 当前产品预设固定为：允许 `Read` / `Edit`，文件系统限制为 `vault_only`，网络默认 `deny`；这解释了为什么自动化可以读写当前 Vault，但默认不能直接联网。
4. 自动化表单必须显式确认 `Confirm unattended execution` 后才能保存；`requiresExplicitConfirmation` 为强制门槛，不允许静默默认勾选。
5. 自动化即使扩展为 allowlist，也仍然不进入交互式 ask；未被合同允许的动作一律在当前 run 中直接 deny。

## 4. 首次升级提醒与审批协议

### 4.1 交互规则

1. 新用户默认以 `ask` 进入会话。
2. 第一次命中需要授权的操作时，展示单次 `full_access` 升级提醒。
3. 用户点击 `Enable Full access` 后，切换必须立即作用于当前会话。
4. 用户点击 `Keep Ask mode` 后，继续沿用 ask，不再重复弹同类首次提醒。

### 4.2 工程边界

1. 主进程负责审批上下文查询、提醒消费持久化与幂等审批结果收敛。
2. 渲染层负责检测提醒触发时机、展示弹层并调用全局权限切换方法。
3. 审批协议必须支持幂等回收；旧卡片被点击时，UI 静默收敛，不向用户暴露“审批不存在/已过期”错误。

## 5. 配置与事实源

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

约束：

1. 工具策略持久化只保留 `allow` 规则。
2. external paths 如果继续存在，只能作为 ask 模式的审批辅助事实源，不能再被解释为第二套权限模型。
3. 历史 `toolPolicy` 键、旧审批动作和旧兼容字段都必须清理。

## 6. 模块边界

1. `@moryflow/automations-core`：自动化执行政策合同、显式确认门槛与 delivery/source/schedule 类型。
2. `@moryflow/agents-runtime`：全局模式、tool policy、审批语义与共享类型。
3. `@moryflow/agents-sandbox`：ask / full_access 双执行通道、Hard Deny 与执行边界。
4. `@moryflow/agents-tools`：路径策略透传与工具侧权限感知。
5. `@moryflow/pc`：权限入口、首次升级提醒、审批卡片收敛、自动化 `deny_on_ask` 装配与跨会话同步。

## 7. 验收标准

1. 任意对话切换模式，全应用会话立即同步为同一模式。
2. `full_access` 下文件工具与 bash 都可访问系统路径，但危险命令仍 Hard Deny。
3. `ask` 下未命中 allow 的操作仍走审批链路，allow 命中后不重复弹窗。
4. 首次升级提醒只出现一次，且切换后当前会话即时生效。
5. 自动放行场景不再暴露已失效的审批卡点击错误。

## 8. 当前验证基线

1. `@moryflow/agents-runtime` 负责 `runtime-config`、`tool-policy`、`permission` 等共享权限语义回归。
2. `@moryflow/agents-sandbox` 负责 ask/full_access 双执行通道与命令过滤回归。
3. `@moryflow/agents-tools` 负责路径策略透传与越出 Vault 的工具行为回归。
4. `apps/moryflow/pc` 负责全局模式切换、首次升级提醒、审批链路、自动化 `deny_on_ask` 与渲染入口回归。
5. 涉及自动化权限映射时，至少执行 `apps/moryflow/pc/src/main/automations/policy.test.ts` 与 `apps/moryflow/pc/src/main/agent-runtime/permission/permission-runtime.test.ts`。
6. 后续修改权限模型、tool policy 或 sandbox 通道时，按 L2 执行根级校验。
