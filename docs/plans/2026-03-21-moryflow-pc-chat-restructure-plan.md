# Moryflow PC Chat 模块重构方案

## 1. 结论

`apps/moryflow/pc/src/main/chat` 当前的主要问题不是“文件太多”本身，而是目录结构没有表达职责边界：

- IPC 注册、会话生命周期、运行时编排、审批、附件处理、广播、持久化同步、流式 reducer 被混放在同一层
- `handlers.ts` 与 `chat-request.ts` 都承担了过多职责，已经超过“单文件编排器”合理规模
- 测试布局不一致，根目录测试与 `__tests__` 并存，不利于后续按模块迁移
- 一些文件名偏工具化，但内部其实是有状态的 service/coordinator，命名和位置都不够准确

建议采用“按主流程能力分组 + 组内按角色分层”的方式重构，而不是简单把文件塞进若干 `utils/`。

本次方案默认约束：

- 保持现有 IPC channel 名不变
- 保持现有对外行为不变
- 允许调整内部 import path、文件名和测试位置
- 不做兼容层，目录切换后直接收敛到新结构

---

## 2. 当前问题审计

### 2.1 根目录平铺已经失去信息密度

当前目录共有 26 个文件，除了 `stream/` 外几乎全部平铺。目录名只表达“都和 chat 有关”，无法表达：

- 哪些是 IPC transport
- 哪些是会话 domain/service
- 哪些是 agent run orchestration
- 哪些是 streaming pipeline
- 哪些是 approval / attachment / broadcast 这类 supporting capability

这会直接导致两个问题：

1. 新增功能时默认继续平铺
2. review 时很难在目录层面判断影响范围

### 2.2 `handlers.ts` 职责过载

文件：`apps/moryflow/pc/src/main/chat/handlers.ts`

当前同时承担了：

- IPC 注册入口
- active stream channel registry 管理
- session 可见性校验
- session CRUD handler
- title generation handler
- permission mode handler
- compaction / truncate / fork / replaceMessage handler
- apply-edit handler
- approval context handler

它已经不是单纯的 “register handlers”，而是把 transport、domain orchestration、stateful registry 都塞进了一个文件。后果是：

- 文件入口不清晰，阅读必须从头到尾扫完整体
- 局部改动容易触发无关 import 和 mock 变动
- `registerChatHandlers` 的测试天然会越来越重

### 2.3 `chat-request.ts` 同时承担请求装配、运行编排、续跑、审批衔接和持久化

文件：`apps/moryflow/pc/src/main/chat/chat-request.ts`

当前一个文件里包含：

- payload 校验与 session scope 校验
- model / thinking / permission mode 解析
- latest user message 提取
- attachment 处理
- runtime turn 启动
- truncation continue loop
- approval gate 协调
- tool runtime event queue 注入
- stream 输出
- usage 聚合
- UI message sanitize / persist / broadcast
- taskState 收尾清理

这类文件最容易在后续追加“再加一个分支”时继续膨胀，最后变成不可安全重构的流程黑箱。

### 2.4 supporting service 的职责边界不够清晰

#### `broadcast.ts`

文件：`apps/moryflow/pc/src/main/chat/broadcast.ts`

问题：

- 既做 renderer 广播，又顺带驱动 `searchIndexService`
- 广播语义和索引副作用被绑定在同一抽象下

建议：

- 保留“session/message event hub”单一职责
- 把 search index 联动变成单独 subscriber 或 effect

#### `attachments.ts`

文件：`apps/moryflow/pc/src/main/chat/attachments.ts`

问题：

- 同时负责 data URL 解码、媒体类型判断、vault 附件落盘、文本截断、agent attachment context 组装
- 对 image data URL 采用 fire-and-forget 落盘，对 text/binary attachment 采用 awaited 落盘，副作用模型不一致

建议：

- 拆成 `decode`、`persist`、`build-context` 三层
- 明确“仅组装上下文”和“顺带落盘给工具读”之间的边界

#### `messages.ts`

文件：`apps/moryflow/pc/src/main/chat/messages.ts`

问题：

- 同时包含 message part extraction helper 和 stream orchestration
- 文件名过泛，无法从命名判断“这里其实是 stream agent run coordinator”

建议：

- message helper 与 stream runner 分离

### 2.5 测试布局不一致，影响迁移

当前测试分布：

- 根目录：`approval-store.test.ts`、`handlers.*.test.ts`
- `__tests__/`：`agent-options.test.ts`、`stream-agent-run.test.ts`、`ui-message-sanitizer.test.ts`

问题：

- 同一目录下两套测试布局并存
- 无法形成“模块迁移时一并搬走测试”的稳定约定

此外，以下关键模块目前缺少同层测试文件：

- `chat-request.ts`
- `broadcast.ts`
- `attachments.ts`
- `persisted-session-sync.ts`

这意味着目录重构如果直接跨文件拆分，回归风险主要会落在这些缺少针对性单测的部分。

---

## 3. 推荐目录结构

建议把 `apps/moryflow/pc/src/main/chat` 收敛成下面的结构：

```text
apps/moryflow/pc/src/main/chat/
  index.ts
  ipc/
    register.ts
    agent-handlers.ts
    session-handlers.ts
    permission-handlers.ts
    approval-handlers.ts
  application/
    createChatRequestHandler.ts
    executeChatTurn.ts
    persistChatRound.ts
    session-visibility.ts
  services/
    active-stream-registry.ts
    runtime.ts
    approval/
      approval-gate-store.ts
      full-access-upgrade-prompt-store.ts
    attachments/
      decodeAttachment.ts
      persistAttachment.ts
      processAttachments.ts
    broadcast/
      event-bus.ts
      search-index-subscriber.ts
    sync/
      persisted-session-sync.ts
  messages/
    extractUserMessageParts.ts
    sanitizePersistedUiMessages.ts
  stream/
    streamAgentRun.ts
    coordinator.ts
    reducer.ts
    ingestor.ts
    emitter.ts
    debug-ledger.ts
    types.ts
  __tests__/
    ipc/
    application/
    services/
    messages/
    stream/
```

### 结构原则

- `ipc/` 只保留 Electron IPC 注册与 handler 装配，不放业务细节
- `application/` 放主流程编排，负责把 domain/service 串起来
- `services/` 放有状态或有外部依赖的能力模块
- `messages/` 放纯消息转换与 sanitize/helper
- `stream/` 保留现有流式处理子系统，但收口命名

### 不建议的拆法

- 不建议新增 `utils/` 大杂烩
- 不建议按“文件大小均分”机械拆目录
- 不建议把 `approval`、`attachments`、`broadcast` 塞进 `stream/`

---

## 4. 文件级迁移建议

### 第一组：先拆最清晰的 supporting modules

- `approval-store.ts` -> `services/approval/approval-gate-store.ts`
- `full-access-upgrade-prompt-store.ts` -> `services/approval/full-access-upgrade-prompt-store.ts`
- `attachments.ts` -> `services/attachments/processAttachments.ts` 及其子模块
- `broadcast.ts` -> `services/broadcast/event-bus.ts`
- `persisted-session-sync.ts` -> `services/sync/persisted-session-sync.ts`
- `runtime.ts` -> `services/runtime.ts`

原因：

- 这批文件天然有明确边界
- 先迁移它们能让后续 `handlers.ts` / `chat-request.ts` import 结构变干净

### 第二组：拆 `messages.ts`

- `findLatestUserMessage`
- `extractUserText`
- `extractUserAttachments`

移动到：`messages/extractUserMessageParts.ts`

- `streamAgentRun`

移动到：`stream/streamAgentRun.ts`

原因：

- 纯 helper 和流式主流程不应在同文件
- 这样 `chat-request.ts` 会自然只依赖明确命名的模块

### 第三组：拆 `handlers.ts`

建议拆为：

- `ipc/register.ts`
  - 只负责 `registerChatHandlers()`
- `ipc/agent-handlers.ts`
  - `chat:agent-request`
  - `chat:agent-stop`
- `ipc/session-handlers.ts`
  - `list/create/rename/generateTitle/delete/getMessages/prepareCompaction/truncate/replaceMessage/fork`
- `ipc/permission-handlers.ts`
  - `getGlobalMode/setGlobalMode`
- `ipc/approval-handlers.ts`
  - `chat:approve-tool`
  - `chat:approvals:get-context`
  - `chat:approvals:consume-upgrade-prompt`

辅助状态：

- `sessions` Map、`stopChannel`、`stopSessionChannels`
  - 移到 `services/active-stream-registry.ts`

### 第四组：拆 `chat-request.ts`

建议至少拆成 3 层：

- `application/createChatRequestHandler.ts`
  - 只做 IPC handler 入口和依赖装配
- `application/executeChatTurn.ts`
  - 负责 run loop、truncation continue、approval gate、tool runtime events
- `application/persistChatRound.ts`
  - 负责 sanitize、updateSessionMeta、broadcast、taskState cleanup

可选再拆一层：

- `application/resolveChatRequestInput.ts`
  - 负责 payload 校验、session scope 校验、latest user message 提取、attachment 预处理

---

## 5. 推荐迁移顺序

### Phase 1：目录成型，不改行为

- 建立新目录骨架
- 先搬 supporting service
- 只改 import path，不改逻辑
- 统一测试目录布局

目标：

- 让目录先表达边界

### Phase 2：拆大文件，保持接口稳定

- 拆 `messages.ts`
- 拆 `handlers.ts`
- 拆 `chat-request.ts`

目标：

- 单文件只保留一种主职责

### Phase 3：补测试空洞

- 给 `attachments` 增加 focused unit tests
- 给 `broadcast/event-bus` 增加 focused unit tests
- 给 `persisted-session-sync` 增加 focused unit tests
- 给 `executeChatTurn` 建立主流程回归测试

目标：

- 后续继续演进时，不再依赖“大一统 handler 测试”兜底

### Phase 4：补局部文档

- 若重构后 `chat/` 目录仍然超过 10 个文件，新增局部 `CLAUDE.md`
- 创建 `AGENTS.md` 指向该 `CLAUDE.md`
- 仅记录稳定职责、结构边界、核心入口，不写时间线信息

---

## 6. review 结论与优先级

### P1：必须先处理

1. `handlers.ts` 与 `chat-request.ts` 的职责拆分
2. 统一测试目录布局
3. 为 `chat-request` 主流程建立更直接的测试落点

### P2：建议本轮一起做

1. `broadcast.ts` 去掉 search index 副作用耦合
2. `attachments.ts` 拆解副作用和上下文组装
3. `messages.ts` 重命名并按职责拆开

### P3：顺手治理

1. `runtime.ts` 和 `tool-calls.ts` 命名收口
2. 给 `chat/` 补局部 `CLAUDE.md` / `AGENTS.md`

---

## 7. 实施时的风险控制

### 7.1 不要在第一步改公共契约

首轮只动：

- 目录
- 文件名
- import path
- 内部函数边界

首轮不要动：

- IPC channel 名称
- shared IPC payload shape
- `chatSessionStore` 行为
- `agent-runtime` 的外部接口

### 7.2 以“搬家测试 + 新增回归测试”双轨推进

重构时每迁一个模块，都应该：

1. 先搬原测试到目标位置
2. 再补该模块缺失的 focused tests
3. 最后拆逻辑

### 7.3 避免一次性大爆炸

`handlers.ts` 和 `chat-request.ts` 不要同一个提交一起大拆。建议：

1. 先 supporting service 迁移
2. 再拆 `handlers.ts`
3. 最后拆 `chat-request.ts`

这样回滚和 review 都更容易。

---

## 8. 最小执行清单

如果你要我下一步直接落地，我建议按下面顺序执行：

1. 建目录骨架并迁移 `approval` / `attachments` / `broadcast` / `sync` / `runtime`
2. 统一所有 chat 测试到模块化目录
3. 拆 `messages.ts`
4. 拆 `handlers.ts`
5. 拆 `chat-request.ts`
6. 为缺失模块补单测
7. 最后补 `chat/CLAUDE.md` 和 `chat/AGENTS.md`

这是风险最低、review 成本最低的一条路径。
