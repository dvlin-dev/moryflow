# Lib

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Mobile 端业务逻辑层，提供状态管理、数据处理、API 调用等核心能力。

## 职责

- 状态管理（Zustand stores）
- 业务逻辑处理
- Agent 运行时
- 自定义 Hooks
- 工具函数

## 约束

- 状态管理使用 Zustand
- 保持与 UI 层（components/）的分离
- 复杂逻辑优先实现为纯函数

## 成员清单

| 文件/目录        | 类型 | 说明               |
| ---------------- | ---- | ------------------ |
| `stores/`        | 目录 | Zustand 状态管理   |
| `hooks/`         | 目录 | 自定义 React Hooks |
| `chat/`          | 目录 | 聊天业务逻辑       |
| `vault/`         | 目录 | 知识库业务逻辑     |
| `editor/`        | 目录 | 编辑器业务逻辑     |
| `agent-runtime/` | 目录 | Agent 运行时       |
| `server/`        | 目录 | 会员/鉴权 API 适配 |
| `models/`        | 目录 | 数据模型           |
| `contexts/`      | 目录 | React Context      |
| `constants/`     | 目录 | 常量定义           |
| `tokens/`        | 目录 | Token 管理         |
| `i18n/`          | 目录 | 国际化配置         |
| `utils/`         | 目录 | 工具函数集         |
| `utils.ts`       | 文件 | 通用工具函数       |
| `theme.ts`       | 文件 | 主题配置           |

## 常见修改场景

| 场景           | 涉及文件  | 注意事项                               |
| -------------- | --------- | -------------------------------------- |
| 新增状态       | `stores/` | 遵循 Zustand 模式                      |
| 新增 Hook      | `hooks/`  | use-xxx 命名规范                       |
| 修改聊天逻辑   | `chat/`   | 注意与 Agent 运行时的交互              |
| 修改知识库逻辑 | `vault/`  | 注意文件系统权限                       |
| 修改会员逻辑   | `server/` | 认证交互统一后遵循 access/refresh 规范 |

## 近期变更

- Chat Transport thinking 流消费对齐（2026-02-27）：移除 `reasoning_item_created` 可视渲染分支，reasoning UI 仅消费 `raw_model_stream_event`，与 PC raw-only 契约保持一致。
- 模型与 thinking 规则统一（2026-02-27）：Mobile runtime 已切换到 `@moryflow/model-bank` 规则源，不再依赖旧 registry 与 SDK 默认等级 fallback。
- Cloud Sync Store 稳定性修复：`cloud-sync/sync-engine.ts` 为核心 setter 增加 `shouldSync` 等价判断，`getSnapshot` 改为稳定缓存引用；新增 `cloud-sync/__tests__/sync-engine-store.spec.ts` 覆盖 no-op 写入、快照缓存与循环更新回归
- 新增 `lib/utils/membership-tier-config.ts` 统一会员卡片等级视觉配置，并补齐 starter 专属样式回归测试
- Auth API/Session 路径修复：登录/验证/刷新/登出统一显式请求 `/api/v1/auth/*`，消除 `baseUrl + path` 拼接差异导致的路径丢失（新增 auth-api/auth-session 回归测试）
- Mobile Agent Runtime 初始化后统一绑定默认 `ModelProvider`（基于 `ModelFactory`），修复 `@openai/agents-core run()` 的 `No default model provider set`
- Chat Transport：`ReadableStream.start` 回调不再直接引用 `this.options`，改为外提 `transportOptions`，修复 `UnderlyingDefaultSource.options` 类型报错（TS2339）
- Chat Transport 流事件映射改为复用 `@moryflow/agents-runtime` 的 `ui-stream` 共享模块，删除 `lib/chat/tool-chunks.ts` 本地重复实现
- Mobile Runtime 读取 JSONC 配置增加容错降级，创建会话前确保加载默认 mode
- Agent Runtime 支持用户级 JSONC 配置/Agent Markdown/Hook，创建会话读取默认 mode
- Chat 会话模式切换补齐审计写入，SessionStore 读写时归一化 mode
- Agent Runtime 支持会话级模式注入，权限自动放行并记录审计
- 审批持久化失败不再阻断清理流程，取消/停止时同步清理 Doom Loop 与权限决策缓存
- Agent Runtime 接入 Doom Loop 守卫：重复工具检测触发审批并支持会话级 always
- Agent Runtime 增加 compaction 发送前预处理，仅在同一模型内跳过重复压缩，保证 UI/历史一致
- Agent Runtime 接入 Compaction：运行前裁剪旧工具输出并写入会话摘要
- 修复审批续跑输出持久化与 abort 收敛，审计写入改为串行
- Mobile AgentStreamResult 增补 RunState/输出只读字段，支持审批恢复与输出持久化
- Chat Transport 支持工具权限审批（中断/恢复 + JSONC 规则落地）
- Agent Runtime 新增工具输出统一截断与落盘清理（Mobile）
- Agent Runtime 改为使用 `@openai/agents-core` 类型与运行入口，移除 `@anyhunt/agents` 依赖
- Agent Runtime 使用会话历史拼装输入，流完成后追加输出（移除 SDK Session 依赖）
- Server 会员导出收敛，移除未使用的等级比较/优先级常量
- Cloud Sync：Mobile 端绑定写入 userId，账号切换触发绑定冲突处理与用户选择
- Cloud Sync：FileIndex v2 严格校验，提交成功后统一回写 lastSyncedHash/Clock/Size/Mtime
- Cloud Sync：拆分检测/执行/提交流程并补齐冲突副本上传、向量时钟合并与单测
- Cloud Sync：冲突副本上传后即时写入 FileIndex，避免提交失败导致重复文件
- Cloud Sync：detectLocalChanges 使用 mtime/size 预过滤 + hash 缓存
- Cloud Sync：冲突流程先上传副本再提交，缺失冲突元数据显式报错，下载跳过重命名失败回退
- Cloud Sync：超限文件标记为 skipped，避免误删并补齐回归测试
- Cloud Sync：下载重命名时清理旧路径，避免重复条目
- FileIndex：无效存储记录告警并重置
- Cloud Sync：最后同步时间使用 i18n 格式化，移除硬编码中文
- FileIndex：lastSyncedSize/lastSyncedMtime 用于本地变更预过滤
- Cloud Sync 与 Vault 日志统一通过 `createLogger()` 输出
- i18n Provider 的初始化依赖以实例为准，避免遗漏依赖
- 拆分并收敛全局 UI 状态：新增 `ChatSheetProvider`，移除无用的 TabBar 显隐 Context/Hook
- Agent Runtime 日志适配器将 debug/info 限制为开发环境输出，避免 console lint 警告
- 新增 Mobile TasksService（共享 TasksStore + onTasksChange）与 `use-tasks` Hook
- Mobile TasksStore 修正 Vault 内 SQLite 路径，显式 chatId 传递与 WAL 变更轮询
- Mobile TasksStore 增加 openDatabase 路径单测（2026-01-25）
- Mobile Tasks Hook 协议标注统一为 CLAUDE.md
- Auth 相关请求改为 access 内存 + refresh 安全存储，新增 `lib/server/auth-session.ts`
- Auth：接入 `@better-auth/expo`（新增 `auth-client.ts`/`auth-platform.ts`），refresh 改为 body `refreshToken`（refresh token 存储于 SecureStore）并携带 `X-App-Platform`
- Auth Session refresh 改为网络失败不清理，保留 refresh 并等待恢复
- Auth Session 单元测试新增（`lib/server/__tests__/auth-session.spec.ts`）
- Auth Store：access token 允许空 expiresAt，保持持久化一致
- Auth Session：网络失败不清理 refresh token，App Resume 触发 ensureAccessToken
- Auth 初始化：refresh 失败时保留 refresh token，避免离线启动误清理
- Membership Context 依赖清理与 signUp 参数收敛，避免无用依赖/参数

## 依赖关系

```
lib/
├── 依赖 → packages/api（API 客户端）
├── 依赖 → packages/agents-*（Agent 框架）
├── 依赖 → packages/i18n（国际化）
└── 被依赖 ← components/（UI 组件）
└── 被依赖 ← app/（页面组件）
```

## Stores 结构

```
stores/
├── auth-store.ts      # 认证状态
├── chat-store.ts      # 聊天状态
├── vault-store.ts     # 知识库状态
├── settings-store.ts  # 设置状态
└── ...
```
