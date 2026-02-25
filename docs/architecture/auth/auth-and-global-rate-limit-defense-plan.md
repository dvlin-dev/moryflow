---
title: Moryflow Server Auth + 全局限流防护方案（宽松阈值）
date: 2026-02-25
scope: apps/moryflow/server
status: active
---

<!--
[INPUT]: 当前 Moryflow Server Auth/全局限流现状与已确认阈值参数
[OUTPUT]: 可执行的分层限流方案（需求、技术设计、分步实施计划）
[POS]: Auth 与全局接口防刷改造的实施基线文档
-->

# 1. 需求定义（已确认）

## 1.1 业务目标

- 同时保留两层限流：
  - Auth 专属限流（登录/注册/改密/OTP 等认证入口）
  - 全局接口限流（业务 API 统一兜底）
- 限流策略偏宽松，以“防恶意攻击”为主，不干扰正常用户。

## 1.2 已确认阈值

- Auth：`60s / 20`
- 全局：`60s / 300`
- 全局限流存储：Redis（非内存）

## 1.3 非目标

- 本次不引入 CAPTCHA / 设备指纹 / 黑白名单系统
- 不改动现有鉴权模型（JWT access + refresh rotation）
- 不引入外部 WAF/CDN 限流策略作为本次交付前置

# 2. 落地现状（2026-02-25）

- Auth 与全局两层限流已同时生效（非二选一）。
- Auth 限流已修复 Better Auth 默认特殊规则覆盖问题：登录路径不再误落到默认 `10s / 3`。
- 全局限流已通过 `APP_GUARD + ThrottlerModule.forRootAsync + RedisThrottlerStorageService` 生效。
- 全局 Redis 计数已改为 Lua 原子执行，避免并发下多步命令带来的竞态超限误差。

# 3. 技术方案

## 3.1 分层策略总览

| 层级                       | 作用范围                          | 判定键                       | 阈值        | 存储                             |
| -------------------------- | --------------------------------- | ---------------------------- | ----------- | -------------------------------- |
| Auth 限流（Better Auth）   | `/api/v1/auth/*` 映射后的认证路径 | `ip + path`                  | `60s / 20`  | Redis secondary storage          |
| 全局限流（Nest Throttler） | 全部业务接口（可按路由跳过）      | `tracker + handler + policy` | `60s / 300` | Redis（自定义 ThrottlerStorage） |

## 3.2 判定规则与使用特征

### Auth 限流（Better Auth）

- 计数键：`ip + path`
- `ip` 来源：`x-forwarded-for` 第一段（反代透传）
- `path`：Better Auth 内部路径（如 `/sign-in/email`）
- 规则：通过 `customRules` 显式覆盖登录类默认特殊规则，统一使用 `60s / 20`
- 路径模式：`/sign-in/**`、`/sign-up/**`、`/change-password/**`、`/change-email/**`、`/email-otp/**`、`/forget-password/**`
- 关键约束：Better Auth 的 `*` 不跨 `/`，必须使用 `/**` 覆盖子路径（例如 `/sign-in/email`）

### 全局限流（Nest）

- 限流追踪器（tracker）：
  - 已登录：`user:{userId}`
  - 未登录：`ip:{req.ip}`
- 最终 key 组成：`class + handler + throttlerName + tracker`（经 Throttler 默认 key 生成逻辑处理）
- 特征：
  - 同一用户请求同一接口会共用计数
  - 未登录流量按 IP 聚合
  - 不同接口互不影响（避免单一热点拖垮全站）

## 3.3 Redis 存储策略（全局限流）

- 新增 `RedisThrottlerStorageService implements ThrottlerStorage`
- key 结构：
  - 计数 key：`throttle:{throttlerName}:{trackerRouteKey}`
  - 阻断 key：`throttle:{throttlerName}:{trackerRouteKey}:blocked`
- 计数策略（Lua 原子脚本）：
  - 若阻断 key 有效：直接返回阻断状态，不再递增计数
  - 若未阻断：`INCR` 计数并保证 counter TTL
  - 若 `totalHits > limit`：设置阻断 key（`PX=blockDurationMs`）
  - 返回 `{ totalHits, counterTtlMs, isBlocked, blockedTtlMs }`
- 对外返回值：
  - `timeToExpire`、`timeToBlockExpire` 统一转为秒（向上取整）
- 多实例一致性：依赖 Redis 共享计数，避免单实例内存限流失真

## 3.4 配置项建议（环境变量）

- 所有环境变量均为可选，不传使用默认值：
  - `BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS`：默认 `60`
  - `BETTER_AUTH_RATE_LIMIT_MAX`：默认 `20`
  - `GLOBAL_THROTTLE_TTL_MS`：默认 `60000`
  - `GLOBAL_THROTTLE_LIMIT`：默认 `300`
  - `GLOBAL_THROTTLE_BLOCK_DURATION_MS`：默认与 `GLOBAL_THROTTLE_TTL_MS` 一致
  - `GLOBAL_THROTTLE_SKIP_PATHS`：默认 `/health,/openapi.json,/openapi-internal.json,/api-reference`

可选增强（后续）：

- 为不同环境配置更细粒度的 `GLOBAL_THROTTLE_SKIP_PATHS`（例如内部回调/探针路径）

# 4. 分步执行计划（可直接实施）

## Step 1：配置收敛

- 在 auth 配置中引入 `BETTER_AUTH_RATE_LIMIT_*` 读取逻辑
- 在全局限流模块引入 `GLOBAL_THROTTLE_*` 读取逻辑
- 约束默认值与最小值，避免非法配置导致限流失效

## Step 2：接入全局 Throttler（Redis）

- 在 `AppModule` 注册 `ThrottlerModule.forRootAsync(...)`
- 通过 `ThrottleModule` 注入：
  - `GLOBAL_THROTTLE_CONFIG`
  - `RedisThrottlerStorageService`
- 在 `forRootAsync` 工厂中统一编排 `storage + skipIf + throttlers`
- 保留 `RedisModule` 全局依赖，复用现有 Redis 连接

## Step 3：启用全局 Guard

- 将 `UserThrottlerGuard` 作为 `APP_GUARD` 注册
- 保持 tracker 规则：`userId` 优先，IP 兜底
- 默认 skip 路径：`/health`、`/openapi.json`、`/openapi-internal.json`、`/api-reference`

## Step 4：调整 Auth 限流

- 在 Better Auth `rateLimit` 中使用 `60s/20`
- 通过 `customRules` 显式覆盖 `/sign-in/**`、`/sign-up/**`、`/change-password/**`、`/change-email/**` 及 OTP 相关路径
- 确保 Auth 与全局限流并存，不互相替代

## Step 5：测试与校验

- 单元测试：
  - `UserThrottlerGuard` tracker 规则（user/ip）
  - Redis storage `increment` 行为与 TTL 行为
- 回归测试：
  - Auth：同路径 21 次请求触发 429
  - 全局：同接口 301 次请求触发 429
- L2 门禁：
  - `pnpm --filter @moryflow/server lint`
  - `pnpm --filter @moryflow/server typecheck`
  - `pnpm --filter @moryflow/server test`
  - `pnpm --filter @moryflow/api test:unit`（429 报错解析链路）

## Step 6：灰度上线

- 先在预发验证限流头与 429 返回体
- 观察 24h：429 占比、登录成功率、错误告警
- 再推生产全量

# 4.1 执行状态（2026-02-25）

- Step 1（配置收敛）：已完成（Auth `BETTER_AUTH_RATE_LIMIT_*`、全局 `GLOBAL_THROTTLE_*` 均为可选并带默认值）
- Step 2（接入全局 Throttler + Redis storage）：已完成（`RedisThrottlerStorageService` + `ThrottlerModule.forRootAsync`）
- Step 3（启用全局 Guard）：已完成（`UserThrottlerGuard` 作为全局 `APP_GUARD`）
- Step 4（调整 Auth 限流）：已完成（`customRules` 覆盖登录/注册/改密/OTP 路径，消除默认 `10s/3`）
- Step 5（测试与校验）：已完成（新增 `auth.rate-limit.spec.ts`：`/sign-in/email` 第 21 次拦截；`redis-throttler.storage.spec.ts`：全局第 301 次拦截；`@moryflow/server` lint/typecheck/test 与 `@moryflow/api test:unit` 通过）
- Step 6（灰度上线）：待执行（部署窗口内完成）

# 5. 验收标准

- Auth 路径在 `60s / 20` 阈值下稳定限流，不再出现“第 4 次即触发”的严格行为
- 全局接口在 `60s / 300` 超阈后返回 429，且多实例计数一致
- 客户端能展示 429 原始 message（包括 `text/plain` 包裹 JSON 的响应体）
- 正常用户流程（登录、聊天、同步、搜索）无明显误伤
- Redis 异常时有降级或明确告警，不出现进程崩溃

# 6. 回滚方案

- 配置级回滚：
  - 提高阈值（临时放宽）或关闭全局限流开关
- 代码级回滚：
  - 移除 `APP_GUARD` Throttler 注册
  - 保留 Auth 单层限流作为最小防线
- 数据级：
  - Redis 限流 key 为短 TTL 临时数据，无需迁移回滚

# 7. 风险与应对

- 风险：NAT/公司网络下未登录用户共享 IP，可能误触全局限流
  应对：优先推动已登录态（userId）限流；必要时对关键公开接口单独放宽

- 风险：Redis 抖动导致限流判定不稳定
  应对：增加 Redis 连接健康告警与 fallback 行为日志

- 风险：限流头/错误消息在客户端展示不一致
  应对：统一依赖 `@moryflow/api` transport 错误解析链路（已修复 text/plain 场景）
