---
title: Moryflow Server Auth/Quota/Payment Code Review
date: 2026-01-23
scope: apps/moryflow/server (auth/quota/payment/admin-payment)
status: done
---

<!--
[INPUT]: apps/moryflow/server/src/auth, quota, payment, admin-payment, config/pricing.config.ts, prisma/schema.prisma
[OUTPUT]: 问题清单 + 修复建议 + 进度记录
[POS]: Phase 1 / P0 模块审查记录（Auth/Quota/Payment）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Server Auth/Quota/Payment Code Review

## 范围

- Auth：`apps/moryflow/server/src/auth/`
- Quota：`apps/moryflow/server/src/quota/`
- Payment：`apps/moryflow/server/src/payment/`
- Admin Payment：`apps/moryflow/server/src/admin-payment/`
- Pricing/Entitlements：`apps/moryflow/server/src/config/pricing.config.ts`
- 数据模型：`apps/moryflow/server/prisma/schema.prisma`（User/Session/Subscription/PaymentOrder/Credits）

主要入口：

- `/api/v1/auth/*`
- `/api/v1/usage`
- `/api/v1/payment/*`
- `/api/v1/webhooks/creem`
- `/api/v1/admin/payment/*`

## 结论摘要

- 高风险问题（P1）：3 个（已修复）
- 中风险问题（P2）：4 个（已修复）
- 低风险/规范问题（P3）：1 个（已修复）

## 发现（按严重程度排序）

- [P1] 关闭 CSRF 检查会影响浏览器 Cookie 会话安全：`apps/moryflow/server/src/auth/better-auth.ts:59-63` 对所有请求设置 `disableCSRFCheck: true`，在 Web 场景下可能导致 CSRF 风险（需区分移动端/浏览器或加额外防护）。（已修复）
- [P1] Webhook productId 缺失时可能误升级为 Pro：`apps/moryflow/server/src/payment/payment-webhook.controller.ts:88-96` 用 `object.product?.id || ''`；`apps/moryflow/server/src/config/pricing.config.ts:45-63` 默认把未配置的产品 ID 置空；`apps/moryflow/server/src/config/pricing.config.ts:183-193` 将空字符串映射为 Tier；`apps/moryflow/server/src/config/pricing.config.ts:261-272` 优先返回映射结果，导致 `productId === ''` 时可能落到 `pro`（权益越权风险）。（已修复）
- [P1] 支付成功页存在脚本注入与数据外泄风险：`apps/moryflow/server/src/payment/payment-success.controller.ts:23-118` 将 query 直接 `JSON.stringify` 注入 `<script>`（`data: ${queryData}`），若 query 含 `</script>` 等可能触发 XSS；同时 `postMessage` 目标为 `*`，会将数据发给任意父窗口。（已修复）

- [P2] Checkout 成功回跳 URL 允许任意输入：`apps/moryflow/server/src/payment/payment.controller.ts:176-217` 直接使用 `dto.successUrl`，未校验/白名单限制，可能导致支付完成后跳转到恶意域名（需要限制为受信域名或忽略客户端传入）。（已修复）
- [P2] Webhook 产品类型推断基于字符串包含：`apps/moryflow/server/src/payment/payment-webhook.controller.ts:119-191` 用 `productId.includes('license')` 判断产品类型，若产品 ID 不含关键字会误发货（应基于配置映射/产品元数据判断）。（已修复）
- [P2] Webhook 幂等并发不足：`apps/moryflow/server/src/payment/payment.service.ts:309-334` 先查后写存在并发竞态，可能触发唯一索引冲突导致 webhook 重试失败（建议捕获唯一冲突并视为已处理）。（已修复）
- [P2] 存储/向量化扣减非原子：`apps/moryflow/server/src/quota/quota.service.ts:187-230` 读-改-写不在事务内，可能在并发下低估用量（应使用原子 `decrement` 或事务锁定）。（已修复）

- [P3] 支付成功页面用户文案为中文：`apps/moryflow/server/src/payment/payment-success.controller.ts:27-111` 与“用户可见文案需英文”的全局规范冲突。（已修复）

## 修复计划与进度

- 已完成：
  - Auth：按端区分 CSRF（Web 开启、设备端允许无 Origin），新增 origin 工具与单测
  - Payment：Webhook 强制 productId 校验；产品类型改为配置映射；successUrl 限制白名单
  - Payment：Webhook 幂等补齐唯一约束兜底；支付成功页注入转义 + postMessage 限定 origin + 英文文案
  - Quota：扣减改为原子更新并补齐单测
  - Pricing：空产品 ID 不再进入 Tier/credits/license 映射并补齐单测
- 状态：done
- 验证：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit`
