---
title: Moryflow Agent Runtime Tool 精简改造方案（Bash-First）
date: 2026-03-03
scope: docs/design/moryflow/features
status: completed
---

# Moryflow Agent Runtime Tool 精简改造方案（Bash-First）

## 0. 范围声明（避免误解）

本方案的改造范围仅限 **PC 端 Agent Runtime**。

1. PC：将默认文件/搜索工具收敛为 Bash-First。
2. Mobile：不具备 bash 能力，继续使用现有文件/搜索工具集，不在本轮变更。

## 1. 背景

当前 Moryflow PC Agent Runtime 的工具集合偏大且存在职责重叠：

1. PC 默认链路同时挂载文件类工具（read/write/edit/delete/move/ls）、搜索类工具（glob/grep/search_in_file）与 `bash`。
2. `bash` 与文件/搜索工具在能力层高度重叠，导致模型工具选择分散，工具调用策略不稳定。
3. 运行时还叠加 `tasks_*`、`subagent`、`skill`、MCP 与 external tools，整体工具面进一步膨胀。

本方案目标是基于 Vercel 近期实践，收敛为可维护的最小工具面，优先提升执行稳定性与可预测性。

## 2. 外部参考输入（2026-03-03 采集）

### 2.1 文档来源

1. [How to Build Agents with Filesystems and Bash](https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash)
2. [Testing if Bash Is All You Need](https://vercel.com/blog/testing-if-bash-is-all-you-need)
3. [vercel-labs/bash-tool](https://github.com/vercel-labs/bash-tool)（本地分析提交：`134d5fb`）

### 2.2 可迁移结论

1. 对“代码/文件操作型任务”，`bash + filesystem` 通常可覆盖大部分需求，过多专用工具会放大工具选择负担。
2. 仅靠 bash 并非对所有任务最优；结构化数据（SQL/聚合）场景应保留或补充领域工具，而不是强迫模型用 shell 拼接复杂管道。
3. `bash-tool` 的关键设计是“最小三件套 + 清晰 sandbox 抽象”：`bash/readFile/writeFile`，并在工具描述里显式告知工作目录与可用文件。
4. `bash-tool` 对工程可维护性的启发：
   - 统一 sandbox 接口（`executeCommand/readFile/writeFiles`）
   - 输出上限控制（`maxOutputLength`）
   - `onBeforeBashCall/onAfterBashCall` 可观测拦截点
   - 大目录输入使用流式装载与文件数上限保护

### 2.3 `bash-tool` 代码级拆解（本地仓库）

| 模块                       | 关键设计                                                                                                                 | 可借鉴点                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `src/tool.ts`              | `createBashTool` 工厂统一返回 `{ bash, tools, sandbox }`；文件注入采用分批写入（`WRITE_BATCH_SIZE=20`）+ `maxFiles` 限流 | 工具装配入口单一化；大目录场景内存压力可控 |
| `src/types.ts`             | 将沙盒能力抽象为 `executeCommand/readFile/writeFiles` 三方法，并开放 `onBeforeBashCall/onAfterBashCall`                  | 抽象层清晰，便于跨沙盒适配                 |
| `src/tools/bash.ts`        | bash 工具描述动态生成（cwd/文件样例/常见命令）；支持输出截断与可选 `experimentalTeeTransform`                            | 提升模型可执行性与中间结果可回看能力       |
| `src/files/loader.ts`      | `streamFiles` + `getFilePaths` 分离；先拿路径，再按需流式读内容                                                          | 降低 prompt 生成与文件传输耦合             |
| `src/sandbox/just-bash.ts` | `OverlayFs` 支持 copy-on-write（读真实目录、写内存层）                                                                   | 本地研发态快速沙盒化，可用于低成本实验     |
| `src/tools-prompt.ts`      | 探测可用命令并按文件格式生成提示（如 JSON 优先 `jq`）                                                                    | 工具提示词可依据环境动态收敛               |

### 2.4 与 Moryflow 当前实现对照

| 维度       | `bash-tool`                          | Moryflow 当前实现                                               | 结论                                     |
| ---------- | ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------- |
| 安全边界   | 以可插拔扩展为主，默认策略较轻       | `SandboxManager` 已有危险命令硬拦截 + 白名单确认 + 外部路径授权 | Moryflow 安全控制更强，不应弱化          |
| 执行控制面 | 工具内包含较多执行治理               | 执行治理集中在 runtime/sandbox 控制面                           | 继续保持控制面集中，避免分散             |
| 文件注入   | 流式读取 + 批量写入 + 文件数上限     | 目前以 Vault 实盘执行为主，未显式做“上传目录限流”策略           | 可引入到“外部沙盒/远程执行”场景          |
| 观察性     | `onBefore/onAfter` 与 `tee` 中间产物 | 已有 `wrapToolsWithHooks` 与输出落盘截断                        | 可在现有 hook 体系内补齐“命令级元数据”   |
| 跨端策略   | 不覆盖移动端能力差异                 | 已明确 PC Bash-First / Mobile 非 bash                           | 当前跨端策略正确，需持续在文档中显式声明 |

### 2.5 借鉴与不借鉴清单（决策）

建议借鉴：

1. 保留并强化单一工具装配事实源（PC 维持 `createPcLeanTools*`）。
2. 在不绕过安全层的前提下，补充命令执行前后可观测钩子（基于现有 `wrapToolsWithHooks` 收敛）。
3. 为外部沙盒场景引入 `streamFiles + batch write + maxFiles` 机制。
4. 强化 bash 描述动态信息（cwd、文件样例、推荐命令、长输出处理提示）。

不建议直接照搬：

1. 不在工具层引入可绕开安全过滤的命令改写通道。
2. 不以 `just-bash` 替换生产链路沙盒（仅可作为本地实验能力）。
3. 不将输出截断逻辑拆散到多个工具实现，继续由 runtime 统一治理。

## 3. 当前 Moryflow Runtime 事实

### 3.1 PC 端实际注入（静态部分）

1. 文件类：`read/write/edit/delete/move/ls`
2. 搜索类：`glob/grep/search_in_file`
3. 网络类：`web_fetch/web_search`
4. 任务类：`tasks_*`（11 个）+ `subagent`
5. 其他：`generate_image`、沙盒 `bash`、`skill`
6. 动态注入：MCP tools、external tools

结论：PC 端静态工具数已超过 25，且其中至少 9 个与 bash 高重叠。

### 3.2 Mobile 端实际注入

1. 保留文件/搜索/网络/`tasks_*`/`generate_image`
2. 不支持：`bash`、`skill`、MCP、`subagent` 子代理

结论：跨端能力差异客观存在，精简应优先在 PC 端执行，Mobile 暂不做 Bash-First。

### 3.3 端能力矩阵（本方案）

| 能力域                                                                         | PC（本方案）             | Mobile（本方案）     |
| ------------------------------------------------------------------------------ | ------------------------ | -------------------- |
| 文件/搜索专用工具（`read/write/edit/delete/move/ls/glob/grep/search_in_file`） | 默认移除                 | 保持现状（继续使用） |
| `bash`                                                                         | 保留且作为主文件操作通道 | 不支持               |
| `skill`                                                                        | 保留                     | 不支持               |
| MCP tools                                                                      | 保留（动态）             | 不支持               |
| `tasks_*`                                                                      | 保留                     | 保留                 |
| `subagent`                                                                     | 保留                     | 不支持               |
| `web_fetch/web_search`                                                         | 保留                     | 保留                 |
| `generate_image`                                                               | 保留                     | 保留                 |

## 4. 改造目标

1. 将 **PC 端**工具策略收敛为 Bash-First，移除与 bash 重叠的文件/搜索工具默认注入。
2. 保留“非 bash 的高价值工具”：`web_fetch`、`web_search`、`tasks_*`、`subagent`、`generate_image`、`skill`、MCP/external。
3. 保持现有安全边界不退化：继续使用 `@moryflow/agents-sandbox` 的命令过滤与外部路径授权。
4. 保持 Prompt 口径与运行时注入一致，避免再次出现“文案能力 > 实际能力”的漂移。

## 5. 单版本改造方案

### 5.1 工具集合收敛（仅 PC）

默认移除以下工具注入：

1. `read`
2. `write`
3. `edit`
4. `delete`
5. `move`
6. `ls`
7. `glob`
8. `grep`
9. `search_in_file`

PC 默认保留：

1. `bash`
2. `web_fetch`
3. `web_search`
4. `generate_image`
5. `tasks_*`
6. `subagent`
7. `skill`
8. MCP tools（动态）
9. external tools（动态）

### 5.2 运行时装配调整

1. 在 PC runtime 中不再从 `createBaseTools` 装配文件/搜索工具集合。
2. 新增面向 PC 的精简装配入口（建议命名：`createPcLeanTools`），单一事实源维护“PC 默认工具清单”。
3. `createSandboxBashTool` 保持为唯一文件系统主通道，避免双轨工具竞争。

### 5.3 Bash 工具可用性增强

1. 在 `bash` 工具 description 中补充“工作目录、常见命令、输出大结果处理建议”。
2. 继续由 runtime 统一做输出截断与落盘提示，不在 bash tool 内重复实现截断逻辑。
3. 复用现有 `wrapToolsWithHooks` 作为 before/after 扩展点，不新增平行 hook 机制。
4. 所有扩展点必须位于 `SandboxManager` 安全检查之后，禁止通过 hook 绕过 `command-filter` 与路径授权。

### 5.4 Mobile 策略

1. Mobile 端保持现状，不引入 bash。
2. Mobile 端继续使用当前文件/搜索工具集：`read/write/edit/delete/move/ls/glob/grep/search_in_file`。
3. 本轮不对 Mobile 工具注入链路做删改，只要求 Prompt 继续遵循“运行时实际注入为准”。

### 5.5 subagent 单能力面收敛（本轮新增）

1. 删除 `subagent` 的角色参数（`explore/research/batch`），统一改为“单一子代理”。
2. `subagent` 默认工具集改为“当前端可用的全能力集合”（由运行时主工具链动态解析注入，不再按角色硬分流）。
3. 由模型自主编排子代理执行路径，不再通过角色枚举限制工具能力。
4. 端能力差异仍由 runtime 决定：
   - PC：与主 agent 相同能力面（包含 `bash/web/tasks/skill/MCP/external`，以实际注入为准）
   - Mobile：不支持 `subagent`（保持现状）

## 6. 为什么这是根因治理

1. 问题根因是“工具职责重叠 + 注入面过宽”，不是某个单点 bug。
2. 直接收敛注入面到 Bash-First，是在事实源（runtime 装配层）一次性收口。
3. 不引入 legacy/profile 双轨，不做兼容映射叠加，符合“零兼容原则”。

## 7. 风险与缓解

1. 风险：模型短期内对 `read/edit` 等旧工具名有惯性调用。
   缓解：Prompt 明确当前注入工具以 runtime 为准；并在回归测试中验证工具清单。
2. 风险：特定结构化数据任务用 bash 管道可读性差。
   缓解：保留 `tasks_*` 这类结构化工具；后续按真实失败样本增补专用工具，而非恢复大而全文件工具集。
3. 风险：外部工具动态注入后总工具数仍可能偏大。
   缓解：external tools 改为按需加载并限制默认开启范围（后续可在 runtime config 增加 allowlist）。

## 8. 本轮新增问题与根治方案（按顺序执行）

### 8.1 问题 1：审计日志路径安全不足

- 现象：审计日志文件名直接拼接 `sessionId`，存在路径穿越与非法文件名风险。
- 根因：`bash-audit.ts`、`permission-audit.ts`、`mode-audit.ts` 各自落盘，缺少统一安全基座。
- 根治方案：

1. 新增统一审计写入基座（单一事实源）：
   - 统一处理 `sessionId` 安全归一化（字符白名单 + 长度上限 + hash 后缀）
   - 统一校验最终路径必须落在 `~/.moryflow/logs/agent-audit`
2. 三类审计 writer 全部复用该基座，删除重复 mkdir/append 拼接逻辑。

### 8.2 问题 2：bash 审计明文命令泄露风险

- 现象：bash 审计持久化 `commandSummary`，可能写入敏感参数/口令片段。
- 根因：审计模型默认记录“可读命令文本”，脱敏与最小化原则未落地。
- 根治方案：

1. 默认不落盘命令明文（含摘要），仅记录结构化元数据与命令指纹。
2. 审计字段改为：
   - `commandFingerprint`（不可逆哈希）
   - `commandLength`、`argTokenCount`
   - `containsPipe`/`containsRedirect`/`containsEnvAssignment` 等执行特征
3. 如需命令预览，必须走显式 runtime config 开关，并在写入前强制脱敏。

### 8.3 问题 3：subagent 角色分流限制能力

- 现象：`subagent` 强制要求 `type=explore/research/batch`，并按角色绑定工具集。
- 根因：角色分类写入协议层，导致能力被静态约束，模型无法按任务动态编排。
- 根治方案：

1. 删除 `type` 参数与角色枚举类型。
2. `SubAgentToolsConfig` 改为单一工具集合。
3. PC runtime 注入“全能力子代理工具集”（与主 agent 同一事实源，含 MCP/external），不再存在 web-only/bash-only 角色分流。
4. 文档与测试同步改口径，防止回归到角色模型。

## 9. 实施步骤（分阶段）

### 9.1 P0（已完成）

1. PC Runtime 切换到 Bash-First 装配：`apps/moryflow/pc/src/main/agent-runtime/index.ts`。
2. 新增 PC 精简装配入口：`packages/agents-tools/src/create-tools.ts`（`createPcLeanTools*`）。
3. 子代理工具命名收敛：`task` -> `subagent`，并同步 prompt/测试口径。
4. 文档补充“PC Bash-First / Mobile 非 bash”差异声明，避免跨端误读。

### 9.2 P1（已完成）

1. 已在 `packages/agents-sandbox/src/bash-tool.ts` 补充 Bash-First 描述（工作目录/常见命令/长输出建议）。
2. 已在 `apps/moryflow/pc/src/main/agent-runtime/index.ts` 接入命令执行审计（后续在本轮完成脱敏字段收口）。
3. 已补齐回归测试：
   - `packages/agents-tools/test/create-pc-lean-tools.spec.ts`（工具清单快照）
   - `packages/agents-tools/test/create-pc-lean-tools-subagent.spec.ts`（默认 subagent 工具集校验）
   - `packages/agents-sandbox/test/bash-tool.test.ts`（bash 审计回调成功/失败路径）

### 9.3 P2（本轮收口结论）

1. “外部沙盒/远程执行文件注入优化”当前代码库无对应上传链路，结论为 **暂不实现新抽象**，待 remote sandbox 能力落地后再按 `streamFiles + batch + maxFiles` 接入。
2. `experimentalTeeTransform` 已完成可行性评估，结论为 **本轮不引入**（当前优先保持命令链路可预测与安全边界单一）。
3. 已在 runtime 增加工具预算告警：`tools.budgetWarnThreshold`（默认 `24`），超阈值时输出告警日志。

### 9.4 P3（已完成）

1. 路径安全基座收口（问题 1）：
   - 新增 `apps/moryflow/pc/src/main/agent-runtime/audit-log.ts` 统一处理审计目录、安全文件名与路径逃逸校验。
   - `bash-audit.ts`、`permission-audit.ts`、`mode-audit.ts` 全部切换到基座写入。
2. bash 审计脱敏收口（问题 2）：
   - `commandSummary` 落盘已移除，改为 `commandFingerprint + commandLength + argTokenCount + 执行特征`。
   - 新增 `tools.bashAudit.persistCommandPreview/previewMaxChars` 配置；默认不落命令预览，显式开启时仍强制脱敏。
3. subagent 单能力面收口（问题 3）：
   - `packages/agents-tools/src/task/subagent-tool.ts` 删除 `type` 参数（`explore/research/batch`）。
   - `SubAgentToolsConfig` 改为单一工具集合；PC runtime 通过动态 resolver 复用主 agent 工具事实源（含 MCP/external），无额外维护面。
4. 补齐回归验证：
   - 新增 `apps/moryflow/pc/src/main/agent-runtime/audit-log.test.ts`
   - 新增 `apps/moryflow/pc/src/main/agent-runtime/bash-audit.test.ts`
   - 更新 `packages/agents-tools/test/create-pc-lean-tools-subagent.spec.ts`
   - 更新 `packages/agents-runtime/src/__tests__/runtime-config.test.ts`

## 10. 验证与验收

风险等级：L1（运行时工具装配与行为路径调整，未改底层模型/会话协议）。

执行验证：

```bash
pnpm build:agents
pnpm --filter @moryflow/agents-sandbox build-check
pnpm --filter @moryflow/agents-sandbox exec vitest run test/bash-tool.test.ts
pnpm --filter @moryflow/agents-tools test:unit -- test/create-pc-lean-tools.spec.ts test/create-pc-lean-tools-subagent.spec.ts
pnpm --filter @moryflow/agents-runtime test:unit -- src/__tests__/runtime-config.test.ts
pnpm --filter @moryflow/pc typecheck
pnpm --filter @moryflow/pc exec vitest run src/main/agent-runtime/__tests__/tasks-store.spec.ts src/main/agent-runtime/__tests__/prompt-resolution.test.ts src/main/agent-runtime/permission-runtime.test.ts src/main/agent-runtime/audit-log.test.ts src/main/agent-runtime/bash-audit.test.ts
```

最低验证基线（持续要求）：

```bash
pnpm --filter @moryflow/agents-tools test:unit
pnpm --filter @moryflow/agents-runtime test:unit
pnpm --filter @moryflow/agents-sandbox test
```

验收标准：

1. PC 运行时默认工具清单不再包含 `read/write/edit/delete/move/ls/glob/grep/search_in_file`。
2. `bash` 仍可在 Vault 内完整执行文件读写与搜索工作流。
3. Mobile 运行时继续保留 `read/write/edit/delete/move/ls/glob/grep/search_in_file`，行为与现状一致。
4. 外部路径授权、危险命令拦截、权限审计链路行为不回退。
5. Prompt 与运行时清单一致，无固定全集承诺。
6. 审计日志文件名不可被 `sessionId` 注入，路径校验统一生效。
7. bash 审计默认不落盘命令明文，仅保留脱敏元数据与指纹。
8. `subagent` 协议无角色参数，按端可用能力统一注入。

## 11. 非目标

1. 本轮不改 Mobile 工具模型。
2. 本轮不引入新的结构化数据专用工具（SQL/表格引擎）。
3. 本轮不改 MCP 协议与 external tool 模块机制。
