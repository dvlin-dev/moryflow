# 内测阶段支付锁定与兑换码系统

> 状态：**frozen** — 所有决策已确定，可直接执行。

## 背景

Moryflow 处于内测阶段。真实支付（Creem checkout）需对用户不可用，但订阅/积分弹窗保留展示套餐信息。内测期间用户通过管理员创建的**兑换码**获取会员和积分。

当前管理后台 `updateSubscription` 接口只更新 `Subscription` 表，未同步 `Quota.monthlyLimit`，需一并修复。

## 决策记录

| 问题               | 决策                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 会员赠送积分       | **不自动赠送**。会员仅解锁月度配额池，如需额外积分由管理员单独创建 CREDITS 码                                                          |
| 码格式             | `MF-XXXX-XXXX`（自动生成），管理员可手动指定自定义码                                                                                   |
| 会员有效期         | 每个码可配置 `membershipDays`，默认 30 天                                                                                              |
| 混合码             | 不支持。CREDITS 和 MEMBERSHIP 两种类型分开，保持模型简洁                                                                               |
| 现有管理端编辑订阅 | 保留，修复 tier 和 status 变更时的配额同步 bug                                                                                         |
| 内测提示文案       | `Purchasing is not available during beta. Join our Discord for redemption codes!`，Discord 可点击跳转                                  |
| 支付拦截方式       | 在 `usePurchase` hook 层短路，单点控制。按钮不加 `disabled`（原生 disabled 阻止 onClick），由 hook toast + BetaNotice 内联文案双重提示 |
| 会员码周期语义     | **立即替换**：新 tier + 新周期从 now 起算。不续期叠加。详见 C8                                                                         |
| 每账号兑换限制     | 每个 code 每账号限一次（`@@unique([codeId, userId])`），不限内测期总次数                                                               |

---

## 1. PC 端 — 禁用支付 + 内测提示

### 决策

- `usePurchase()` hook 中加入内测守卫，`purchase()` 直接短路并弹 toast，不调用 `createCheckout()`
- 按钮保持可点击（不加 `disabled`，因为原生 disabled 会阻止 onClick 导致 toast 无法触发），hook 短路是唯一拦截点
- 在账户页面积分余额区域、会员权益区域、订阅弹窗、积分包弹窗展示 BetaNotice 内联文案
- 文案中 "Discord" 渲染为 `text-primary` 可点击链接，通过 `window.desktopAPI.membership.openExternal()` 跳转 `https://discord.gg/cyBRZa9zJr`

### 涉及文件

| 文件                                            | 改动                                    |
| ----------------------------------------------- | --------------------------------------- |
| `lib/server/hooks/use-purchase.ts`              | `purchase()` 短路 → toast + return null |
| `user-profile.tsx`                              | 积分余额和会员权益区域添加 BetaNotice   |
| `subscription-dialog.tsx`                       | 套餐卡片下方添加 BetaNotice             |
| `credit-packs-dialog.tsx`                       | 积分包列表下方添加 BetaNotice           |
| 新建 `beta-notice.tsx`                          | 复用内测提示组件                        |
| `packages/i18n/src/translations/settings/en.ts` | 新增 i18n key                           |

---

## 2. PC 端 — 关于页面添加 Discord 入口

### 决策

在 Settings → About 的"App Updates"区块下方新增 Community 卡片，含 Discord 链接按钮。

### 涉及文件

| 文件                                            | 改动                                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `about-section.tsx`                             | 新增 Community 区块                                           |
| `packages/i18n/src/translations/settings/en.ts` | 新增 `community` / `joinDiscord` / `communityDescription` key |

Discord URL: `https://discord.gg/cyBRZa9zJr`（来自 `apps/moryflow/www/src/components/landing/DownloadCTA.tsx`）。

---

## 3. PC 端 — 账户中心兑换码入口

### 决策

在积分余额区域的 "Purchase Credits" 按钮旁添加 "Redeem Code" 按钮，点击弹出兑换码 Dialog。

### 涉及文件

| 文件                                        | 改动                                   |
| ------------------------------------------- | -------------------------------------- |
| `user-profile.tsx`                          | 添加 "Redeem Code" 按钮                |
| 新建 `redeem-code-dialog.tsx`               | 兑换码 Dialog（react-hook-form + zod） |
| `lib/server/api.ts`                         | 新增 `redeemCode()`                    |
| `lib/server/types.ts`                       | 新增 `RedeemCodeResponse` 类型         |
| `lib/server/const.ts`                       | 新增 `REDEMPTION_API` 路径常量         |
| `packages/i18n/src/translations/auth/en.ts` | 新增相关 i18n key                      |

### API 契约

```
POST /api/v1/app/redemption-codes/redeem
Body: { "code": "MF-XXXX-XXXX" }

200: { "type": "credits"|"membership", "creditsAmount"?: number, "membershipTier"?: string, "membershipDays"?: number }
400: "Invalid redemption code" / "Code has expired" / "Code has reached maximum redemptions"
409: "You have already redeemed this code"
```

---

## 4. 管理后台 — 兑换码系统

### 4.1 数据库 Schema

`prisma/main/schema.prisma` 新增：

```prisma
model RedemptionCode {
  id                 String              @id @default(cuid())
  code               String              @unique
  type               RedemptionCodeType
  creditsAmount      Int?
  membershipTier     SubscriptionTier?
  membershipDays     Int?
  maxRedemptions     Int                 @default(1)
  currentRedemptions Int                 @default(0)
  expiresAt          DateTime?
  isActive           Boolean             @default(true)
  createdBy          String
  note               String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  usages             RedemptionCodeUsage[]
}

model RedemptionCodeUsage {
  id               String             @id @default(cuid())
  redemptionCodeId String
  userId           String
  redeemedAt       DateTime           @default(now())
  type             RedemptionCodeType
  creditsAmount    Int?
  membershipTier   SubscriptionTier?
  membershipDays   Int?
  redemptionCode   RedemptionCode     @relation(fields: [redemptionCodeId], references: [id])
  @@unique([redemptionCodeId, userId])
}

enum RedemptionCodeType {
  CREDITS
  MEMBERSHIP
}
```

`currentRedemptions` 定位为**原子计数缓存**，仅通过条件更新维护（**C2**），真实兑换明细以 `RedemptionCodeUsage` 表为准。

### 4.2 服务端兑换逻辑

`redeemCode(userId, code)` 事务内：

1. 查找码 → 校验 isActive、未过期（`expiresAt === null || expiresAt > now`）
2. **原子条件递增**：`updateMany({ where: { id, currentRedemptions: { lt: maxRedemptions }, isActive: true }, data: { currentRedemptions: { increment: 1 } } })`，返回 count=0 则抛 400（**C2**）
3. 创建 `RedemptionCodeUsage` → `@@unique` 约束防重，捕获 P2002 转 409。若 P2002 事务自动回滚（包括 step 2 的递增）
4. `CREDITS`：**upsert** Quota（无记录则创建，有则 increment `purchasedQuota`）+ 记录 `QuotaTransaction`（**C13**）
5. `MEMBERSHIP`：调用共享函数 `activateSubscriptionWithQuota()`（**C9**）
6. 记录 `AdminAuditLog`（**C6**）

### 4.3 共享函数：activateSubscriptionWithQuota

从 `payment.service.ts` 的 `handleSubscriptionActivated` 中提取核心逻辑为独立纯函数（**C9**），供三处复用：

- `PaymentService.handleSubscriptionActivated()`（现有支付回调）
- `AdminService.updateSubscription()`（管理员改 tier/status，Step 2 bugfix）
- `RedemptionService.redeemCode()`（会员码兑换）

文件位置：`apps/anyhunt/server/src/payment/subscription-activation.ts`（纯函数，不经过 NestJS DI，三方直接 import）。

函数签名：

```typescript
import { Prisma } from '../../generated/prisma-main/client';

export async function activateSubscriptionWithQuota(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    tier: SubscriptionTier;
    periodStart: Date;
    periodEnd: Date;
    creemCustomerId?: string;
    creemSubscriptionId?: string;
  }
): Promise<void>;
```

内部逻辑复用现有 `payment.service.ts:84-141` 的 periodChanged 判断语义：

- upsert `Subscription`（tier + ACTIVE + period + `cancelAtPeriodEnd: false`）
- Creem 字段用条件展开，**不得**在 admin/兑换场景下覆盖现有绑定为 null：`...(creemCustomerId !== undefined && { creemCustomerId })`
- upsert `Quota`（`monthlyLimit = TIER_MONTHLY_QUOTA[tier]`，仅 periodChanged 时 reset `monthlyUsed`）

另提取一个对称函数用于降级/过期：

```typescript
export async function deactivateSubscriptionToFree(
  tx: Prisma.TransactionClient,
  params: { userId: string; status: SubscriptionStatus }
): Promise<void>;
```

逻辑复用现有 `payment.service.ts` 的 `handleSubscriptionExpired`：

- upsert `Subscription`（tier=FREE + 目标 status + 新周期 + `cancelAtPeriodEnd: false`）
- upsert `Quota`（`monthlyLimit = TIER_MONTHLY_QUOTA.FREE`，`monthlyUsed = 0`）

### 4.4 修复管理员订阅更新

`AdminSubscriptionsController.updateSubscription()` 需增加 `@CurrentUser() currentUser: CurrentUserDto` 参数（**C3**），将 `actorUserId` 传入 service。

`AdminService.updateSubscription()` 签名改为 `(id, dto, actorUserId)`，全部逻辑包入 `$transaction`（**C14**）：

| dto 场景                           | 行为                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 仅 tier 变更                       | 调用 `activateSubscriptionWithQuota(tx, { tier, period })` + AuditLog                                                       |
| 仅 status → EXPIRED                | 调用 `deactivateSubscriptionToFree(tx, { status: EXPIRED })` + AuditLog                                                     |
| 仅 status → CANCELED               | `tx.subscription.update({ status: CANCELED, cancelAtPeriodEnd: true })`，不动 Quota（周期结束后自然过期） + AuditLog        |
| 仅 status → ACTIVE（无 tier 变更） | `tx.subscription.update({ status: ACTIVE, cancelAtPeriodEnd: false })`，不动 Quota + AuditLog                               |
| tier + status 同时变更             | **status 语义优先**：若 status=EXPIRED/CANCELED，按上面降级路径处理，忽略 tier 变更；若 status=ACTIVE，按 tier 变更路径处理 |

### 4.5 API 接口

管理端：

```
POST   /api/v1/admin/redemption-codes
GET    /api/v1/admin/redemption-codes
GET    /api/v1/admin/redemption-codes/:id
PATCH  /api/v1/admin/redemption-codes/:id
DELETE /api/v1/admin/redemption-codes/:id  (软停用)
```

用户端：

```
POST   /api/v1/app/redemption-codes/redeem
```

### 4.6 管理后台前端

新建 `apps/anyhunt/admin/www/src/features/redemption-codes/`，沿用 subscriptions/users 模式。

路由注册到 `admin-routes.tsx` 的 `users-billing` 分组，图标 `Ticket`。

---

## 关键实现约束

| #   | 约束                                                                                                                                          | 原因                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | 配额常量统一使用 `TIER_MONTHLY_QUOTA` from `payment.constants.ts`                                                                             | `quota.constants.ts` 的 `getMonthlyQuotaByTier('FREE')` 返回 0，而 `TIER_MONTHLY_QUOTA.FREE` 返回 100。payment.service 用后者，必须一致                |
| C2  | `currentRedemptions` 递增必须用 Prisma `updateMany` + `{ lt: maxRedemptions }` 条件，check count=0 即拒绝                                     | 防并发超卖。`currentRedemptions` 是原子计数缓存，真实明细以 usage 表为准                                                                               |
| C3  | `AdminSubscriptionsController.updateSubscription()` 和 `AdminRedemptionCodesController.createCode()` 必须加 `@CurrentUser()` 传递 actorUserId | 现有 controller 缺少身份透传，参考 `AdminUserCreditsController` 的模式                                                                                 |
| C4  | 用户端 Controller 不需要 `@UseGuards(AuthGuard)`                                                                                              | `AuthGuard` 已通过 `APP_GUARD` 全局注册。直接用 `@CurrentUser()` 取 userId                                                                             |
| C5  | `usePurchase` hook 中 toast 用硬编码英文字符串                                                                                                | 该 hook 不使用 i18n，保持一致。BetaNotice 组件中用 i18n                                                                                                |
| C6  | 兑换操作必须写入 `AdminAuditLog`（actorUserId=null, action=`CODE_REDEEM`）                                                                    | 保证所有积分/会员发放可追溯                                                                                                                            |
| C7  | 支付拦截 = hook 短路（逻辑层）+ BetaNotice 内联文案（视觉层），**不加按钮 `disabled`**                                                        | 原生 `disabled` 阻止 `onClick`，导致 toast 无法触发。保持按钮可点击，hook 短路弹 toast，BetaNotice 提供内联说明                                        |
| C8  | 会员码周期：**立即替换**，不续期叠加                                                                                                          | 新 tier + 新周期从 now 起算。通过 `activateSubscriptionWithQuota()` 的 periodChanged 语义实现。内测阶段由管理员控制码分发                              |
| C9  | 提取 `activateSubscriptionWithQuota()` + `deactivateSubscriptionToFree()` 为纯函数放在 `payment/subscription-activation.ts`                   | 三处复用同一份逻辑，避免语义漂移。纯函数不经 NestJS DI，直接 import。Creem 字段用条件展开防止覆盖                                                      |
| C10 | PC 端 API client 签名必须是 `apiClient.post(path, { body: data })`                                                                            | 现有 `createCheckout` 等函数用 `{ body: data }` 模式，不是直接传 data                                                                                  |
| C11 | 兑换码 Dialog 必须用 `react-hook-form + zod/v3`                                                                                               | 工程规范要求所有表单统一 RHF + Zod                                                                                                                     |
| C12 | DTO 校验必须包含：`creditsAmount > 0`、`membershipDays > 0`、`maxRedemptions >= 1`、`code.trim().toUpperCase()`                               | 防止无效数据入库                                                                                                                                       |
| C13 | CREDITS 兑换路径必须 **upsert** Quota 记录，不能假设已存在                                                                                    | 参考 `admin-user-credits.service.ts:78` 和 `payment.service.ts:248`，用户可能没有 Quota 行                                                             |
| C14 | `AdminService.updateSubscription()` 整体必须包入 `$transaction`，所有 `this.prisma.xxx` 改为 `tx.xxx`                                         | 现有逻辑是裸 update，加入 Quota/AuditLog 后必须事务化                                                                                                  |
| C15 | `RedemptionModule` 必须同时注册到 `app.module.ts` 和 `openapi/openapi-modules.ts`                                                             | `openapi-modules.ts` 维护 Swagger include 列表，不注册则接口不出现在 API 文档中。admin 端加入 `INTERNAL_API_MODULES`，user 端加入 `PUBLIC_API_MODULES` |

---

## 执行步骤

以下步骤按顺序逐步执行，每步完成后代码应可编译通过。

### Step 1: Prisma Schema + Migration

**目标**：新增 `RedemptionCode`、`RedemptionCodeUsage` 模型和 `RedemptionCodeType` 枚举。

**操作**：

1. 编辑 `apps/anyhunt/server/prisma/main/schema.prisma`：
   - 在 `enum` 区域新增 `RedemptionCodeType { CREDITS MEMBERSHIP }`
   - 新增 `model RedemptionCode`（含 4.1 节所有字段）
   - 新增 `model RedemptionCodeUsage`（含 `@@unique([redemptionCodeId, userId])`）
   - 在 `User` 模型中**不**添加 relation（兑换码按 code 字符串查找，不需要 User 直接关联）
2. 生成 migration：`pnpm --filter @anyhunt/anyhunt-server prisma:migrate:main`，migration 名 `add_redemption_code`
3. 生成 Prisma Client：确认 `generated/prisma-main` 中包含新类型

---

### Step 2: 提取共享函数 + 修复管理员订阅更新

**目标**：提取 `activateSubscriptionWithQuota()` 和 `deactivateSubscriptionToFree()` 共享函数；修复 `AdminService.updateSubscription()` 的配额同步 bug。

**2a. 提取共享函数**（**C9**）：

- 新建 `apps/anyhunt/server/src/payment/subscription-activation.ts`
- 导出 `activateSubscriptionWithQuota(tx: Prisma.TransactionClient, params)`：从 `payment.service.ts` 的 `handleSubscriptionActivated` 事务内核心逻辑（L84-141）搬入。Creem 字段用条件展开防覆盖
- 导出 `deactivateSubscriptionToFree(tx: Prisma.TransactionClient, params)`：从 `handleSubscriptionExpired` 逻辑搬入（tier=FREE + 目标 status + reset quota）
- `handleSubscriptionActivated` 和 `handleSubscriptionExpired` 改为调用对应函数
- 使用 `TIER_MONTHLY_QUOTA` from `payment.constants.ts`（**C1**）
- 事务客户端类型使用 `Prisma.TransactionClient`（来自 `generated/prisma-main/client`）

**2b. 修复 AdminSubscriptionsController**（**C3**）：

- 编辑 `apps/anyhunt/server/src/admin/admin-subscriptions.controller.ts`：`updateSubscription` 方法增加 `@CurrentUser() currentUser: CurrentUserDto` 参数
- 导入 `CurrentUser` from `../auth` 和 `CurrentUserDto` from `../types`
- 将 `currentUser.id` 作为 `actorUserId` 传入 service

**2c. 修复 AdminService.updateSubscription()**（**C14**）：

- 签名改为 `(id: string, dto: UpdateSubscriptionDto, actorUserId: string)`
- 整体包入 `$transaction`，所有 `this.prisma.xxx` 改为 `tx.xxx`
- 按 4.4 节的场景表实现 tier/status 组合逻辑：
  - status 语义优先：EXPIRED → `deactivateSubscriptionToFree()`；CANCELED → update `cancelAtPeriodEnd: true` 不动 Quota
  - 仅 tier 变更或 status=ACTIVE + tier 变更 → `activateSubscriptionWithQuota()`
- 每条路径都记录 `AdminAuditLog`

**2d. 补回归测试**：

- 新建 `apps/anyhunt/server/src/admin/__tests__/admin-subscription-update.spec.ts`
- 覆盖：
  - tier 变更 → Quota.monthlyLimit 同步更新
  - status → EXPIRED → tier 降为 FREE + Quota 重置
  - status → CANCELED → Quota 不变 + cancelAtPeriodEnd=true
  - tier + status=EXPIRED 同改 → status 优先，降为 FREE
  - tier 未变更时 Quota 不变
  - AuditLog 正确写入

---

### Step 3: 服务端兑换模块

**目标**：新建 `RedemptionModule`，包含服务、DTO、管理端 Controller、用户端 Controller。

**3a. DTO 文件** — 新建 `apps/anyhunt/server/src/redemption/redemption.dto.ts`（**C12**）：

- `createRedemptionCodeSchema`：
  - `type`: `z.enum(['CREDITS', 'MEMBERSHIP'])`
  - `creditsAmount`: `z.number().int().min(1).max(1_000_000).optional()`
  - `membershipTier`: `z.enum(['FREE', 'BASIC', 'PRO', 'TEAM']).optional()`
  - `membershipDays`: `z.number().int().min(1).max(365).default(30).optional()`
  - `maxRedemptions`: `z.number().int().min(1).max(100_000).default(1)`
  - `code`: `z.string().trim().toUpperCase().min(3).max(20).optional()`（空则自动生成）
  - `expiresAt`: `z.coerce.date().optional()`
  - `note`: `z.string().max(500).optional()`
  - `.refine()` 校验：CREDITS 必须有 creditsAmount；MEMBERSHIP 必须有 membershipTier + membershipDays
- `updateRedemptionCodeSchema`：maxRedemptions、expiresAt、isActive、note（均 optional）
- `redemptionCodeQuerySchema`：pagination + type filter + isActive filter
- `redeemCodeSchema`：`{ code: z.string().trim().min(1).max(20) }`

**3b. 类型文件** — 新建 `apps/anyhunt/server/src/redemption/redemption.types.ts`：

- `RedeemResult { type, creditsAmount?, membershipTier?, membershipDays? }`

**3c. 服务文件** — 新建 `apps/anyhunt/server/src/redemption/redemption.service.ts`：

- 导入 `TIER_MONTHLY_QUOTA`、`addOneMonth` from `../payment/payment.constants`（**C1**）
- 导入 `activateSubscriptionWithQuota` from `../payment/subscription-activation`（**C9**）
- `createCode(actorUserId, dto)`：校验 type 与字段匹配；若 code 为空，自动生成 `MF-XXXX-XXXX`（大写字母 + 数字随机 8 位，循环检查唯一性）；`code.trim().toUpperCase()`（**C12**）；创建记录，createdBy = actorUserId
- `listCodes()`：分页查询，含 `_count: { usages: true }`
- `getCode()`：含 usages（关联 userId + redeemedAt）
- `updateCode()`：仅更新允许的字段
- `deactivateCode()`：设 `isActive = false`
- `redeemCode(userId, code)` — 事务内逻辑：
  1. `findUnique({ where: { code: code.trim().toUpperCase() } })` 查找码，校验 isActive、未过期
  2. 原子条件递增（**C2**）：`updateMany({ where: { id, currentRedemptions: { lt: redemptionCode.maxRedemptions }, isActive: true }, data: { currentRedemptions: { increment: 1 } } })`，count=0 → 400
  3. 创建 `RedemptionCodeUsage`，捕获 P2002 → 409
  4. CREDITS 路径（**C13**）：**upsert** Quota（无记录则创建 `{ userId, monthlyLimit: TIER_MONTHLY_QUOTA.FREE, monthlyUsed: 0, periodStartAt: now, periodEndAt: addOneMonth(now), purchasedQuota: amount }`，有则 `purchasedQuota: { increment: amount }`）+ `QuotaTransaction(ADMIN_GRANT, source: PURCHASED, reason: 'Redemption code: {code}')`
  5. MEMBERSHIP 路径：`activateSubscriptionWithQuota(tx, { userId, tier, periodStart: now, periodEnd: new Date(now.getTime() + membershipDays * 86400000) })`（**C8, C9**）
  6. 创建 `AdminAuditLog`（actorUserId: null, action: `CODE_REDEEM`, targetUserId, metadata）（**C6**）

**3d. 管理端 Controller** — 新建 `apps/anyhunt/server/src/redemption/admin-redemption-codes.controller.ts`：

- `@Controller({ path: 'admin/redemption-codes', version: '1' })` + `@RequireAdmin()`
- `@Post()` createCode：`@CurrentUser() currentUser` 取 actorUserId（**C3**）
- CRUD 五个接口，使用 `ZodValidationPipe`
- `@Delete(':id')` 调用 `deactivateCode()`

**3e. 用户端 Controller** — 新建 `apps/anyhunt/server/src/redemption/redemption.controller.ts`：

- `@Controller({ path: 'app/redemption-codes', version: '1' })`
- `@Post('redeem')` + `@CurrentUser() user: CurrentUserDto` 取 userId（**C4**，全局 AuthGuard 已注册）
- 调用 `redeemCode(user.id, dto.code)`

**3f. Module** — 新建 `apps/anyhunt/server/src/redemption/redemption.module.ts`：

- providers: `RedemptionService`
- controllers: `AdminRedemptionCodesController`, `RedemptionController`
- 导出 index.ts

**3g. 注册**（**C15**）：

- 在 `apps/anyhunt/server/src/app.module.ts` 中 import `RedemptionModule`
- 在 `apps/anyhunt/server/src/openapi/openapi-modules.ts` 中：
  - import `RedemptionModule`
  - 添加到 `PUBLIC_API_MODULES`（用户端 redeem 接口）
  - 添加到 `INTERNAL_API_MODULES`（admin CRUD 接口）

**3h. 补单元测试**：

- 新建 `apps/anyhunt/server/src/redemption/__tests__/redemption.service.spec.ts`
- 覆盖场景：
  - 正常兑换 CREDITS 码 → purchasedQuota 增加 + QuotaTransaction 写入
  - CREDITS 兑换 + 用户无 Quota 记录 → 自动创建 Quota（**C13**）
  - 正常兑换 MEMBERSHIP 码 → Subscription + Quota 更新
  - 已过期码 → 400
  - 已停用码 → 400
  - 达到 maxRedemptions → 400
  - 同用户重复兑换 → 409
  - 并发兑换最后名额 → 仅一个成功（模拟 updateMany count=0）

---

### Step 4: PC 端禁用购买流程

**目标**：`usePurchase()` 短路 + 各组件展示内测提示。

**4a. 修改 `use-purchase.ts`**（`apps/moryflow/pc/src/renderer/lib/server/hooks/use-purchase.ts`）：

- `purchase()` 函数开头直接 `toast.info('Purchasing is not available during beta. Join our Discord for redemption codes!')` + `return null`（**C5**，硬编码英文，与 hook 现有风格一致）
- 由于不再实际购买，`setPurchasingId` / `setCheckoutUrl` 逻辑不再触发

**4b. 新增 i18n key**（`packages/i18n/src/translations/settings/en.ts`）：

- `betaNoticePrefix: 'Purchasing is not available during beta. Join our '`
- `betaNoticeLinkText: 'Discord'`
- `betaNoticeSuffix: ' for redemption codes!'`
- `community: 'Community'`
- `joinDiscord: 'Join Discord'`
- `communityDescription: 'Get support, share feedback, and connect with other users.'`

**4c. 创建复用的 BetaNotice 组件**（`apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/beta-notice.tsx`）：

- 使用 `useTranslation('settings')` 取 i18n key
- 渲染 `text-xs text-muted-foreground` 文案
- "Discord" 为 `text-primary cursor-pointer hover:underline` 的 `<button>`
- 点击调用 `window.desktopAPI.membership.openExternal('https://discord.gg/cyBRZa9zJr')`

**4d. 在 `user-profile.tsx` 中**：

- 积分余额区域：在 "Purchase Credits" 按钮下方放 `<BetaNotice />`
- 会员权益区域：在 "Upgrade" 按钮下方放 `<BetaNotice />`

**4e. 在 `subscription-dialog.tsx` 中**：

- 套餐卡片列表下方放 `<BetaNotice />`（**C7**，不加 disabled，hook 短路 + BetaNotice 双重提示）

**4f. 在 `credit-packs-dialog.tsx` 中**：

- 积分包列表下方放 `<BetaNotice />`（**C7**）

---

### Step 5: PC 端关于页面 Discord 入口

**目标**：About 页面新增 Community 区块。

**操作**：编辑 `apps/moryflow/pc/src/renderer/components/settings-dialog/components/about-section.tsx`：

- 在最后一个 `div.space-y-3.rounded-xl` 下方新增同样结构的 Community 区块
- 使用 `MessageSquare`（lucide-react）图标
- 按钮调用 `window.desktopAPI.membership.openExternal('https://discord.gg/cyBRZa9zJr')`
- 使用 Step 4b 中已添加的 i18n key

---

### Step 6: PC 端兑换码 Dialog

**目标**：账户中心添加兑换码兑换功能。

**6a. 新增路径常量**（`apps/moryflow/pc/src/renderer/lib/server/const.ts`）：

- `REDEMPTION_API = { REDEEM: '/api/v1/app/redemption-codes/redeem' } as const`（内测专用路径，无需动 `@moryflow/api` 共享包）

**6b. 新增 API 方法**（`apps/moryflow/pc/src/renderer/lib/server/api.ts`）（**C10**）：

```typescript
export async function redeemCode(data: { code: string }): Promise<RedeemCodeResponse> {
  return apiClient.post<RedeemCodeResponse>(REDEMPTION_API.REDEEM, { body: data });
}
```

- 在 `types.ts` 中添加 `RedeemCodeResponse` 类型

**6c. 新增 i18n key**（`packages/i18n/src/translations/auth/en.ts`）：

- `redeemCode: 'Redeem Code'`
- `enterRedemptionCode: 'Enter your redemption code'`
- `redeem: 'Redeem'`
- `redeeming: 'Redeeming...'`
- `redeemSuccess: 'Code redeemed successfully!'`
- `receivedCredits: 'You received {{amount}} credits'`
- `receivedMembership: 'You received {{tier}} membership for {{days}} days'`

**6d. 新建 `redeem-code-dialog.tsx`**（**C11**）：

- 路径：`apps/moryflow/pc/src/renderer/components/settings-dialog/components/account/redeem-code-dialog.tsx`
- props: `open`, `onOpenChange`
- 使用 `react-hook-form` + `zodResolver` + zod schema `{ code: z.string().min(1) }`
- 提交：调用 `redeemCode({ code })` → 成功时 toast.success + `auth.refresh()` + 关闭 + form.reset()；失败时 toast.error(error.message)
- UI：Dialog + Form + Input + Cancel/Redeem 按钮

**6e. 修改 `user-profile.tsx`**：

- import `RedeemCodeDialog`
- 在 "Purchase Credits" 按钮旁添加 "Redeem Code" 按钮（`Gift` icon from lucide）
- 管理 `redeemCodeOpen` 状态
- 底部挂载 `<RedeemCodeDialog open={redeemCodeOpen} onOpenChange={setRedeemCodeOpen} />`

---

### Step 7: 管理后台前端兑换码页面

**目标**：Admin 后台新增兑换码管理 CRUD 页面。

**7a. API 路径**（`apps/anyhunt/admin/www/src/lib/api-paths.ts`）：

- 新增 `REDEMPTION_CODES: '/api/v1/admin/redemption-codes'`

**7b. Feature 目录** — 新建 `apps/anyhunt/admin/www/src/features/redemption-codes/`：

- `types.ts`：`RedemptionCode`、`RedemptionCodeUsage`、`CreateRedemptionCodeRequest`、`UpdateRedemptionCodeRequest`、`RedemptionCodeQuery` 类型定义
- `api.ts`：`getRedemptionCodes(query)`、`getRedemptionCode(id)`、`createRedemptionCode(data)`、`updateRedemptionCode(id, data)`、`deleteRedemptionCode(id)`，使用 `apiClient` + `ADMIN_API.REDEMPTION_CODES`
- `hooks.ts`：React Query hooks — `useRedemptionCodes`、`useRedemptionCode`、`useCreateRedemptionCode`、`useUpdateRedemptionCode`、`useDeleteRedemptionCode`，query key factory `redemptionCodeKeys`
- `schemas.ts`：`createRedemptionCodeSchema`、`updateRedemptionCodeSchema`（`zod/v3`）
- `constants.ts`：`CODE_TYPE_OPTIONS`、`CODE_TYPE_BADGE_VARIANTS`、`MEMBERSHIP_TIER_OPTIONS`
- `components/RedemptionCodeTable.tsx`：列表表格（code、type、usage count/max、status badge、创建时间、操作按钮）
- `components/CreateRedemptionCodeDialog.tsx`：创建表单（type select → 动态显示 creditsAmount 或 tier+days；maxRedemptions、expiresAt、code(optional)、note）
- `components/RedemptionCodeDetailSheet.tsx`：详情侧栏（码信息 + usages 列表）
- `components/EditRedemptionCodeDialog.tsx`：编辑表单（maxRedemptions、expiresAt、isActive、note）
- `index.ts`：统一导出

**7c. Page** — 新建 `apps/anyhunt/admin/www/src/pages/RedemptionCodesPage.tsx`：

- 使用 `PageHeader` + `usePagedSearchQuery` + feature hooks
- 表格 + 创建按钮 + 详情 Sheet + 编辑 Dialog

**7d. 路由注册**（`apps/anyhunt/admin/www/src/app/admin-routes.tsx`）：

- 导入 `Ticket` from lucide-react
- lazy import `RedemptionCodesPage`
- 添加到 `ADMIN_PROTECTED_ROUTES`：`{ id: 'redemption-codes', path: 'redemption-codes', component: RedemptionCodesPage, nav: { groupId: 'users-billing', path: '/redemption-codes', label: 'Redemption Codes', icon: Ticket } }`

---

### 验证清单

每步完成后检查：

**编译检查**：

- [ ] TypeScript 编译通过（`pnpm tsc --noEmit` 对应 package）
- [ ] Step 1 后：Prisma Client 生成成功，新类型可导入

**测试覆盖**（按仓库规范：新功能补单测，bug 修复补回归）：

- [ ] Step 2：`admin-subscription-update.spec.ts` — tier 变更同步 Quota、status→EXPIRED 降为 FREE + 重置 Quota、status→CANCELED 不动 Quota + cancelAtPeriodEnd、tier+status=EXPIRED 同改 status 优先
- [ ] Step 3：`redemption.service.spec.ts` — 正常兑换 CREDITS/MEMBERSHIP、CREDITS 无 Quota 记录自动创建、过期码、停用码、超限、重复兑换、并发最后名额

**功能验证**：

- [ ] Step 2 后：admin updateSubscription 各场景 Quota 同步正确
- [ ] Step 3 后：服务端模块注册正确，Controller 路由可访问，OpenAPI 文档包含新接口
- [ ] Step 4-6 后：PC 端编译通过；购买按钮点击弹 toast 不触发 checkout；BetaNotice Discord 可点击跳转；兑换码 Dialog 可打开提交
- [ ] Step 7 后：Admin 前端编译通过，兑换码页面可渲染
