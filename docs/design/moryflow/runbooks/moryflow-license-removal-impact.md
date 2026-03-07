---
title: Moryflow License 全量删除影响评估与执行清单
date: 2026-02-25
scope: moryflow
status: completed
---

<!--
[INPUT]: 删除 License 业务能力（仅保留免费与付费）
[OUTPUT]: 确认版影响面 + 全删清单 + 固定执行步骤 + 数据库更新命令
[POS]: Moryflow 会员与支付域 License 下线的唯一执行基线
-->

# Moryflow License 全量删除影响评估与执行清单

## 1. 已确认前提（固定）

本次改造按以下前提执行，全部已确认：

1. 不做历史兼容。
2. 不做用户迁移。
3. 视为新项目处理，可直接使用破坏性改造。
4. License 业务能力一次性全量删除，不分阶段。
5. 改造完成后，直接使用 `/Users/bowling/code/me/moryflow/apps/moryflow/server/.env` 中的线上数据库变量执行数据库更新。

## 2. 边界定义（固定）

本次删除对象是 **业务 License（永久授权）能力**，不删除以下内容：

- 第三方/开源许可证文本（例如 Android/Gradle 文件中的 Apache License 注释）
- `package.json` 的 `license` 字段（MIT/UNLICENSED）
- 设置页 “Open Source Licenses” 文案（`packages/i18n/src/translations/settings/en.ts`）

## 3. 影响面总览（代码扫描结果）

- `apps/moryflow/server`：约 38 个文件
- `apps/moryflow/admin`：约 26 个文件
- `apps/moryflow/pc + mobile`：约 7 个文件（排除第三方 LICENSE 文本）
- `packages/api`：3 个文件
- `docs`：4 个现有文档涉及 License 口径

## 4. 必删清单（Delete）

### 4.1 后端 License 模块

- 删除目录：`apps/moryflow/server/src/license/`
  - `license.module.ts`
  - `license.controller.ts`
  - `license.service.ts`
  - `dto/license.dto.ts`
  - `index.ts`
- 删除 E2E：`apps/moryflow/server/test/license.e2e-spec.ts`

### 4.2 Admin License 功能

- 删除页面：`apps/moryflow/admin/src/pages/LicensesPage.tsx`
- 删除 feature：`apps/moryflow/admin/src/features/payment/licenses/`
- 删除路由：`apps/moryflow/admin/src/App.tsx` 中 `/licenses`
- 删除侧边栏入口：`apps/moryflow/admin/src/components/layout/app-sidebar.tsx`
- 删除支付模块导出：`apps/moryflow/admin/src/features/payment/index.ts` 中 `licenses`

### 4.3 数据模型 License 实体

- 删除 Prisma 枚举：`LicenseStatus`、`LicenseTier`、`LicenseActivationStatus`
- 删除 Prisma 模型：`License`、`LicenseActivation`

## 5. 必改清单（Refactor）

### 5.1 Prisma 与支付模型

- `apps/moryflow/server/prisma/schema.prisma`
  - `SubscriptionTier` 去掉 `license`
  - `ProductType` 去掉 `license`
  - `User` 去掉 `licenses` 关系
- `apps/moryflow/server/prisma/seed.ts`
  - 删除所有 license 用户与 license 种子数据

### 5.2 后端模块装配与 API

- 从模块装配移除 License：
  - `apps/moryflow/server/src/app.module.ts`
  - `apps/moryflow/server/src/main.ts`
  - `apps/moryflow/server/src/payment/payment.module.ts`
- 支付链路删除 license 发货分支：
  - `apps/moryflow/server/src/payment/payment.service.ts`
  - `apps/moryflow/server/src/payment/payment-webhook.controller.ts`
  - `apps/moryflow/server/src/payment/payment.utils.ts`
  - `apps/moryflow/server/src/payment/dto/payment.dto.ts`
- 定价配置删除 license 产品与 env：
  - `apps/moryflow/server/src/config/pricing.config.ts`
  - 移除 `CREEM_PRODUCT_LICENSE_STANDARD`
  - 移除 `CREEM_PRODUCT_LICENSE_PRO`
- OpenAPI 删除 License tag：
  - `apps/moryflow/server/src/openapi/openapi.service.ts`

### 5.3 Tier/ProductType 枚举统一

以下位置统一去掉 `license`：

- `apps/moryflow/server/src/types/tier.types.ts`
- `apps/moryflow/server/src/admin/dto/admin.dto.ts`
- `apps/moryflow/server/src/admin/admin.controller.ts`
- `apps/moryflow/server/src/admin/site/admin-site.controller.ts`
- `apps/moryflow/server/src/admin/site/admin-site.dto.ts`
- `apps/moryflow/server/src/quota/dto/quota.dto.ts`
- `apps/moryflow/server/src/quota/quota.config.ts`
- `apps/moryflow/server/src/ai-admin/dto/ai-admin.dto.ts`
- `apps/moryflow/server/src/ai-proxy/ai-proxy.service.ts`
- `apps/moryflow/server/src/admin-payment/admin-payment.controller.ts`
- `apps/moryflow/server/src/admin-payment/dto/admin-payment.dto.ts`

### 5.4 Admin 前端

- 类型与校验：
  - `apps/moryflow/admin/src/types/api.ts`
  - `apps/moryflow/admin/src/types/payment.ts`
  - `apps/moryflow/admin/src/constants/tier.ts`
  - `apps/moryflow/admin/src/lib/validations/user.ts`
- 页面与统计：
  - `apps/moryflow/admin/src/pages/DashboardPage.tsx`
  - `apps/moryflow/admin/src/pages/SitesPage.tsx`
  - `apps/moryflow/admin/src/pages/PaymentTestPage.tsx`（删除 license tab）
- 常量与分布图：
  - `apps/moryflow/admin/src/features/payment/orders/const.ts`
  - `apps/moryflow/admin/src/features/dashboard/components/tier-distribution.tsx`
  - `apps/moryflow/admin/src/features/storage/const.ts`

### 5.5 共享包 + PC/Mobile

- `packages/api/src/membership/types.ts`：`UserTier` / `ProductType` 去掉 `license`
- `packages/api/src/membership/const.ts`：删除 Lifetime 显示、颜色、权益配置
- `packages/api/src/paths.ts`：删除 `LICENSE_API`
- PC：`apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/user-profile.tsx`
- Mobile：
  - `apps/moryflow/mobile/components/membership/MembershipCard.tsx`
  - `apps/moryflow/mobile/global.css`
  - `apps/moryflow/mobile/lib/tokens/base.ts`

## 6. 数据库更新（确认执行步骤）

本次数据库按破坏性方式直接更新，不保留任何 License 历史结构。

### 6.1 本地生成并验证迁移

```bash
pnpm --filter @moryflow/server prisma:migrate --name remove-license
pnpm --filter @moryflow/server prisma:generate
```

### 6.2 使用线上 `.env` 执行数据库更新

```bash
set -a
source /Users/bowling/code/me/moryflow/apps/moryflow/server/.env
set +a

pnpm --filter @moryflow/server exec prisma migrate deploy
pnpm --filter @moryflow/server prisma:generate
```

## 7. 测试与验收（确认口径）

必须通过以下检查：

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:unit`
4. `/api/v1/license/*` 路由不再存在
5. 支付 webhook 仅处理 `subscription` 与 `credits`
6. Admin 无 License 页面、无 License 筛选项、无 License 订单类型
7. PC/Mobile 会员展示无 License/Lifetime 入口与样式

## 8. 已确认风险与处理方式

1. 风险：删 enum/model 可能导致迁移 SQL 失败。处理：生成迁移后先在本地库完整执行一次再 deploy。
2. 风险：跨端类型联动导致编译报错。处理：统一从 `@moryflow/api` 类型先改，再逐端修复。
3. 风险：支付链路漏删 License 分支。处理：以 `resolveCheckoutProductType`、`ProductType`、`pricing.config` 三处为主线做全局回归。

---

本文件为本次 License 下线改造的确认执行稿，不再保留待决策项。

## 9. 按步骤执行计划（零影响目标）

以下步骤按顺序执行，不跳步。每一步未通过验收前，不进入下一步。

1. 建立改造基线
   - 执行：拉取最新代码后新建工作分支，记录当前 `pnpm lint && pnpm typecheck && pnpm test:unit` 基线结果。
   - 验收：基线结果完整可复现，当前主干无额外阻塞错误。

2. 先做共享类型收敛（减少级联编译错误）
   - 执行：先改 `packages/api` 的 `UserTier`/`ProductType`/`LICENSE_API`，删除 `license`/`Lifetime` 相关定义。
   - 验收：`packages/api` 相关 typecheck 通过；下游报错集中在待改模块，未出现无关模块新增错误。

3. 后端核心重构（允许必要重构）
   - 执行：删除 `src/license/**`，同时重构 `payment`、`pricing`、`quota`、`admin`、`openapi` 等调用链，彻底移除 license 分支。
   - 验收：`apps/moryflow/server` 可编译；`/api/v1/license/*` 不再注册；支付链仅保留 `subscription` 与 `credits`。

4. Prisma 结构与迁移落地（破坏性）
   - 执行：更新 `schema.prisma` 与 `seed.ts`，生成 `remove-license` 迁移并本地执行验证。
   - 验收：本地迁移完整成功；Prisma Client 生成成功；数据库中无 License 相关表与 enum 值。

5. Admin 端清理与重构
   - 执行：删除 License 页面/路由/菜单；更新 dashboard、sites、orders、payment-test、tier 常量与校验逻辑。
   - 验收：Admin 可正常启动；导航无死链；所有筛选与列表在无 license 枚举时正常工作。

6. PC/Mobile 会员展示清理
   - 执行：移除 license tier 展示、色板变量与升级判定中的 license 分支。
   - 验收：会员卡、升级入口、模型权限展示正常；无 `License/Lifetime` 用户可见文案残留（开源许可证页面除外）。

7. 测试重构与补齐
   - 执行：删除 license 专属测试，重构受影响测试（payment/admin/quota/ai-proxy/types）。
   - 验收：无失效测试引用；核心路径测试覆盖保留：认证、支付、配额、站点、模型权限。

8. 全量质量闸门
   - 执行：
     - `pnpm lint`
     - `pnpm typecheck`
     - `pnpm test:unit`
   - 验收：三项全部通过。

9. 业务回归冒烟（防止其它功能受影响）
   - 执行：手工 + 自动化检查以下功能：
     - 登录/刷新/登出
     - 订阅购买与积分购买
     - webhook 发货
     - Admin 用户管理/站点管理/支付管理
     - PC/Mobile 会员信息、模型可用性、升级流程
   - 验收：以上功能全部正常，且无 license 入口/逻辑残留。

10. 线上数据库更新（使用指定 `.env`）

- 执行：

  ```bash
  set -a
  source /Users/bowling/code/me/moryflow/apps/moryflow/server/.env
  set +a

  pnpm --filter @moryflow/server exec prisma migrate deploy
  pnpm --filter @moryflow/server prisma:generate
  ```

- 验收：`migrate deploy` 成功且无 pending migration；服务启动与关键 API 健康检查正常。

11. 上线后验证

- 执行：复跑关键接口与关键页面（server/admin/pc/mobile）最小回归。
- 验收：无新增 P0/P1 问题；功能面与本计划目标一致。

## 10. 当前状态

1. License 业务能力已经从 Moryflow 代码、数据库与用户入口中完全移除。
2. 支付与会员链路当前只保留 `subscription + credits`，不再存在 `license` 产品类型、枚举或路由。
3. Server / Admin / PC / Mobile 的用户可见路径已完成收口；相关 Prisma 结构与迁移也已完成线上应用。
4. 本文保留影响面、删除清单、数据库步骤与验收口径；逐步执行日志不再继续维护。
