# Chat Main Process

## 目录职责

`apps/moryflow/pc/src/main/chat` 负责 Moryflow PC 主进程里的聊天运行时边界：

- Electron IPC 注册与聊天相关主进程通道
- Chat request 输入解析、Agent turn 执行与会话持久化
- 主进程侧消息流转换、审批门控、附件处理、广播与 session 同步

本目录不承载：

- session store 的底层实现：`../chat-session-store/*`
- agent runtime 的底层工具、模型和 task state 实现：`../agent-runtime/*`
- 搜索索引实现本体：`../search-index/*`

## 结构边界

- `index.ts`
  - chat 模块唯一公开入口
- `ipc/`
  - Electron IPC 通道注册与按能力拆分的 handler 装配
- `application/`
  - 聊天主流程编排，不直接持有全局单例 UI 状态
- `services/`
  - 有状态或外部依赖能力
  - `approval/`: 工具审批 gate 与升级提示状态
  - `attachments/`: data URL 解码、附件落盘、agent attachment context 组装
  - `broadcast/`: session/message event bus 与 search index 订阅
  - `sync/`: persisted conversation -> UI message 重建同步
- `messages/`
  - 纯消息 helper 与持久化前清洗
- `stream/`
  - run stream ingest/reduce/emit pipeline
- `__tests__/`
  - 按 `ipc / application / services / messages / stream` 分组

## 关键约束

- `ipc/register.ts` 只组装共享依赖并委派给 `register-*.ts`；禁止重新回到单文件全注册器
- `application/*` 禁止直接依赖 `electron` 或 `ipc/*`
- `application/createChatRequestExecutor.ts` 只负责 request 级 orchestration；Electron `event.sender` 适配留在 `ipc/register-agent-handlers.ts`
- `services/broadcast/event-bus.ts` 保持纯事件总线；search index 联动必须走 `services/broadcast/search-index-subscriber.ts`
- `stream/*` 只处理 canonical stream event -> UIMessageChunk 转换，不承载 session 持久化逻辑
- 新测试必须放进对应能力子目录，禁止回到根目录平铺

## 核心入口

- `./index.ts`
- `./ipc/register.ts`
- `./application/createChatRequestExecutor.ts`
- `./stream/streamAgentRun.ts`
