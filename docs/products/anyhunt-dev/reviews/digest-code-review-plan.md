---
title: Digest 功能全量 Code Review 计划
date: 2026-01-14
scope: anyhunt-server, anyhunt-www, anyhunt-admin-www
status: in_progress
authors: ['AI Assistant']
---

# Digest 功能全量 Code Review 计划

> 本计划的目标是：在“不考虑历史兼容 / 删除无用代码”的前提下，把 Digest（智能内容订阅系统）Phase 1-4 的实现做一次可落地的全量 Code Review，并产出可合并的修复变更。

## 0. 需求与参考

- 功能需求：`docs/products/anyhunt-dev/features/v2-intelligent-digest.md`
- 相关规范：根 `CLAUDE.md`（测试门禁、文档同步协议、安全规范、前端表单规范等）

## 1. Review 标准

| 标准           | 说明                                     |
| -------------- | ---------------------------------------- |
| **功能正确**   | 代码逻辑符合需求文档，无明显 bug         |
| **最佳实践**   | 遵循 NestJS/React 最佳实践，代码清晰可读 |
| **单一职责**   | 每个文件/函数只做一件事                  |
| **模块化**     | 关注点分离，依赖清晰                     |
| **错误边界**   | 异常处理完善，不会因单点失败影响全局     |
| **无历史包袱** | 不保留废弃代码、兼容层、无用注释         |
| **类型安全**   | 无 `any`，类型定义完整                   |

---

## 2. 文件清单

### 2.1 后端 - Server（Digest 模块 + Queue 常量）

> 说明：后端 review 的主范围是 `apps/anyhunt/server/src/digest/**`，并包含 Digest 队列定义所在的 `apps/anyhunt/server/src/queue/queue.constants.ts`。

#### Controllers（7 个）

| #   | 文件路径                                                           | 职责                                   |
| --- | ------------------------------------------------------------------ | -------------------------------------- |
| 1   | `src/digest/controllers/digest-admin.controller.ts`                | Admin API（Topic 管理、Featured 配置） |
| 2   | `src/digest/controllers/digest-console-inbox.controller.ts`        | 用户 Inbox API                         |
| 3   | `src/digest/controllers/digest-console-run.controller.ts`          | Run 历史 API                           |
| 4   | `src/digest/controllers/digest-console-subscription.controller.ts` | 订阅 CRUD API                          |
| 5   | `src/digest/controllers/digest-console-topic.controller.ts`        | 用户 Topic 管理 API                    |
| 6   | `src/digest/controllers/digest-public-topic.controller.ts`         | Public Topic API（SEO）                |
| 7   | `src/digest/controllers/index.ts`                                  | 导出                                   |

#### DTOs & Schemas（8 个）

| #   | 文件路径                                | 职责                   |
| --- | --------------------------------------- | ---------------------- |
| 8   | `src/digest/dto/feedback.schema.ts`     | 反馈学习相关 Schema    |
| 9   | `src/digest/dto/inbox.schema.ts`        | Inbox 请求/响应 Schema |
| 10  | `src/digest/dto/index.ts`               | 导出                   |
| 11  | `src/digest/dto/report.schema.ts`       | 举报相关 Schema        |
| 12  | `src/digest/dto/run.schema.ts`          | Run 相关 Schema        |
| 13  | `src/digest/dto/subscription.schema.ts` | 订阅相关 Schema        |
| 14  | `src/digest/dto/topic.schema.ts`        | Topic 相关 Schema      |

#### Services（16 个）

| #   | 文件路径                                      | 职责                      |
| --- | --------------------------------------------- | ------------------------- |
| 15  | `src/digest/services/admin.service.ts`        | Admin 业务逻辑            |
| 16  | `src/digest/services/ai.service.ts`           | AI 摘要/叙事生成          |
| 17  | `src/digest/services/content.service.ts`      | 内容池管理                |
| 18  | `src/digest/services/feedback.service.ts`     | 反馈学习                  |
| 19  | `src/digest/services/inbox.service.ts`        | Inbox 业务逻辑            |
| 20  | `src/digest/services/index.ts`                | 导出                      |
| 21  | `src/digest/services/notification.service.ts` | 通知调度（Webhook/Email） |
| 22  | `src/digest/services/preview.service.ts`      | 订阅预览                  |
| 23  | `src/digest/services/rate-limit.service.ts`   | 速率限制                  |
| 24  | `src/digest/services/report.service.ts`       | 举报处理                  |
| 25  | `src/digest/services/rss.service.ts`          | RSS 解析                  |
| 26  | `src/digest/services/run.service.ts`          | Run 执行逻辑              |
| 27  | `src/digest/services/site-crawl.service.ts`   | 站点爬取                  |
| 28  | `src/digest/services/source.service.ts`       | Source 管理               |
| 29  | `src/digest/services/subscription.service.ts` | 订阅 CRUD                 |
| 30  | `src/digest/services/topic.service.ts`        | Topic 业务逻辑            |

#### Processors（7 个）

| #   | 文件路径                                                    | 职责                    |
| --- | ----------------------------------------------------------- | ----------------------- |
| 31  | `src/digest/processors/email-delivery.processor.ts`         | Email 投递 Worker       |
| 32  | `src/digest/processors/index.ts`                            | 导出                    |
| 33  | `src/digest/processors/source-refresh.processor.ts`         | Source 刷新 Worker      |
| 34  | `src/digest/processors/source-scheduler.processor.ts`       | Source 调度 Worker      |
| 35  | `src/digest/processors/subscription-run.processor.ts`       | 订阅执行 Worker（核心） |
| 36  | `src/digest/processors/subscription-scheduler.processor.ts` | 订阅调度 Worker         |
| 37  | `src/digest/processors/webhook-delivery.processor.ts`       | Webhook 投递 Worker     |

#### Utils & Constants（6 个）

| #   | 文件路径                            | 职责            |
| --- | ----------------------------------- | --------------- |
| 38  | `src/digest/digest.constants.ts`    | 常量配置        |
| 39  | `src/digest/digest.module.ts`       | NestJS 模块定义 |
| 40  | `src/digest/index.ts`               | 导出            |
| 41  | `src/digest/utils/cron.utils.ts`    | Cron 工具函数   |
| 42  | `src/digest/utils/index.ts`         | 导出            |
| 43  | `src/digest/utils/scoring.utils.ts` | 评分算法        |
| 44  | `src/digest/utils/url.utils.ts`     | URL 处理        |

#### Templates（1 个）

| #   | 文件路径                                        | 职责            |
| --- | ----------------------------------------------- | --------------- |
| 45  | `src/digest/templates/digest-email.template.ts` | Email HTML 模板 |

#### Queue Constants（1 个）

| #   | 文件路径                       | 职责                           |
| --- | ------------------------------ | ------------------------------ |
| 46  | `src/queue/queue.constants.ts` | 队列常量（含 Digest 队列定义） |

#### 文档与测试（新增）

- `apps/anyhunt/server/src/digest/CLAUDE.md`：Digest 模块边界与 contract（强制同步）
- `apps/anyhunt/server/src/digest/__tests__/`：Digest 单元测试（回归 + contract 解析）

---

### 2.2 前端 - www（22 个源文件）

#### Features Core（5 个）

| #   | 文件路径                           | 职责         |
| --- | ---------------------------------- | ------------ |
| 1   | `src/features/digest/api.ts`       | API 调用封装 |
| 2   | `src/features/digest/index.ts`     | 导出         |
| 3   | `src/features/digest/types.ts`     | 类型定义     |
| 4   | `src/features/digest/constants.ts` | 常量         |
| 5   | `src/features/digest/hooks.ts`     | React Hooks  |

#### Feature Components（7 个）

| #   | 文件路径                                                        | 职责              |
| --- | --------------------------------------------------------------- | ----------------- |
| 6   | `src/features/digest/components/index.ts`                       | 导出              |
| 7   | `src/features/digest/components/create-subscription-dialog.tsx` | 创建订阅对话框    |
| 8   | `src/features/digest/components/edit-topic-dialog.tsx`          | 编辑 Topic 对话框 |
| 9   | `src/features/digest/components/inbox-item-card.tsx`            | Inbox 条目卡片    |
| 10  | `src/features/digest/components/publish-topic-dialog.tsx`       | 发布 Topic 对话框 |
| 11  | `src/features/digest/components/subscription-list.tsx`          | 订阅列表          |
| 12  | `src/features/digest/components/topic-list.tsx`                 | Topic 列表        |

#### Shared Components（6 个）

| #   | 文件路径                                         | 职责             |
| --- | ------------------------------------------------ | ---------------- |
| 13  | `src/components/digest/index.ts`                 | 导出             |
| 14  | `src/components/digest/edition-content-item.tsx` | Edition 内容条目 |
| 15  | `src/components/digest/edition-list-item.tsx`    | Edition 列表项   |
| 16  | `src/components/digest/report-topic-dialog.tsx`  | 举报对话框       |
| 17  | `src/components/digest/topic-list-item.tsx`      | Topic 列表项     |
| 18  | `src/components/digest/topics-hero.tsx`          | 首页 Hero        |

#### Routes（3 个）

| #   | 文件路径                             | 职责       |
| --- | ------------------------------------ | ---------- |
| 19  | `src/routes/inbox.tsx`               | Inbox 页面 |
| 20  | `src/routes/subscriptions/index.tsx` | 订阅管理页 |
| 21  | `src/routes/subscriptions/$id.tsx`   | 订阅详情页 |

#### API Client（1 个）

| #   | 文件路径                | 职责              |
| --- | ----------------------- | ----------------- |
| 22  | `src/lib/digest-api.ts` | Digest API 客户端 |

---

### 2.3 共享包（1 个）

| #   | 文件路径                                         | 职责         |
| --- | ------------------------------------------------ | ------------ |
| 1   | `packages/ui/src/digest/digest-status-badge.tsx` | 状态徽章组件 |

---

### 2.4 前端 - admin/www（9 个相关文件，作为 Admin API 合同消费者纳入对齐范围）

> 说明：`apps/anyhunt/admin/www` 是 `/api/v1/admin/digest/*` 的直接消费者。Phase 0 合并路由冲突时必须以其调用为准对齐返回结构与分页协议。

| #   | 文件路径                                                      | 职责                                 |
| --- | ------------------------------------------------------------- | ------------------------------------ |
| 1   | `apps/anyhunt/admin/www/src/lib/api-paths.ts`                 | Admin API 路径常量（含 Digest 路由） |
| 2   | `apps/anyhunt/admin/www/src/features/digest-topics/api.ts`    | Digest Topics 管理 API               |
| 3   | `apps/anyhunt/admin/www/src/features/digest-topics/hooks.ts`  | Digest Topics hooks                  |
| 4   | `apps/anyhunt/admin/www/src/features/digest-topics/index.ts`  | 导出                                 |
| 5   | `apps/anyhunt/admin/www/src/features/digest-topics/types.ts`  | 类型定义                             |
| 6   | `apps/anyhunt/admin/www/src/features/digest-reports/api.ts`   | Digest Reports 管理 API              |
| 7   | `apps/anyhunt/admin/www/src/features/digest-reports/hooks.ts` | Digest Reports hooks                 |
| 8   | `apps/anyhunt/admin/www/src/features/digest-reports/index.ts` | 导出                                 |
| 9   | `apps/anyhunt/admin/www/src/features/digest-reports/types.ts` | 类型定义                             |

---

## 3. Review 执行计划

### Phase 0: 阻断项（必须先完成）

| 目标                                                  | 输出                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| 消除 `/api/v1/admin/digest/*` 路由冲突                | 合并 Controller/Service + 删除重复实现 + 路由唯一               |
| 对齐 Admin API 合同（返回结构 / 分页协议 / 字段语义） | 明确并记录最终 contract（以 `apps/anyhunt/admin/www` 调用为准） |

### Phase 1: 后端核心逻辑（优先级：高）

| 批次 | 文件范围                                            | 预估时间 |
| ---- | --------------------------------------------------- | -------- |
| 1.1  | Processors（7 个）- 核心执行逻辑                    | -        |
| 1.2  | Services 核心（run, subscription, inbox, content）  | -        |
| 1.3  | Services 辅助（ai, notification, feedback, source） | -        |
| 1.4  | Utils & Constants                                   | -        |

### Phase 2: 后端 API 层

| 批次 | 文件范围                                                        | 预估时间 |
| ---- | --------------------------------------------------------------- | -------- |
| 2.1  | Controllers（7 个）                                             | -        |
| 2.2  | DTOs & Schemas（8 个）                                          | -        |
| 2.3  | Admin Digest contract 对齐（Topics/Reports/Runs/Subscriptions） | -        |

### Phase 3: 前端

| 批次 | 文件范围                           | 预估时间 |
| ---- | ---------------------------------- | -------- |
| 3.1  | Features Core（api, types, hooks） | -        |
| 3.2  | Feature Components                 | -        |
| 3.3  | Shared Components & Routes         | -        |

---

## 4. Review Checklist

### 4.1 通用检查项

- [ ] 无未使用的 import
- [ ] 无 `any` 类型
- [ ] 无 `console.log`（应使用 Logger）
- [ ] 无硬编码魔数（应使用常量）
- [ ] 错误信息使用英文
- [ ] 注释使用中文
- [ ] 文件头注释完整（[INPUT]/[OUTPUT]/[POS]）
- [ ] 对外/跨模块接口有清晰 contract（字段/分页/排序/过滤）

### 4.2 后端特定检查项

- [ ] Service 方法有适当的错误处理
- [ ] Processor 有重试策略
- [ ] 数据库操作有事务（需要时）
- [ ] 敏感操作有日志记录
- [ ] DTO 使用 Zod schema + `z.infer<>`
- [ ] URL 输入做 SSRF 防护（`url-validator.ts`：禁内网/localhost/云元数据等）
- [ ] 同一路径只注册一个 Controller（避免 Nest 路由冲突/不确定性）

### 4.3 前端特定检查项

- [ ] 组件使用 react-hook-form + zod（表单；前端使用 `zod/v3` 兼容层）
- [ ] 无直接 useState 管理表单状态
- [ ] 加载/错误状态处理完善
- [ ] 样式优先 Tailwind；仅在 Tailwind v4 的 oklch/透明度场景允许必要的内联样式

---

## 5. 已发现问题（需优先处理）

### 5.1 ⚠️ 路由冲突 + 代码重复

**问题描述**：存在两个 Admin Controller 注册在相同路径 `/api/v1/admin/digest`，导致路由冲突。

| 文件                                            | 路径                   | 职责                 |
| ----------------------------------------------- | ---------------------- | -------------------- |
| `admin/admin-digest.controller.ts`              | `/api/v1/admin/digest` | Featured Topics 管理 |
| `digest/controllers/digest-admin.controller.ts` | `/api/v1/admin/digest` | 全面系统管理         |

**冲突端点**：`GET /api/v1/admin/digest/topics`（两者都有）

**修复结果（已落地）**：

1. 删除旧实现（避免重复注册路由）：
   - `apps/anyhunt/server/src/admin/admin-digest.controller.ts`
   - `apps/anyhunt/server/src/admin/admin-digest.service.ts`
2. 更新 `AdminModule` 移除引用，并清理 `apps/anyhunt/server/src/admin/dto.ts` 中 Digest 相关 schema
3. 保留并扩展 `apps/anyhunt/server/src/digest/controllers/digest-admin.controller.ts` 作为唯一 Admin Digest Controller
4. **分页协议统一**：Digest 所有列表接口统一 `page/limit`（包含 Admin/Console/Public），返回 `{ items, total, page, limit, totalPages }`
5. 更新相关模块 CLAUDE.md，确保后续改动可自洽复用

> Contract 的消费者以 `apps/anyhunt/admin/www` 为准；Admin Topics/Reports 已按 page/limit 对齐。

### 5.2 其他已修复的高优问题（摘要）

- Email 投递补齐 `unsubscribeUrl`，并基于 `ANYHUNT_WWW_URL` 生成 Inbox/Unsubscribe 链接
- RedeliveryPolicy `ON_CONTENT_UPDATE` 落地（去除 TODO），并做批量去重查询优化
- 投递时同步更新 `UserContentState`（first/lastDeliveredAt、deliveredCount、lastDeliveredContentHash 等），避免仅依赖 RunItem 状态
- Inbox 列表把 saved/unread/notInterested 过滤下推到 DB 层，修复分页不正确
- RSS / Site Crawl URL 加入 SSRF 校验（UrlValidator）
- Webhook URL 不可投递时使用 `UnrecoverableError`（避免无限重试）

---

## 6. 排除范围

1. **Generated Prisma Models**：`generated/prisma-main/models/Digest*.ts` 是自动生成的，不纳入 review 范围。

2. **Migration 文件**：数据库迁移文件不纳入 review 范围。

---

## 7. 输出产物

Review 完成后输出：

1. **问题清单**：按严重程度分类（Critical / Major / Minor）
2. **修复变更**：包含所有必要修改（不拆多个 PR；直接在主分支完成）
3. **校验结果**：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit` 全绿（必要时补充 e2e）
4. **暂存与确认**：修复完成后先 `git add -A` 放入暂存区，由需求方确认后再推送
5. **更新文档**：按同步协议更新相关 `CLAUDE.md` / 索引文档

---

## 8. 协作流程（主分支）

1. 按 Phase 0 → Phase 4 顺序完成修复与回归测试
2. 运行强制门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`
3. 将所有改动放入暂存区：`git add -A`
4. 需求方确认暂存区内容无误后，再执行推送（必要时再补充 commit message/拆分提交）

---

_创建日期: 2026-01-14_
