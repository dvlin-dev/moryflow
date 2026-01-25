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
- Auth 相关请求改为 access 内存 + refresh 安全存储，新增 `lib/server/auth-session.ts`
- Auth：接入 `@better-auth/expo`（新增 `auth-client.ts`/`auth-platform.ts`），refresh 使用 SecureStore cookie + `X-App-Platform`
- Auth Session refresh 增加网络失败清理，避免请求异常导致初始化抛错
- Auth Session 单元测试新增（`lib/server/__tests__/auth-session.spec.ts`）
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
