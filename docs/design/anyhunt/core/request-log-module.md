---
title: Anyhunt 统一日志系统方案（用户行为 + 错误排查 + IP 监控）
date: 2026-02-24
scope: apps/anyhunt/server, apps/anyhunt/admin/www
status: completed
---

<!--
[INPUT]: Anyhunt 统一 API 请求上下文（user/apiKey/requestId/ip/path/status）与 Admin 运维诉求
[OUTPUT]: 一套低复杂度、可直接落地的日志系统架构（30 天保留）
[POS]: Anyhunt Server 可观测性基线（运营分析 + 线上排障）

[PROTOCOL]: 仅在相关索引、跨文档事实引用或全局协作边界失真时，才同步更新对应文档。
-->

# Anyhunt 统一日志系统方案（用户行为 + 错误排查 + IP 监控）

## 当前状态

1. `RequestLog` 已作为 Anyhunt Server 的统一请求日志事实源落地。
2. 采集链路固定为“全局中间件自动采集 -> stdout + PostgreSQL 异步落库”，业务代码不再散落埋点。
3. Admin 侧已提供 Requests / Users / IP Monitor 查询能力，保留期固定 30 天，并由清理任务自动回收。
4. 本文保留当前架构、字段规范、查询能力与上线后观测清单；历史实施步骤与逐轮验证记录不再单独维护。

## 1. 设计目标

1. 支持用户行为分析：回答“谁在用、用什么、用得怎么样”。
2. 支持错误排查：回答“哪里报错、谁受影响、是否与 IP/Key 相关”。
3. 支持 IP 监控：识别高频与异常错误率来源。
4. 架构保持简单：仅基于 NestJS + Prisma + PostgreSQL + Admin 页面实现。
5. 数据有效期统一 30 天。

## 2. 核心决策（已拍板）

### 2.1 零兼容策略（不考虑历史兼容）

- 不复用旧的“仅 ScrapeJob 错误统计”作为统一日志入口。
- 不做旧日志接口兼容层。
- 不迁移历史日志数据（新表从上线时刻开始写入）。
- Admin 侧按新接口重建日志页面。

### 2.2 技术决策

- 采集方式：全局中间件自动采集（禁止业务代码手工散落埋点）。
- 存储方式：`stdout + PostgreSQL RequestLog 单表`。
- 写入策略：全量请求落库（为行为分析/IP监控提供完整样本）。
- 保留策略：30 天，定时清理。
- 权限策略：日志查询仅 `AdminGuard` 可访问。

## 3. 架构总览

### 3.1 数据流

1. 请求进入 -> `requestId` 中间件生成/透传链路 ID。
2. `RequestLogMiddleware` 记录开始时间与请求上下文。
3. 响应结束（`finish/close`）后生成结构化日志对象。
4. 同步写 stdout；异步写 PostgreSQL（写失败不影响主流程）。
5. Admin 接口按维度查询并聚合展示。

### 3.2 模块划分

- `apps/anyhunt/server/src/log/`
  - `request-log.middleware.ts`：采集层
  - `request-log.service.ts`：写入、查询、聚合
  - `request-log.controller.ts`：Admin 查询接口
  - `request-log-cleanup.service.ts`：30 天清理任务
  - `dto/*`：查询与响应 schema

## 4. 数据模型（单表）

建议新增 Prisma 模型：

```prisma
model RequestLog {
  id                 String   @id @default(cuid())
  createdAt          DateTime @default(now())

  // 链路
  requestId          String?
  method             String
  path               String
  routeGroup         String?  // agent/scrape/search/auth/admin/...
  statusCode         Int
  durationMs         Int

  // 认证主体
  authType           String?  // session | apiKey | anonymous
  userId             String?
  apiKeyId           String?

  // 来源（按需求保留明文 IP）
  clientIp           String
  forwardedFor       String?
  origin             String?
  referer            String?
  userAgent          String?

  // 错误与限流
  errorCode          String?
  errorMessage       String?
  retryAfter         String?
  rateLimitLimit     String?
  rateLimitRemaining String?
  rateLimitReset     String?

  // 体积（可选）
  requestBytes       Int?
  responseBytes      Int?

  @@index([createdAt])
  @@index([requestId])
  @@index([statusCode, createdAt])
  @@index([routeGroup, createdAt])
  @@index([userId, createdAt])
  @@index([apiKeyId, createdAt])
  @@index([clientIp, createdAt])
}
```

## 5. 字段规范与数据治理

### 5.1 必采字段

- 链路：`requestId/method/path/statusCode/durationMs/createdAt`
- 主体：`authType/userId/apiKeyId`
- 来源：`clientIp/forwardedFor/origin/referer/userAgent`
- 错误：`errorCode/errorMessage`
- 限流：`retry-after/x-ratelimit-*`

### 5.2 严禁落库

- `Authorization` 原值
- Cookie（请求与响应）
- 请求/响应 body 明文（尤其 Agent messages）

### 5.3 截断与标准化

- `errorMessage` 截断 512 字符。
- `userAgent` 截断 512 字符。
- `routeGroup` 由 path 规则映射（避免每次 SQL 解析 path）。

## 6. 查询能力设计（Admin）

### 6.1 明细检索

`GET /api/v1/admin/logs/requests`

- 过滤：`statusCode, routeGroup, pathLike, requestId, userId, apiKeyId, clientIp, from, to`
- 分页：`page, limit`
- 排序：默认 `createdAt desc`

### 6.2 概览统计

`GET /api/v1/admin/logs/overview`

- 时间窗口：`from, to`
- 返回：`totalRequests, errorRate, p95DurationMs, topRoutes, topErrorCodes`

### 6.3 用户行为分析

`GET /api/v1/admin/logs/users`

- 返回：`topUsers, activeUsersDaily, userErrorRate`

### 6.4 IP 监控

`GET /api/v1/admin/logs/ip`

- 返回：`topIpByRequests, topIpByErrorRate, ipTrend`

## 7. 安全与合规（明文 IP）

1. 明文 IP 仅在 Admin 日志模块可见。
2. 普通业务接口禁止返回日志明细。
3. 审计要求：记录管理员查询行为（可复用 `AdminAuditLog`）。
4. 文档与隐私条款需补充“为安全风控与故障排查保留 30 天请求日志”。

## 8. 生命周期与容量控制

### 8.1 保留策略

- 固定 30 天：每天凌晨 3 点执行清理。
- 清理方式：按 `createdAt` 分批删除，避免长事务锁表。

### 8.2 性能边界（最佳实践）

- 写日志失败不影响业务响应（fail-open）。
- 查询默认时间范围限制（例如默认最近 7 天），避免误扫全表。
- 所有列表接口必须分页。

## 9. 验收标准

1. 能按 `requestId` 还原单次故障链路（user/apiKey/ip/path/status/error）。
2. 能在 Admin 看到 30 天用户行为分析与 IP 监控。
3. 错误排查可直接定位“高风险路径/用户/IP”。
4. 超过 30 天日志自动清理。
5. 无敏感凭证与 body 明文落库。

## 10. 上线后观测清单

1. 抽样核对错误请求链路是否完整，并确认 `requestId` 能回连到 stdout 与数据库记录。
2. 核对 Top IP / Top User / Top Path 聚合结果是否与真实流量结构一致。
3. 核对日志异步落库失败率应接近 0，且不会反向影响主请求链路。
4. 在首次上线后 24 小时内完成一次人工巡检并留存结果。
