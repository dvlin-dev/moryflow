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
- 外链打开必须经 `external-links` allowlist 校验，额外域名通过 `MORYFLOW_EXTERNAL_HOST_ALLOWLIST` 注入
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
| `agent-settings/`             | 目录 | Agent 设置管理                          |
| `chat/`                       | 目录 | 聊天服务                                |
| `chat-session-store/`         | 目录 | 聊天会话存储                            |
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

- Skills 预设路径补齐 dev/build/package 多候选根（含 `resources/app.asar/dist/main/builtin`），并在预安装失败时降级为 warning，避免阻断 Agent 聊天链路。
- Skills 解析链路修正 symlink 防护顺序（先 `lstat(skillDir)` 再 `realpath`），防止失效的“已解析后再判 symlink”伪防护。
- `skill` tool/XML 注入转义补齐 `\"`/`'`，避免属性值场景下标签结构被破坏。
- 新建会话默认标题固定为英文 `New thread`（不再使用中文序号），与 Renderer 侧新建入口文案一致。
- 会话存储移除未使用的 `sequence` 持久化字段，数据层仅保留 `sessions`（简化状态面）。
- 新增 Skills 注册中心（`main/skills`）：内置预设与兼容目录（`.agents/.claude/.codex/.clawdbot`）自动导入、启停状态持久化、目录级安全导入（忽略 symlink + realpath 边界校验）
- Skills 改造为“推荐/预安装/兼容扫描”三条链路：固定推荐 `skill-creator`/`find-skills`/`baoyu-article-illustrator`，其中前两项首次启动自动预安装。
- Agent Runtime 接入 `available_skills` 元信息注入与 `skill` tool（正文按需加载，返回 `base_dir` + `skill_files`）
- Agent Runtime 在每轮 run 前比对 `available_skills` 快照，技能启停变化会自动失效 Agent 缓存，避免旧 system prompt 残留。
- IPC 新增 `agent:skills:*`（list/refresh/get/setEnabled/uninstall/install/listRecommended/openDirectory）
- Agent Settings：schema 校验失败时回退默认设置（新用户最佳实践：不做历史结构迁移）。
- 启动性能：移除 `preload:*` IPC handlers 与预加载落盘缓存（避免主进程写盘抖动；预热回退为 Renderer 侧轻量 warmup）
- Vault：新增 `vault:ensureDefaultWorkspace`，首次启动自动创建默认 workspace（`~/Documents/Moryflow/workspace`）并激活
- workspace-settings：用 `lastAgentSub` 替代旧 `lastMode`；新增 `workspace:getLastAgentSub/setLastAgentSub` IPC，用于全局记忆 Agent 面板二级入口（Chat/Workspace）
- Chat 主进程持久化改为 UIMessageStream onFinish，并补齐 start/finish chunk，保证 assistant 消息持久化与 ID 稳定
- 移除 `chat:sessions:syncMessages` IPC，历史落盘仅由主进程流持久化
- workspace recentFiles 读写增加类型守卫，避免存储异常污染
- workspace-settings 新增 recentFiles 存储与 get/record/remove IPC 接口
- Agent Markdown 去重移除时补齐索引守卫，runtime config 仅保留必要导出
- Agent Markdown 读取补齐空值守卫，避免重复 ID 处理时类型收敛报错
- Agent Runtime 支持用户级 JSONC 配置/Agent Markdown/Hook，桌面端按开关加载外部工具
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
- Agent Runtime 支持 system prompt/模型参数注入，参数改为可选覆盖并默认使用模型默认值
- Agent Runtime/Agent 设置改用 `@anyhunt/agents-runtime/prompt` 读取 system prompt
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
