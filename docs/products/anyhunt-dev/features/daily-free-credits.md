---
title: 免费用户每日赠送 100 Credits（方案）
date: 2026-01-18
scope: anyhunt, server.anyhunt.app
status: implemented
---

<!--
[INPUT]: “FREE 用户每天送 100 Credits”的产品需求；现有 Anyhunt Quota 模型；Moryflow 积分系统实现
[OUTPUT]: Anyhunt 的每日 Credits 设计方案（数据模型/扣费顺序/接口/迁移步骤）
[POS]: Anyhunt Dev（server + www + admin）Credits/Quota 体系的补全提案

[PROTOCOL]: 本文件变更时同步更新 `docs/products/anyhunt-dev/index.md` 与 `docs/index.md`。
-->

# 目标

- 为 **FREE** 用户提供 **每日 100 Credits**（当日有效，不累积）。
- 保持 Credits 语义清晰：**每日免费** / **月度权益** / **按量购买（含管理员赠送）** 三个 bucket。
- 不引入强依赖 cron：用户只要“当天有使用行为”，即可自动获得当天的每日额度（与 Moryflow 一致的实现风格）。

# 参考：Moryflow 的做法（现有实现）

- 设计文档：`docs/products/moryflow/features/credits-system/tech.md`
- 服务端实现：`apps/moryflow/server/src/credit/credit.service.ts`

核心点：

1. **消费优先级**固定：
   - 每日免费（当日有效）
   - 订阅/月度（当月有效）
   - 购买（先买先用）
2. 每日免费不落库：用 **Redis + TTL 到 UTC 午夜** 记录“今日已用”，实时计算“今日剩余”。

# Anyhunt 当前现状（需要补齐的缺口）

Anyhunt 现有 Quota 体系只有两类额度：

- **月度权益**：`Quota.monthlyLimit/monthlyUsed`（30 天周期）
- **按量购买**：`Quota.purchasedQuota`（永不过期；当前也承载 Admin “Grant Credits”）

缺少：

- 每日免费 bucket
- 三 bucket 的统一扣费顺序（目前只支持“月度优先，不足用购买”，且不支持跨 bucket 拆分扣减）

# 方案（已落地）：引入“每日免费 Credits”（Redis），并统一扣费/退费

## 1) Credits 分层（Anyhunt 版）

沿用 Moryflow 的三 bucket 思路，但映射到 Anyhunt 现有结构：

1. **Daily Free Credits**（新增）：每日赠送，按日重置，不累积（Redis）
2. **Monthly Credits**（现有）：`Quota.monthlyLimit - Quota.monthlyUsed`（DB）
3. **Purchased Credits**（现有）：`Quota.purchasedQuota`（DB，永不过期，含管理员赠送）

消费优先级：

```
Daily Free → Monthly → Purchased
```

理由（最佳实践）：

- 先消耗“会过期的”额度（daily/monthly），避免浪费。
- purchased 永不过期，放最后更符合用户心理预期。

## 2) FREE 的月度额度怎么处理（默认决策）

为了避免 FREE 同时拥有 “月度 100” + “每日 100” 导致额度膨胀，本方案建议：

- `FREE.monthlyQuota = 0`
- `FREE.dailyCredits = 100`

> 这会改变当前文档中“FREE 100 credits/月”的口径（例如 `docs/products/anyhunt-dev/features/v2-intelligent-digest.md`）。落地时需要统一更新口径。

## 3) Redis 设计（Anyhunt 实现）

Key（示例）：

- `credits:daily_used:{userId}:{YYYY-MM-DD}`（UTC 日期）

Value：

- 今日已用（整数）

TTL（清理历史 key）：

- 固定 **7 天**（避免 Redis 无限制增长；重置依赖日期 key，而不是依赖 TTL 到午夜）

并发一致性（推荐用 Lua 脚本原子扣减，避免竞态超扣）：

- 输入：`limit`、`amount`
- 输出：`consumed`（实际扣了多少）、`usedAfter`、`remainingAfter`

> Moryflow 当前实现是“先读 used 再 incrby”，在高并发下可能超扣；Anyhunt 落地时建议直接用 Lua 把“检查+扣减+补 TTL”做成原子操作。

## 4) 服务端职责拆分（SRP）

落地时为了最小影响面（同时保持 SRP），实现为 quota 模块内的一个独立服务：

- `apps/anyhunt/server/src/quota/daily-credits.service.ts`
  - 只负责 daily credits 的 Redis 账本（Lua 原子扣减/退费）
- `apps/anyhunt/server/src/quota/quota.service.ts`
  - 统一扣费顺序 `DAILY → MONTHLY → PURCHASED`
  - 返回 `breakdown`（用于异步任务失败退费）

## 5) API/DTO 输出（面向前端与后台）

需要让前端能展示“每日剩余”，并保证刷新可恢复：

- `GET /api/v1/user/me`（session）返回 `quota` 时增加：
  - `dailyLimit/dailyUsed/dailyRemaining`
  - `dailyResetsAt`（UTC 的 next midnight ISO string，便于 UI 展示）
- `GET /api/v1/quota`（apiKey）建议同样增加 daily 字段（同一 userId 维度）

Admin：

- Admin “Grant Credits”不变：继续只影响 `purchasedQuota`（永不过期，最适合测试/人工补偿）。
- 若需要在后台查看 daily 使用情况：可选增加只读字段（从 Redis 读），不落库。

## 6) 关键落地点（已完成）

1. `FREE.monthlyQuota = 0`，`FREE.dailyCredits = 100`（UTC 天）
2. `QuotaSource` 新增 `DAILY`
3. `QuotaService.deductOrThrow` 返回 `breakdown`，并在异步任务表写入 `quotaBreakdown` 用于失败退费
4. `GET /api/v1/user/me` 与 `GET /api/v1/quota` 输出 daily 字段
5. 文档口径更新：FREE 不再是 100/月，而是 100/天
