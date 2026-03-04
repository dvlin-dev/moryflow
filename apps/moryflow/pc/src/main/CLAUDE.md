# Main Process

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

PC 端 Electron 应用的主进程，负责系统级操作、文件访问、网络请求等。

## 职责

- 文件系统操作（读写、监听）
- Agent 运行时执行
- 云同步服务
- Ollama 本地模型服务
- 聊天会话持久化
- Tasks 数据服务（只读 IPC）
- 窗口管理

## 约束

- 主进程是 Node.js 环境，可以访问系统 API
- 与渲染进程通过 IPC 通信
- 敏感操作（文件、网络）必须在主进程执行
- 长时间操作需考虑不阻塞主进程
- 外链打开统一经 `external-links` 协议校验：允许 `https`、允许 localhost 回环地址的 `http`（含 `localhost` 无协议前缀写法）
- 主窗口必须拦截 `will-navigate`/`will-redirect`，仅允许内部资源导航
- E2E 测试（`MORYFLOW_E2E=true`）禁止自动打开 DevTools
- E2E 测试可通过 `MORYFLOW_E2E_USER_DATA` 指定独立 userData 目录
- E2E 测试可通过 `MORYFLOW_E2E_RESET=true` 清理 Vault store（仅测试用）
- Vault store 与 pc-settings 在 E2E 下使用 `MORYFLOW_E2E_USER_DATA/stores`
- preload 构建需输出 CJS（sandbox 下 ESM preload 会报错）

## 成员清单

| 文件/目录                     | 类型 | 说明                                    |
| ----------------------------- | ---- | --------------------------------------- |
| `index.ts`                    | 入口 | 主进程入口                              |
| `app/`                        | 目录 | 应用生命周期管理                        |
| `agent-runtime/`              | 目录 | Agent 运行时                            |
| `mcp-runtime/`                | 目录 | MCP stdio 受管安装/更新与可执行解析     |
| `agent-settings/`             | 目录 | Agent 设置管理                          |
| `chat/`                       | 目录 | 聊天服务                                |
| `chat-session-store/`         | 目录 | 聊天会话存储                            |
| `skills/`                     | 目录 | Skills 注册中心（内置基线 + 在线同步）  |
| `search-index/`               | 目录 | 全局搜索索引（Files + Threads，FTS）    |
| `tasks/`                      | 目录 | Tasks 只读服务                          |
| `cloud-sync/`                 | 目录 | 云同步服务                              |
| `vault/`                      | 目录 | 知识库服务                              |
| `vault-watcher/`              | 目录 | 文件监听服务                            |
| `ollama-service/`             | 目录 | 本地 Ollama 服务                        |
| `vault.ts`                    | 文件 | 知识库核心逻辑                          |
| `tree-cache.ts`               | 文件 | 文件树缓存                              |
| `workspace-settings.ts`       | 文件 | 工作区设置                              |
| `workspace-settings.utils.ts` | 文件 | 工作区 MRU 规则工具                     |
| `membership-bridge.ts`        | 文件 | 会员状态桥接                            |
| `membership-token-store.ts`   | 文件 | access/refresh token 安全存储（keytar） |
| `app-maintenance.ts`          | 文件 | 应用维护                                |
| `site-publish/`               | 目录 | 站点发布服务                            |

## 核心模块说明

### agent-runtime/

Agent 运行时，执行 AI 对话、工具调用等操作。

### cloud-sync/

云同步服务，处理本地与云端的数据同步。参考 `docs/products/moryflow/features/cloud-sync/`。

### vault/

知识库服务，管理用户的笔记文件。

### vault-watcher/

文件监听服务，监听知识库目录变化并触发同步。

### ollama-service/

本地 Ollama 服务，支持离线运行本地模型。

### chat-session-store/

聊天会话持久化，使用本地存储保存对话历史（不做历史兼容）。

### search-index/

全局搜索索引服务，基于 SQLite contentless FTS5 双轨检索：

- `search_fts_exact`：unicode61 精确全文索引（Files/Threads）。
- `search_fts_fuzzy`：N-gram token 流模糊索引（跨语言子串命中）。
- 查询层统一执行 exact + fuzzy 并行检索、doc 去重合并排序，并提供 `snippetCache`、回源预算与并发控制。

### site-publish/

站点发布服务，将 Markdown 文件构建为静态站点并发布到云端。参考 `docs/products/moryflow/features/site-publish/`。

## 常见修改场景

| 场景              | 涉及文件                     | 注意事项                                         |
| ----------------- | ---------------------------- | ------------------------------------------------ |
| 修改 Agent 运行   | `agent-runtime/`             | 注意与 packages/agents-\* + @openai/agents-core  |
| 修改云同步        | `cloud-sync/`                | 参考 docs/products/moryflow/features/cloud-sync/ |
| 修改文件操作      | `vault/`, `vault-watcher/`   | 注意文件权限和错误处理                           |
| 修改 Ollama       | `ollama-service/`            | 注意进程管理                                     |
| 新增 IPC 通道     | 对应模块 + `src/shared/ipc/` | 双向定义类型                                     |
| 新增 Tasks 读接口 | `tasks/`, `agent-runtime/`   | 仅允许 list/get，通过共享 TasksStore 触发广播    |

## 近期变更

- Telegram C+ 会话路由收口（2026-03-04）：`channels/telegram` 新增 `conversation-service`（`ensureConversationId/createNewConversationId`），`sqlite-store` 会话映射事实源从 `session_key` 收敛为 `conversation_id`（表 `channel_conversation_bindings`）；`inbound-reply-service` 增加 `/start`（幂等建连）与 `/new`（强制新会话）命令分流，普通消息执行前强制解析真实 `conversationId`，不再使用渠道 `sessionKey` 作为 chatId。
- Telegram settings 回显补齐（2026-03-04）：`channels/telegram/settings-application-service.ts` 的 `getSettings` 快照新增回填 `botToken/proxyUrl`（从 keytar 读取），并继续保留 `hasBotToken/hasProxyUrl` 布尔状态；用于 renderer 重启后自动回填输入框（bot token 密文输入、proxy URL 明文输入）。
- Telegram Proxy 显式配置落地（2026-03-04）：`channels/telegram/settings-application-service.ts` 新增 `testProxyConnection`（`node-fetch + proxy-agent` + 8s 超时 + 结构化结果）；`channels/telegram/secret-store.ts` 新增 `proxyUrl:<accountId>` keytar 托管；`channels/telegram/runtime-orchestrator.ts` 在 `proxyEnabled` 时注入 proxy 到 runtime 配置，`packages/channels-telegram` 通过 `client.baseFetchConfig.agent` 对齐 `grammY/node-fetch`；`app/ipc-handlers.ts` 新增 `telegram:testProxyConnection` 通道与参数校验。
- Telegram review 八次收口（2026-03-04）：`channels/telegram/inbound-reply-service.ts` 在“preview 已成功发送后，后续 update/commit 失败”场景增加 `preview clear` 收口，再执行 final send fallback，避免 message transport 下残留旧 preview 导致用户看到“旧 preview + 新 final”重复消息；`inbound-reply-service.test.ts` 新增对应回归用例覆盖“首条 update 成功、次条 update 失败”的清理链路。
- Telegram `sendMessageDraft` 流式适配落地（2026-03-04）：`channels/telegram/inbound-reply-service` 改为“delta 流式草稿 + final 提交”，并按 peer 串行化回复任务；`channels/telegram/types/settings-store/runtime-orchestrator` 新增并接入账号级配置 `enableDraftStreaming`、`draftFlushIntervalMs`，保证编排层与 runtime 装配边界一致；对应 `inbound-reply-service/settings-store/settings-application-service/runtime-orchestrator` 回归测试已补齐。
- Skills CI 稳定性修复（2026-03-04）：`main/skills/index.test.ts` 的 managed state 同步断言从依赖 `checkedAt > 1` 改为“基线 `checkedAt/updatedAt=0` + 断言 `checkedAt > 0`”，修复 CI 环境同毫秒/固定时钟下的偶发失败（`expected 1 to be greater than 1`）。
- Telegram review 七次收口（2026-03-04）：`channels/telegram/settings-application-service.ts` 在 `updateSettings` 入口统一 `accountId` 的 trim/校验并复用于 secrets + settings store 写入，避免脏 key 造成 orphan secret；`packages/channels-telegram/src/normalize-update.ts` 为 `channel_post/anonymous` 场景补齐 `sender_chat -> sender` 回退映射，修复策略层 `sender_missing` 误拒绝。新增 `settings-application-service.test.ts` 与 `packages/channels-telegram/test/telegram.test.ts` 对应回归。
- Telegram review 六次收口（2026-03-04）：`channels/telegram/webhook-ingress.ts` 升级为单监听多路由（同 host/port 下按 path+secret 分发）；`channels/telegram/runtime-orchestrator.ts` 改为按 `listenHost:listenPort` 分组复用 ingress，修复多账号 webhook 默认端口冲突（`EADDRINUSE`）；新增 `webhook-ingress.test.ts` 与 `runtime-orchestrator.test.ts` 对应回归。
- Telegram review 五次收口（2026-03-04）：`index.ts` 启动链路改为 `initTelegramChannelForAppStartup` 容错初始化（Telegram init 失败仅记录日志，不阻断主窗口）；`channels/telegram/runtime-orchestrator.ts` 删除 `runtime.start()` 后手动 `running=true` 覆写，状态统一以 runtime 事件为事实源；新增 `channels/telegram/startup.test.ts` 与 `runtime-orchestrator.test.ts` 回归用例。
- Telegram review 三次收口（2026-03-03）：`channels/telegram/service.ts` 的 `init()` 改为 `initPromise` 复用与成功后置位，启动失败时显式回滚 `initialized` 并允许重试；`shutdown()` 同步处理进行中的 init，避免状态卡死。新增 `channels/telegram/service.test.ts` 覆盖“失败可重试 + 成功幂等”。同时 `packages/channels-telegram` 修复 webhook `update_id` 去重（safe watermark + in-flight 去重）。
- Telegram review 二次收口（2026-03-03）：`channels/telegram/pairing-admin-service` 新增 pending 状态门禁（非 `pending` 请求拒绝 approve/deny）；`channels/telegram/settings-store` 的 `sanitizeAccountPatch` 改为仅合并 defined 字段，避免 partial update 覆盖历史配置；并为两处新增回归测试。`packages/channels-core` 与 `packages/channels-telegram` 同步修复 polling 409 分类与 continue 语义，防止误停机。
- Telegram 安全评论闭环（2026-03-03）：`channels/telegram/settings-store.ts` 新增 `sanitizeAccountPatch` 白名单收口，`normalizeAccount` 不再 spread 原始 patch，阻断 `botToken/webhookSecret` 与未知字段进入 `electron-store` 明文配置；新增 `channels/telegram/settings-store.test.ts` 回归覆盖“secret 不落盘”。
- Telegram 渠道架构落地（2026-03-03）：新增 `channels/telegram` 装配层（`service/settings-store/secret-store/sqlite-store`），主进程入口接入 `telegramChannelService.init()/shutdown()`，并通过 `ipc-handlers` 暴露 `telegram:*` 管理能力与状态广播；pairing 请求新增到期自动过期收敛（pending -> expired），防止审批队列长期堆积。
- Google OAuth 跨平台回流与日志脱敏（2026-03-03）：`index.ts` 新增 single-instance + `second-instance/argv` deep link 处理，补齐 Windows/Linux 回流；新增 pending deep link 队列并在主窗口创建后统一 flush；`auth-oauth.ts` 新增 `extractDeepLinkFromArgv/redactDeepLinkForLog`，主进程 deep link 日志不再输出 `code/nonce` 明文。
- Google OAuth deep link scheme 收口（2026-03-03）：`auth-oauth.ts` 新增 `getMoryflowDeepLinkScheme()`，`parseOAuthCallbackDeepLink` 强制校验 protocol 与 `MORYFLOW_DEEP_LINK_SCHEME` 一致；`index.ts` 协议注册同步复用同一配置源，避免 server/main scheme 漂移。
- Google OAuth deep link 回流接入（2026-03-03）：新增 `auth-oauth.ts` 统一解析 `moryflow://auth/success?code=...&nonce=...`；`index.ts` 在主进程接收到该 deep link 后广播 `membership:oauth-callback` 给 renderer 并聚焦主窗口，作为 Token-first exchange 前置事件源。
- 审批协议幂等化收口（2026-03-03）：`chat/approval-store` 的 `approveToolRequest` 改为返回结构化结果（`approved` / `already_processed`），`missing/expired/processing` 不再抛 `Approval request not found or expired.`；`chat:approve-tool` IPC 同步返回该结构化结果，消除切换 `full_access` 并发下重复点击旧授权卡片报错。
- Full access 切换后的审批过期竞态修复（2026-03-03）：`chat/approval-store` 在“可即时自动放行”场景下让 `registerApprovalRequest` 返回 `null`；`chat/chat-request` 仅在存在有效 `approvalId` 时发射 `tool-approval-request`，避免渲染过期审批卡；`approval-store.test.ts` 补齐回归用例。
- Bash 审计脱敏补强（2026-03-03）：`agent-runtime/bash-audit.ts` 的 token 脱敏规则从仅匹配下划线前缀扩展到 `[-_]`，覆盖 `sk-proj-*` / `pk-*` 等连字符样式；新增 `bash-audit.test.ts` 回归用例，验证 `Authorization: Bearer sk-proj-*` 预览输出会被替换为 `[REDACTED_TOKEN]`。
- Agent Runtime PR review 根因修复（2026-03-03）：`permission-audit` 后缀统一为 `.permission.jsonl`（满足共享审计后缀校验）；新增 `agent-runtime/subagent-tools.ts` 并在 `index.ts` 复用，子代理委托工具显式排除 `subagent` 自身以阻断递归嵌套；`bash-audit.test.ts` 替换疑似真实 secret 样例，保留脱敏断言同时消除 GitGuardian 告警来源。
- Agent Runtime Bash 审计安全收口（2026-03-03）：新增 `agent-runtime/audit-log.ts` 作为统一审计落盘基座（安全文件名 + 路径逃逸校验）；`agent-runtime/bash-audit.ts` 改为默认仅落盘命令指纹与结构化特征（不写命令明文），并支持 `tools.bashAudit.persistCommandPreview/previewMaxChars` 显式脱敏预览开关；`agent-runtime/index.ts` 接入新审计配置与写入链路。
- Agent Runtime 子代理命名收敛（2026-03-03）：`task` 工具统一重命名为 `subagent`，PC runtime 改用 `createSubagentTool` 并更新 Bash-First 指令常量命名，消除与 `tasks_*` 的语义冲突。
- Agent Runtime 工具装配收敛（2026-03-03）：`agent-runtime/index.ts` 改为 PC Bash-First 链路，默认不再注入 `read/write/edit/delete/move/ls/glob/grep/search_in_file`；基础工具收敛为 web/tasks/image + 沙盒 `bash` + `subagent` + `skill` + MCP/external，并将 `subagent` 子代理改为“复用主 agent 工具事实源的单一全能力面”（含 MCP/external，且随主链路自动同步）。
- 会话 mode 切换竞态根治（2026-03-03）：`chat/session-mode-updater` 将 `chat:sessions:updateMode` 收敛为“同步写会话 + 同步广播 + 异步自动放行/审计”，移除 await 阻塞窗口，避免会话删除并发下 stale `updated` 事件把已删除会话复活到前端列表。
- 审批 gate 复用清理收口（2026-03-03）：`chat/approval-store` 新增 gate 级审批条目回收，`createApprovalGate` 复用与 `clearApprovalGate` 清理均统一回收 `pendingIds + approvalEntries + processingApprovalIds`，修复 orphan 审批条目残留。
- full_access 自动放行根因收口（2026-03-03）：`chat/approval-store` 新增会话实时模式判定与 `registerApprovalRequest` 即时自动放行；`autoApprovePendingForSession` 统一复用同一自动放行逻辑并接入 `processingApprovalIds` 互斥，避免“单次扫描漏后续审批”与“手动审批并发双触发”。
- 手动审批 `always` 语义一致性修复（2026-03-03）：`chat/approval-store` 在 `approveToolRequest` 中引入 processing 锁，`persistAlwaysRules/recordDecision` 完成后再 settle 审批门，避免规则落盘与会话续跑并发导致同轮重复 ask。
- full_access 自动放行收敛修复（2026-03-03）：`chat/approval-store` 的 `autoApprovePendingForSession` 从单次快照改为循环扫描收敛；当 approve 触发同会话新增 Vault `ask` 审批时，会继续自动处理直到当前轮次无可放行审批为止。
- 首次权限升级提示与即时生效收口（2026-03-03）：`chat/approval-store` 新增审批上下文查询与单次提醒消费持久化；`chat:approvals:get-context` IPC 已接入；会话切到 `full_access` 后会即时自动放行同会话内 Vault 内 `ask` 挂起审批（外部路径授权审批除外）。
- MCP packageName 安全校验收口（2026-03-03）：`mcp-runtime/updater` 在触发 `npm install` 前先做包名规范化校验，`mcp-runtime/resolver` 在解析安装路径时复用同一校验；统一拒绝 `..`/空段/非法 scoped 名称/本地路径 spec，且强制校验位于 runtime `node_modules` 根内，阻断通过篡改 `packageName` 读取或执行本机脚本的风险。
- MCP 启动刷新竞态修复（2026-03-03）：`agent-runtime` 将 `refreshEnabledServers` 串行到首轮 `mcpManager.scheduleReload` 完成后执行，避免首次安装场景下“先 refresh 标记 changed 再触发额外 reload”导致的无效断连重连。
- MCP Electron 子进程启动修复（2026-03-03）：`mcp-runtime/resolver` 生成 stdio 启动命令时为 `process.execPath` 注入 `ELECTRON_RUN_AS_NODE=1`，避免 Electron 二进制以 GUI 模式启动导致托管 MCP 无法连接。
- MCP 内置项下线（2026-03-03）：默认 Agent 设置不再内置 `builtin-macos-kit`，`mcp.stdio` 初始值改为空数组；应用启动不会再自动安装 macOS 自动化 MCP。
- Telegram 二轮 review 闭环（2026-03-03）：`channels/telegram` 完成服务分层重构（`service` 仅装配，新增 `runtime-orchestrator` / `inbound-reply-service` / `settings-application-service` / `pairing-admin-service`）；webhook ingress 改为公网 URL 与本地监听参数解耦（默认 `127.0.0.1:8787`），并将 body 异常按 `400/408/413/500` 分类返回，避免非服务端错误触发无效重试风暴。
- MCP 启动更新稳定性补丁（2026-03-03）：`mcp-runtime/npm-installer` 优先使用内置 npm cli（`process.execPath + npm/bin/npm-cli.js`，`ELECTRON_RUN_AS_NODE=1`）执行受管安装，避免依赖系统全局 npm；`mcp-manager.scheduleReload` 修复 `pendingReload` Promise 标识不一致导致无法清空的问题，重载完成后会正确释放 pending 状态；`agent-runtime.runChatTurn` 不再阻塞等待 MCP 安装/重载，首轮对话不受冷启动安装耗时影响。
- MCP 受管运行时落地（2026-03-02）：stdio MCP 配置切换为 `packageName/binName`，新增 `main/mcp-runtime` 统一负责 npm 包安装/更新与 bin 解析；Agent Runtime 启动后会对所有 enabled MCP 后台静默更新并自动触发 reload；默认配置内置并启用 `builtin-macos-kit`（`@moryflow/macos-kit`）。
- MCP 受管运行时细化（2026-03-03）：stdio MCP 固定 `autoUpdate: 'startup-latest'`；`main/mcp-runtime` 拆分为 `types/store/npm-installer/resolver/updater`；安装目录改为 `~/.moryflow/mcp-runtime/<serverId>/`（每个 server 独立）；启动后台更新仅在版本变化时触发 reload；更新失败时若存在旧版本则回退旧版本继续运行，首次安装失败仅标记该 server failed。
- MCP 受管运行时回退修复（2026-03-03）：latest 更新前会对 server runtime 目录做备份；若安装后 bin 解析失败，updater 会恢复备份目录后再解析旧版本，确保真正回退文件而非仅回退 manifest 元数据；manifest 读取异常（非 ENOENT）改为触发重装恢复；备份清理放到 `finally`，失败路径也不会残留 `*.backup-*`。
- MCP 连接稳定性修复（2026-03-02）：`mcp-manager` 将 MCP 客户端会话超时下限提升到 30s，避免首轮 `npx` 冷启动时 `MCP error -32001`（5s 超时）；`testServer` 改为 `dropFailed=true` 并延长 connect timeout，且连接状态判定改为 failed 优先，修复“连接失败却误标 connected、随后 listTools 报未初始化”的链路。
- Skills 安全/零兼容收口（2026-03-03）：移除 `~/.agents/.claude/.codex/.clawdbot` 兼容导入链路；`skills/remote` 新增下载 URL 白名单（`raw.githubusercontent.com`/`codeload.github.com`）与鉴权头隔离（仅 GitHub API 请求携带 token，文件下载不透传 Authorization）。
- Skills 远端文件权限与体积守卫补齐（2026-03-03）：`skills/remote` 改为基于 Git tree 元数据下载快照并保留文件 mode（如 `100755` 可执行位）；下载前先用 tree size 做总量预算校验，下载中按剩余额度流式限流读取，避免超大文件先整块入内存再失败。
- Skills 架构重构（2026-03-03）：`main/skills` 拆分为 `catalog/remote/installer/state/file-utils/registry` 模块；内置 baseline 扩展到 16 个技能（14 自动预装 + 2 推荐，新增 `macos-automation`）；启动阶段改为对 curated 列表逐项请求 GitHub revision，发现变更后执行原子覆盖更新（失败回滚，不阻断主链路）。
- Skills Review 闭环加固（2026-03-03）：`skills/index` 新增状态写入串行化与 `mutateState` 原子更新，远端同步写入仅更新 `managedSkills`（不覆盖用户 `disabled`）；预装逻辑新增 `skippedPreinstall`，显式卸载的预装 skill 不再被 `refresh()` 立即重装；`parseSkillFromDirectory` 以目录名作为 canonical skill name，避免上游 frontmatter 命名漂移导致初始化失败。
- Skills 升级迁移与同步竞态修复（2026-03-03）：`skills/state` 在读取旧 `curatedPreinstalled` 状态时自动迁移 `skippedPreinstall`，避免升级后历史卸载偏好丢失；`skills/installer` 原子覆盖新增 `requireExistingTarget`，`skills/index` 仅在目标目录仍存在时覆盖安装目录，避免用户卸载后被后台同步静默装回。
- Skills 模板安全扫描收敛（2026-03-03）：`agent-browser/templates/authenticated-session.sh` 将旧口令环境变量命名收敛为 `APP_LOGIN_SECRET`，并同步替换模板指引，规避 GitGuardian `Generic Password` 误报。
- Skills 模板安全文案修复（2026-03-03）：`agent-browser/templates/authenticated-session.sh` 删除疑似明文口令赋值示例，改为仅提示通过 shell 环境变量注入，避免密钥扫描误报。
- 外链策略简化（2026-03-02）：移除 hostname allowlist，统一允许 `https` 与 localhost 回环地址 `http`（含 `localhost:3000` 无协议写法自动归一化）；`main-window` 与 `shell:openExternal` IPC 全环境一致策略。
- 外部路径标准化事实源收口（2026-03-02）：`permission-runtime-guards` 与 `sandbox/index` 统一复用 `@moryflow/agents-sandbox` 的路径标准化/父子路径判定工具，移除双实现；external guard 仅处理 `fs:` 绝对路径，避免非绝对 target 误归类。
- Vault 外首次授权链路修复（2026-03-02）：`external_path_unapproved` 从直接 deny 调整为 ask；聊天审批通过后即时写入 External Paths 永久授权并继续执行，拒绝审批时保持拒绝；`full_access` 仍不可绕过该边界。
- 权限判定短路修复（2026-03-02）：Vault 外已授权路径不再短路整次权限决策；改为仅剔除已授权外部 `fs:` targets 后继续评估剩余目标，确保同次调用中的 Vault 内 `deny` 规则仍生效。
- 权限判定链路收口（2026-03-02）：会话模式统一为 `ask | full_access`；`full_access` 仅对 Vault 内生效；Vault 外路径统一由 sandbox 授权清单判定（未授权需审批授权，已授权直接放行）；硬拦截命令始终优先拒绝。
- Sandbox 配置协议简化（2026-03-02）：移除 sandbox mode（`normal/unrestricted`）与 `set-mode` IPC；`sandbox:get-settings` 仅返回 `authorizedPaths`；新增 `sandbox:add-authorized-path` 支持设置页手动授权目录；`agents-sandbox` 包内部模式语义也已同步删除。
- Chat 持久化清洗修复（2026-03-01）：`chat-request` 在 `onFinish` 入库前统一过滤空 `assistant` 占位消息（`parts.length===0`），避免中断/异常后会话残留假 loading 并在刷新后重复出现。
- Chat 会话存储零兼容收口（2026-03-01）：删除 `__legacy_unscoped__` 兼容语义；`chat-session-store` 仅保留绝对路径 `vaultPath` 会话，非法会话在读取时自动清理，运行时不再接收 legacy 占位路径。
- Chat 会话级 Workspace 上下文收口（2026-03-01）：新增 `agent-runtime/runtime-vault-context`（AsyncLocalStorage）；`chat-request` 在单次请求内以 `session.vaultPath` 绑定运行时上下文，`agent-runtime` 与工具层统一从该上下文解析 vaultRoot，修复“切换 workspace 后继续旧线程导致执行/索引错位”。
- 搜索索引重建恢复修复（2026-03-01）：`searchIndexService` 新增 vault 感知重建与 error 自动恢复；修复“切换 workspace 后未重建”与“无 workspace 分支导致 rebuildPromise 锁死”问题。
- 全局搜索跨语言模糊升级（2026-03-01）：`search-index` 升级为 exact + fuzzy 双轨检索（`search_fts_exact/search_fts_fuzzy`），修复“整词命中”限制，支持中文/英文等多语言子串搜索。
- 全局搜索重构（2026-02-28）：新增 `search-index/` 模块与 `search:*` IPC，替代 Command actions；查询范围固定当前 active vault，支持 Files + Threads 全文检索。
- Chat 会话归属收口（2026-02-28）：`ChatSessionSummary/PersistedChatSession` 新增 `vaultPath`，新建会话强制注入当前 vault。
- Chat 流 finishReason 回归修复（2026-02-28）：`streamAgentRun` 通过 `@moryflow/agents-runtime` 透传 `model.finish` 的截断原因（如 `length`），`response_done` 不再默认写死 `stop`；补齐主进程回归测试，确保自动续写判定链路可用。
- Chat 调试日志 fallback 根治（2026-02-28）：`chat-debug-log` 改为 file/console 双 sink；初始化失败、写入失败、trim 失败均降级 console-only，不再静默丢日志。
- 2026-02-28：Workspace 导航持久化语义重构完成：`lastAgentSub` 与 `workspace:get/setLastAgentSub` 已删除，统一为 `lastSidebarMode` 与 `workspace:get/setLastSidebarMode`（Home/Chat）。
- `agent:test-provider` 契约显式化（2026-02-28）：新增 `providerType`（`preset/custom`）入参，删除 `providerId` 前缀推断 custom provider 逻辑；preset/custom 冲突场景改为 fail-fast 返回错误。
- `chat/agent-options` 入口收口（2026-02-28）：删除 `activeFilePath/contextSummary` legacy 字段桥接，仅接受 `context.{filePath,summary}` 合同输入。
- `agent:test-provider` 与 custom provider 协议收口（2026-02-28）：自定义服务商不再暴露/存储 `sdkType`，主进程测试与运行时统一按 `openai-compatible` 固定协议执行；预设服务商仍走内置 `sdkType` 映射。
- Chat 调试日志升级（2026-02-28）：`thinking-debug` 已升级为 `chat-debug-log`，日志文件统一为 `chat-stream.log`，全环境默认开启并在应用启动时清空；初始化失败自动降级 console-only（不阻断 app 启动）。
- Chat 调试日志轻量化与限长裁剪（2026-02-28）：事件/状态/chunk 日志改为摘要输出；`chat-stream.log` 新增最大大小限制（默认 4MB）与前部裁剪策略（超限后仅保留最新尾部），避免长会话日志无限增长。
- Chat 流运行时重构（2026-02-28）：`streamAgentRun` 已收敛为 `ingest -> reduce -> emit` 状态机管道；可视 reasoning 仅消费 raw 增量事件；`run-item reasoning_item_created` 仅用于统计观测；`response_done` reasoning fallback/suppress 兼容分支已删除。
- 模型思考等级链路收口（2026-02-27）：主进程与 runtime 侧不再依赖 SDK 默认等级 fallback，模型 thinking 合同统一由 `@moryflow/model-bank` 解析并下发；无模型合同场景稳定 `off-only`。
- Agent Runtime 初始化后统一绑定默认 `ModelProvider`（基于 `ModelFactory`），修复 `@openai/agents-core run()` 的 `No default model provider set`
- MCP Manager 生命周期改为官方 `MCPServers/connectMcpServers` 托管，移除自研连接重试/超时编排
- Chat 流事件映射改为复用 `@moryflow/agents-runtime` 的 `ui-stream` 共享模块，删除本地重复映射逻辑
- Skills 预设路径补齐 dev/build/package 多候选根（含 `resources/app.asar/dist/main/builtin`），并在预安装失败时降级为 warning，避免阻断 Agent 聊天链路。
- Skills 解析链路修正 symlink 防护顺序（先 `lstat(skillDir)` 再 `realpath`），防止失效的“已解析后再判 symlink”伪防护。
- `skill` tool/XML 注入转义补齐 `\"`/`'`，避免属性值场景下标签结构被破坏。
- 新建会话默认标题固定为英文 `New thread`（不再使用中文序号），与 Renderer 侧新建入口文案一致。
- 会话存储移除未使用的 `sequence` 持久化字段，数据层仅保留 `sessions`（简化状态面）。
- 新增 Skills 注册中心（`main/skills`）：内置预设与兼容目录（`.agents/.claude/.codex/.clawdbot`）自动导入、启停状态持久化、目录级安全导入（忽略 symlink + realpath 边界校验）
- Skills 改造为“推荐/预安装/兼容扫描”三条链路：固定推荐 `skill-creator`/`find-skills`/`baoyu-article-illustrator`，其中前两项首次启动自动预安装。
- Agent Runtime 接入 `available_skills` 元信息注入与 `skill` tool（正文按需加载，返回 `base_dir` + `skill_files`）
- Agent Runtime 在每轮 run 前比对 `available_skills` 快照，技能启停变化会自动失效 Agent 缓存，避免旧 system prompt 残留。
- Agent Runtime 个性化注入基线收敛（2026-03-02）：系统提示词固定主干 + `personalization.customInstructions` 注入 + skills 块 + runtime hook；删除 `systemPrompt/modelParams` 设置语义与运行时覆盖链路，并移除 `agentDefinition.systemPrompt` 对主干 prompt 的整体替换能力。
- IPC 新增 `agent:skills:*`（list/refresh/get/setEnabled/uninstall/install/listRecommended/openDirectory）
- Agent Settings：schema 校验失败时回退默认设置（新用户最佳实践：不做历史结构迁移）。
- 启动性能：移除 `preload:*` IPC handlers 与预加载落盘缓存（避免主进程写盘抖动；预热回退为 Renderer 侧轻量 warmup）
- Vault：新增 `vault:ensureDefaultWorkspace`，首次启动自动创建默认 workspace（`~/Documents/Moryflow/workspace`）并激活
- workspace-settings：`lastMode`/`lastAgentSub` 全量替换为 `lastSidebarMode`；新增 `workspace:getLastSidebarMode/setLastSidebarMode` IPC，用于全局记忆 Home/Chat 侧栏模式
- Chat 主进程持久化改为 UIMessageStream onFinish，并补齐 start/finish chunk，保证 assistant 消息持久化与 ID 稳定
- 移除 `chat:sessions:syncMessages` IPC，历史落盘仅由主进程流持久化
- workspace recentFiles 读写增加类型守卫，避免存储异常污染
- workspace-settings 新增 recentFiles 存储与 get/record/remove IPC 接口
- Agent Markdown 去重移除时补齐索引守卫，runtime config 仅保留必要导出
- Agent Markdown 读取补齐空值守卫，避免重复 ID 处理时类型收敛报错
- Agent Runtime 支持用户级 JSONC 配置/Agent Markdown/Hook，桌面端按开关加载外部工具
- Chat 首次 Full access 升级提醒改为“展示前消费”：新增消费 IPC，避免仅查询审批上下文就消耗提醒；同时修复 full_access 自动放行与手动审批并发竞态（先结算审批再异步持久化）
- 新建会话读取 runtime 默认 mode（config.jsonc）
- Chat 会话模式切换补齐审计：主进程记录 mode switch JSONL，更新前校验并写入
- ChatSessionStore 读取时归一化会话 mode，避免缺失字段导致异常
- Chat 会话模式切换：会话级模式存储、IPC 更新入口与运行时注入，全权限自动放行并审计
- 审批持久化失败不再阻断清理流程，取消/停止时同步清理 Doom Loop 与权限决策缓存
- agent-runtime README 对齐 ADR-0002 控制面落地说明
- Agent Runtime 接入 Doom Loop 守卫：重复工具检测触发审批并支持会话级 always
- Chat 会话压缩预处理：发送前执行 compaction，IPC 返回 UI 消息并仅在同一模型内跳过重复压缩
- ChatSessionStore 清空 history 同步清空 uiMessages，避免索引错位
- Agent Runtime 接入 Compaction：运行前裁剪旧工具输出并写入会话摘要
- 修复审批续跑输出持久化，避免多轮 run 丢失输出
- AgentStreamResult 增补 RunState/输出只读字段，保障审批恢复与输出持久化
- Chat：移除截断续写/未处理事件类型的调试日志输出，减少噪音
- Chat：streamAgentRun 避免重复 start chunk，防止出现空的 assistant 消息
- Chat Tool 权限审批：支持 RunState 中断/恢复、JSONC 规则落地与审计
- Agent Runtime tool-output storage 移除未使用导出
- Agent Runtime 新增工具输出统一截断与落盘清理；IPC 增加 `files:openPath`
- Agent Runtime 支持系统提示词与偏好注入（`personalization.customInstructions`），模型参数统一回归模型默认值
- Agent Runtime/Agent 设置改用 `@moryflow/agents-runtime/prompt` 读取 system prompt
- Agent Runtime 切换为 `@openai/agents-core`，统一 Runner/Tool/类型入口
- Agent Runtime 使用会话历史拼装输入，流完成后追加输出（移除 SDK Session 依赖）
- TasksStore 单例化并新增 `tasks:list/get` IPC，变更通过 `tasks:changed` 广播
- 新增 TasksStore 单元测试与子代理同步工具测试，覆盖 chatId 隔离/依赖成环/乐观锁冲突/状态时间戳
- TasksStore 改为显式 chatId 参数，状态时间戳保留并强化并发隔离
- TasksStore 切换 Vault 时重置文件监听，避免跨 Vault 监听残留
- TasksStore 查询支持显式筛选 archived 状态，避免默认过滤误伤
- Cloud Sync：收敛 diff/execute/commit 流程，commit 成功后更新 FileIndex
- Cloud Sync：支持 expectedHash 乐观锁、rename 路径同步与冲突副本上传
- Cloud Sync：账号切换增加绑定冲突检测（缺失 userId 视为冲突）
- Cloud Sync：本地变更检测增加 mtime/size 预过滤并回写 lastSyncedSize/lastSyncedMtime
- Cloud Sync：增加哈希缓存，未同步但未改动文件避免重复读盘
- Cloud Sync：upload 无 pendingChanges 时回退到 entry 时钟，避免 clock 回退
- FileIndex：无效存储记录告警并重置
- 新增 `server-tracing-processor.ts`，兼容新版 tracing 上报结构
- Tracing 上报增加安全序列化，避免循环引用导致丢失
- membership-token-store 改为 keytar 存储 access/refresh/expiresAt（仅主进程可访问）
- Auth IPC 通道补充 access token 读写与过期时间同步，配合 renderer 端 `auth-session`
- 新增外链 allowlist 与导航拦截，统一由主进程校验后打开外部链接
- E2E 模式关闭自动 DevTools，避免干扰 Playwright 运行
- 移除 `enableRemoteModule` 配置，保持 Electron 类型兼容
- E2E 支持指定 userData 路径，避免本地数据污染测试
- E2E 支持重置 Vault store，确保首次启动进入 onboarding
- E2E 下 vault-store/pc-settings 指向隔离目录，避免读取本机历史数据
- preload 产物改为 CJS，`resolvePreloadPath` 优先加载 `dist/preload/index.js`
- external-links 使用路径 relative 校验，补齐 allowlist/导航单测

## 依赖关系

```
main/
├── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
├── 依赖 → packages/api（API 客户端）
├── 通信 → preload（IPC 桥接）
├── 通信 → renderer（渲染进程）
└── 功能文档 → docs/products/moryflow/features/cloud-sync/
```

## IPC 通信模式

```
┌────────────────────────────────────────┐
│              Main Process              │
│  ┌─────────────┐  ┌─────────────┐     │
│  │   Service   │  │   Handler   │     │
│  └──────┬──────┘  └──────┬──────┘     │
│         │                │            │
│    ipcMain.handle() / ipcMain.on()    │
└─────────────────────┬──────────────────┘
                      │ IPC
┌─────────────────────┴──────────────────┐
│              Preload Script            │
│      (contextBridge.exposeInMainWorld) │
└─────────────────────┬──────────────────┘
                      │ IPC
┌─────────────────────┴──────────────────┐
│              Renderer Process          │
│           window.api.xxx()             │
└────────────────────────────────────────┘
```
