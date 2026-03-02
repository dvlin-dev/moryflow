---
title: Moryflow PC 权限模型重写方案（ask/full_access + External Paths）
date: 2026-03-02
scope: apps/moryflow/pc + packages/agents-runtime + packages/agents-sandbox + packages/agents-mcp
status: completed
owners: [moryflow-pc]
---

<!--
[INPUT]: 会话模式权限、Vault 外路径授权、沙盒硬拦截规则、MCP 配置项
[OUTPUT]: 单一权限心智的重构方案（Vault 内模式控制 + Vault 外授权清单）
[POS]: Moryflow PC 权限系统改造事实源（评审稿）

[PROTOCOL]: 本文档变更需同步 `docs/design/moryflow/core/index.md` 与 `docs/index.md`（若入口发生变化）。
-->

# Moryflow PC 权限模型重写方案（ask/full_access + External Paths）

## 0. 当前进度（实施中）

1. [x] Phase 1：模型与命名统一（`agent -> ask`）。
2. [x] Phase 2：外部路径授权主链路（永久授权 + 设置页可管）。
3. [x] Phase 3：冗余入口清理（移除 sandbox mode / MCP `autoApprove`）。
4. [x] Phase 4：校验、回归测试、文档与 `CLAUDE.md` 同步。

### 0.1 执行日志（实时同步）

1. [x] 2026-03-02 14:33（Asia/Shanghai）：完成 workspace 依赖安装（`pnpm install`）。
2. [x] 2026-03-02 14:36（Asia/Shanghai）：完成全量类型检查（`pnpm typecheck`，通过）。
3. [x] 2026-03-02 14:38（Asia/Shanghai）：完成全量代码检查（`pnpm lint`，通过）。
4. [x] 2026-03-02 14:40（Asia/Shanghai）：完成全量单元测试（`pnpm test:unit`，通过）。
5. [x] 2026-03-02 14:47（Asia/Shanghai）：完成相关 `CLAUDE.md` 与 docs 索引同步（权限模型事实源收口）。
6. [x] 2026-03-02 14:48（Asia/Shanghai）：修复根因问题：仅对 Vault 外路径执行 external-path 授权判定；`full_access` 仅不覆盖 `external_path_unapproved`。
7. [x] 2026-03-02 14:49（Asia/Shanghai）：新增回归测试 `permission-runtime.test.ts`（6 条）并通过。
8. [x] 2026-03-02 14:50（Asia/Shanghai）：完成二次 L2 回归（`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过）。
9. [x] 2026-03-02 14:52（Asia/Shanghai）：删除 `agents-sandbox` 内部 `normal/unrestricted` 模式语义（类型与平台分支一起移除）。
10. [x] 2026-03-02 14:54（Asia/Shanghai）：完成三次 L2 回归确认（`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过）。
11. [x] 2026-03-02 15:06（Asia/Shanghai）：修复权限短路根因：external-path 已授权不再短路整次规则判定，仅剔除已授权 Vault 外目标后继续评估其余 targets。
12. [x] 2026-03-02 15:06（Asia/Shanghai）：设置页路径管理改为每次增删后回读主进程标准化结果；`agents-sandbox` 删除临时授权死代码（仅保留永久授权模型）。
13. [x] 2026-03-02 15:10（Asia/Shanghai）：完成本轮修复后的 L2 全量回归（`pnpm lint`、`pnpm typecheck`、`pnpm test:unit` 全部通过）。
14. [x] 2026-03-02 15:59（Asia/Shanghai）：按 PR review 修复 Vault 外首次访问链路：`external_path_unapproved` 改为 `ask`；审批通过后写入 External Paths 永久授权（不再要求先去 Settings 手动添加）。
15. [x] 2026-03-02 16:45（Asia/Shanghai）：按新增 PR 评论做根因收口：`agents-sandbox` 测试语义与永久授权模型对齐（移除 `allow_once/clearTemp`）；新增统一路径规范化工具并让 PC guard/sandbox 复用；Settings 增加 External Paths 绝对路径前置校验与可见错误提示（补齐 i18n）。

### 0.2 验证记录（L2）

1. `pnpm lint`：通过。
2. `pnpm typecheck`：通过。
3. `pnpm test:unit`：通过。

## 1. 决策结论（已确认）

1. 输入框模式保留两档：`ask | full_access`（入口位置不变）。
2. `agent` 命名全量替换为 `ask`（不做历史兼容）。
3. `full_access` 在 **Vault 内** 可覆盖 `deny`（Vault 内全放行）。
4. Vault 外路径必须先授权；未授权时无论模式都需要先审批授权（拒绝则阻断）。
5. 外部路径一旦授权默认永久生效，可在设置页面查看、添加、删除。
6. 危险命令/硬拦截规则始终生效，不受模式影响。
7. 删除 MCP `autoApprove`，避免第二套权限开关。

## 2. 目标模型

## 2.1 单一心智（用户视角）

用户只需要理解两件事：

1. 会话模式（输入框）：
   - `ask`：需要确认的操作会请求确认。
   - `full_access`：Vault 内不再询问，直接执行。
2. 外部路径授权（设置页）：
   - 路径在授权清单中才可访问 Vault 外文件。
   - 不在清单中则一律拒绝。

## 2.2 决策优先级（系统视角）

权限判定按以下顺序执行：

1. **硬拦截层（最高优先级）**
   - 危险命令直接拒绝。
2. **路径边界层**
   - 目标在 Vault 外且未授权：触发授权审批；拒绝审批则拒绝。
3. **会话模式层（仅 Vault 内）**
   - `full_access`：Vault 内全部放行（包含原 `deny`）。
   - `ask`：按 permission rules 走 `allow/ask/deny`。

## 3. Vault 外路径授权设计

## 3.1 授权规则

1. 授权粒度：目录级（目录下子路径继承授权）。
2. 授权生效：永久（不提供 `allow_once`）。
3. 授权范围：授权路径内的 `read/edit/bash` 可用（仍受硬拦截命令限制）。
4. 默认策略：未授权必须先授权（两种会话模式一致，不可自动放行）。

## 3.2 首次访问交互

当工具访问 Vault 外路径且路径未授权时：

1. 弹出授权对话框：`Authorize path` / `Deny`。
2. 选择 `Authorize path`：
   - 路径写入授权清单（永久）。
   - 当前操作自动重试一次。
3. 选择 `Deny`：
   - 立即拒绝当前操作。

## 3.3 设置页管理

Settings 保留一个独立块：`External Paths`。

1. 展示全部已授权路径。
2. 支持手动添加目录。
3. 支持删除单条路径。
4. 支持清空全部（可选，需二次确认）。

## 4. 危险命令/硬拦截规则（始终拒绝）

当前硬拦截来源：`packages/agents-sandbox/src/command/command-filter.ts`。

主要类别如下：

1. 破坏系统根目录：`rm /`、`rm /*`、`rm ~/`。
2. 文件系统破坏：`mkfs`、`dd if=/dev/(zero|random|urandom) ... of=/dev/...`。
3. Fork bomb：`:(){ :|:& }`。
4. 系统关键目录删除：`/etc`、`/bin`、`/usr`、`/var`、`/System`、`/Library`。
5. 高危权限变更：`chmod 777 /`、`chown ... /`。
6. 管道注入执行：`curl ... | bash`、`wget ... | bash`。
7. 关键进程破坏：`kill -9 1`、`killall`。

注：`killall` 当前实现为硬拦截，重构时需同步修正文案，避免“requires confirmation”误导。

## 5. 重构范围（根因级）

## 5.1 命名收敛：`agent -> ask`

全量替换以下语义层：

1. shared IPC 类型与校验。
2. main chat/session store 模式字段。
3. renderer 状态与组件入参。
4. i18n 文案与测试断言。
5. agents-runtime 类型与默认配置。

## 5.2 权限入口收口

保留：

1. 输入框会话模式切换（`ask/full_access`）。
2. External Paths 管理页面。
3. 外部路径授权弹窗（首次未授权访问）。

删除：

1. Sandbox mode（`normal/unrestricted`）用户配置入口。
2. MCP `autoApprove` 字段与 UI。

## 5.3 存储与事实源统一

统一一份授权清单事实源：

1. 建议路径：`~/.moryflow/config.jsonc`
2. 建议键位：`agents.runtime.externalPaths.allowlist`
3. permission runtime 与 sandbox 执行层共享读取该清单。

不再保留分散且语义重复的权限配置源。

## 6. 行为矩阵

| 场景                    | ask                     | full_access                      |
| ----------------------- | ----------------------- | -------------------------------- |
| Vault 内 + 非硬拦截操作 | 按规则 `allow/ask/deny` | 直接 allow（覆盖 vault 内 deny） |
| Vault 外 + 未授权路径   | ask（拒绝则 deny）      | ask（拒绝则 deny）               |
| Vault 外 + 已授权路径   | allow                   | allow                            |
| 命中危险命令硬拦截      | deny                    | deny                             |

## 7. 实施阶段

### Phase 1：模型与命名统一

1. 完成 `agent -> ask` 全量替换。
2. `chat:sessions:updateMode` 仅接受 `ask | full_access`。

### Phase 2：外部路径授权主链路

1. 实现外部路径授权清单事实源。
2. 未授权路径触发审批 + 授权弹窗 + 授权后自动重试。
3. Settings 增加 External Paths 列表增删能力。

### Phase 3：冗余入口清理

1. 删除 sandbox mode 配置 UI 与对应 IPC。
2. 删除 MCP `autoApprove` 全链路字段。

### Phase 4：收口验证

1. 回归测试补齐。
2. 文档与 CLAUDE 同步。
3. 风险分级按 L2 全量校验。

## 8. 验收标准（DoD）

## 8.1 产品

1. 输入框仅有 `Ask/Full access` 两档模式。
2. Settings 可查看/添加/删除 External Paths。
3. Vault 外未授权访问会先请求授权；拒绝则拒绝，授权后可持续使用。

## 8.2 安全

1. `full_access` 仅对 Vault 内生效。
2. 危险命令在两种模式下均被硬拒绝。
3. 审计日志可追踪模式切换与权限决策。

## 8.3 工程

1. 无 `agent` 语义残留。
2. 无 MCP `autoApprove` 残留。
3. 无 sandbox mode 相关用户配置残留。

## 9. 测试计划（L2）

必须通过：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
```

新增/更新重点用例：

1. Vault 内：`full_access` 覆盖 `deny`，`ask` 保持审批。
2. Vault 外：未授权路径在两种模式都触发审批，拒绝后拒绝。
3. Vault 外：授权路径在两种模式都可访问。
4. External Paths 设置页增删改渲染与持久化。
5. 危险命令硬拒绝不受模式影响。

## 10. 结论

该方案将权限体系重写为“会话模式 + 外部路径授权清单”双层模型：

1. 会话模式用于效率（Vault 内）。
2. 授权清单用于边界（Vault 外）。
3. 硬拦截用于底线（危险命令）。

这能同时满足“操作简单”和“边界可控”。
