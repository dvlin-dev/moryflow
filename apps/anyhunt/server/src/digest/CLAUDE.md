<!--
[INPUT]: Digest（智能内容订阅系统）相关的 Controller/Service/Processor/DTO
[OUTPUT]: Digest 模块的职责边界、API 合同、队列与数据流约束
[POS]: `apps/anyhunt/server/src/digest/*` 的统一入口说明（供人类与 AI 协作）

[PROTOCOL]: 本目录下任一核心逻辑/接口变更时，需同步更新本文件（尤其是 API contract、分页协议、队列数据结构）。
-->

# Digest（Anyhunt Dev）

Digest 是 Anyhunt Dev 的核心能力：智能内容订阅系统（订阅 → 抓取/筛选 → 生成摘要/叙事 → 投递到 Inbox/Webhook/Email）。

## 最近更新

- Digest 路由拆分为 app/public 通道，移除 ApiKeyGuard 依赖
- Digest 订阅/反馈控制器文档路径统一为 `/api/v1/app/*`
- Public 举报接口支持可选 session 解析（记录登录用户）
- DigestPublicTopicController 举报记录单测补齐（userId/IP 透传）
- DigestModule 引入 AuthModule 以解析 OptionalAuthGuard 依赖
- Digest LLM 调用统一透传模型 maxOutputTokens
- Console/Admin Digest 写操作统一返回 204，错误体按 RFC7807 输出
- Digest LLM 调用改为 AI SDK（`generateText`）
- Digest LLM resolved payload 移除未使用 upstreamModelId
- DigestAiService 单测改为 hoisted mock + 动态导入（避免 ai mock 失效）

## 职责边界

- **本模块负责**
  - 订阅管理（Session app 通道）
  - Run 执行与去重/二次投递策略（Processor + Service）
  - Inbox 管理（已投递内容的状态：已读/收藏/不感兴趣）
  - Public Topics（SEO 展示、Edition 列表与详情）
  - Admin Digest 管理（Topics/Featured/Reports/Subscriptions/Runs）
- **本模块不负责**
  - Admin 用户/订单/队列等通用管理（在 `src/admin/`）
  - 通用 SSRF 校验实现（使用 `src/common` 提供的 UrlValidator）

## API 合同（v1）

> 统一版本：所有 Controller 必须使用 `version: '1'`。

### App（Session）

- `GET /api/v1/app/digest/subscriptions`：订阅列表（`page/limit`）
- `GET /api/v1/app/digest/subscriptions/:id`：订阅详情
- `GET /api/v1/app/digest/subscriptions/:subscriptionId/runs`：运行历史（`page/limit`）
- `GET /api/v1/app/digest/inbox`：Inbox 列表（`page/limit`）
- `GET /api/v1/app/digest/inbox/stats`：Inbox 统计
- `GET /api/v1/app/digest/inbox/:id/content`：Inbox 条目全文（`markdown` + `titleSnapshot/urlSnapshot`）
- `GET /api/v1/app/digest/topics`：用户 Topics 列表
- `POST /api/v1/app/digest/topics`：创建 Topic
- `PATCH /api/v1/app/digest/topics/:id`：更新 Topic
- `DELETE /api/v1/app/digest/topics/:id`：删除 Topic
- `POST /api/v1/app/digest/topics/:slug/follow`：关注 Topic
- `DELETE /api/v1/app/digest/topics/:slug/follow`：取消关注

### Public（匿名）

- `GET /api/v1/public/digest/topics`：公开 Topics 列表（`page/limit`）
- `GET /api/v1/public/digest/welcome`：Welcome overview（config + pages list，按 locale 解析）
- `GET /api/v1/public/digest/welcome/pages/:slug`：Welcome Page 详情（按 locale 解析）
- `GET /api/v1/public/digest/topics/:slug`：Topic 详情
- `GET /api/v1/public/digest/topics/:slug/editions`：Edition 列表（`page/limit`）
- `GET /api/v1/public/digest/topics/:slug/editions/:editionId`：Edition + Items
- `POST /api/v1/public/digest/topics/:slug/report`：匿名/登录用户举报

### Admin（RequireAdmin）

> Admin Digest API **仅在本模块**：`src/digest/controllers/digest-admin.controller.ts`、`src/digest/controllers/digest-admin-welcome.controller.ts`，避免与 `src/admin/*` 路由冲突。

- `GET /api/v1/admin/digest/topics`：Topics 管理（`page/limit`）
- `GET /api/v1/admin/digest/reports`：Reports 列表（`page/limit`）
- `GET /api/v1/admin/digest/subscriptions`：Subscriptions 列表（`page/limit`）
- `GET /api/v1/admin/digest/runs`：Runs 列表（`page/limit`）
- `GET /api/v1/admin/digest/welcome`：Welcome Config（enabled/defaultSlug/actions）
- `PUT /api/v1/admin/digest/welcome`：更新 Welcome Config
- `GET /api/v1/admin/digest/welcome/pages`：Welcome Pages 列表（raw locale maps）
- `POST /api/v1/admin/digest/welcome/pages`：创建 Welcome Page
- `PUT /api/v1/admin/digest/welcome/pages/:id`：更新 Welcome Page
- `PUT /api/v1/admin/digest/welcome/pages/reorder`：排序 Welcome Pages
- `DELETE /api/v1/admin/digest/welcome/pages/:id`：删除 Welcome Page

## 分页协议（强制）

所有列表接口统一使用 `page/limit`：

```ts
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
```

禁止 `cursor/nextCursor` 与 `offset`（除非另有明确约束并在本文件记录）。

## 队列与投递

- `DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE`：订阅调度（定时扫描 `nextRunAt`，Redis 锁避免重复调度）
- `DIGEST_SUBSCRIPTION_RUN_QUEUE`：订阅执行（核心 Processor：`subscription-run.processor.ts`）
- `DIGEST_SOURCE_SCHEDULER_QUEUE` / `DIGEST_SOURCE_REFRESH_QUEUE`：Source 调度与刷新
- `DIGEST_EMAIL_DELIVERY_QUEUE` / `DIGEST_WEBHOOK_DELIVERY_QUEUE`：投递通道
- `DigestSchedulerService` 启动时注册 Repeatable Jobs（默认每 60s）
- Email 链接使用 `ANYHUNT_WWW_URL` 生成（默认 `https://anyhunt.app`），用于：
  - Inbox 查看链接
  - Unsubscribe 链接

## LLM（摘要/叙事/解释）

- Digest 的所有 LLM 调用统一走 `src/llm/` 的 Admin 配置（Provider/BaseUrl/API Key 入库 + 加密存储）。
- 默认模型使用 `LlmSettings.defaultAgentModelId`（Digest 视为 Agent 类用途；不在 Digest 内硬编码 model）。

## 安全约束（强制）

- **SSRF 防护**：RSS URL / Site Crawl URL / Webhook URL 必须经过 `UrlValidator` 校验（async DNS，禁止 localhost/内网/云元数据等）。
- RSS/站点抓取使用 `fetchWithSsrGuard`，禁止重定向绕过 SSRF。
- Webhook URL 若被判定为不可投递，Worker 需抛出 `UnrecoverableError`（避免无限重试）。
- 订阅/话题数量限制与反垃圾逻辑基于有效订阅（仅 ACTIVE 计入付费 tier）。
- Digest 内部抓取使用 `syncTimeout` 控制同步等待上限（默认 120s）。
