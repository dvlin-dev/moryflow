# Moryflow Server 原生兑换码系统

> 状态：**draft** — 待审查。

## 前因后果

### 背景

Moryflow 处于内测阶段，真实支付（Creem checkout）已在 PC app 中禁用。用户通过管理员创建的兑换码获取会员和积分。

### 已完成的工作

PR #235 已合并到 main，包含：

- **PC app**：购买按钮短路 + BetaNotice 内联提示 + Discord 入口 + 兑换码 Dialog（全部完成）
- **Admin 前端**（`apps/anyhunt/admin/www`）：兑换码 CRUD 管理页面（需要小幅改造，见下文）
- **Anyhunt server**：完整兑换码系统（Schema + Service + Controllers），操作 anyhunt DB 的 Quota/Subscription（保留不动）
- **Moryflow server**：当前有一个**代理模块**（转发到 anyhunt server），架构错误需要替换

### 问题

Moryflow server 和 Anyhunt server 是**独立的数据库、独立的 auth 域**：

- Moryflow 用户的会员/积分数据在 moryflow DB：`Subscription`（tier: `free/starter/basic/pro`）、`SubscriptionCredits`、`PurchasedCredits`、`CreditDebt`
- Anyhunt 的 Quota/QuotaTransaction 是 anyhunt DB 的数据，跟 moryflow 用户没关系
- PC app 认证在 moryflow server，access token 在 anyhunt server 不可用

当前代理方案即使调通，兑换也只会更新 anyhunt DB，moryflow 用户实际可用的积分和会员不会变。

### 目标

1. 把 moryflow server 的代理模块替换为**原生兑换服务**，直接操作 moryflow DB
2. Admin 前端消除硬编码的后端契约（tier 选项、分页模型），改为**后端驱动**，使同一套前端同时适配 anyhunt 和 moryflow 部署
3. 不打补丁、不做半成品、不留历史包袱

---

## 改动范围

| 区域                      | 改动                                               |
| ------------------------- | -------------------------------------------------- |
| `apps/moryflow/server/`   | 替换代理为原生服务 + Prisma Schema + Admin CRUD    |
| `apps/anyhunt/admin/www/` | tier 选项改为后端驱动、分页模型对齐、HTTP 方法对齐 |
| `apps/anyhunt/server/`    | 添加 config 端点（返回 tier 选项）                 |
| PC app                    | 无改动                                             |
| i18n                      | 无改动                                             |

---

## 关键上下文（给执行者）

### moryflow server 的数据模型

```
SubscriptionTier: free | starter | basic | pro （lowercase，Prisma enum）
SubscriptionStatus: active | canceled | expired | unpaid | trialing | paused

model Subscription {
  id, userId(unique), tier, status, creemSubscriptionId?, creemCustomerId?,
  productId?, currentPeriodStart?, currentPeriodEnd?, cancelAtPeriodEnd
}

model SubscriptionCredits {
  userId(PK), creditsRemaining, creditsTotal, periodStart, periodEnd
}

model PurchasedCredits {
  id, userId, amount, remaining, orderId?, purchasedAt, expiresAt
}
```

### anyhunt server 的数据模型（对比）

```
SubscriptionTier: FREE | BASIC | PRO | TEAM （UPPERCASE，Prisma enum）
```

### 积分体系（CreditService，`apps/moryflow/server/src/credit/credit.service.ts`）

- `grantSubscriptionCredits(userId, amount, periodStart, periodEnd, tx?)` — upsert SubscriptionCredits，支持事务
- `grantPurchasedCredits(userId, amount, orderId?, expiresAt?, tx?)` — 创建 PurchasedCredits 记录（默认 365 天过期），支持事务

### Tier → 月度积分映射（`config/pricing.config.ts`）

```typescript
TIER_CREDITS = { free: 0, starter: 5000, basic: 10000, pro: 20000 };
```

### moryflow server 的代码模式

**Admin Guard**：`@UseGuards(AdminGuard)` 从 `'../common/guards'` 导入

**DTO 验证**：Zod `safeParse` + 手动 `throw BadRequestException`，不用 ZodValidationPipe

**活动日志**：`ActivityLogService.logAdminAction({ operatorId, action, targetUserId?, details })`，失败不阻断业务

**分页**：moryflow admin 现有模式用 `offset/limit`，但 admin 前端用 `page/limit`

---

## 设计决策

### D1: tier 选项由后端提供

**问题**：admin 前端 `MEMBERSHIP_TIER_OPTIONS` 硬编码了 `BASIC/PRO/TEAM`（anyhunt tier），moryflow 的 tier 是 `free/starter/basic/pro`。同一套前端部署到两个后端时 tier 不兼容。

**决策**：

- 两个 server 各添加 `GET /api/v1/admin/redemption-codes/config` 端点，返回 `{ tiers: [{ value, label }] }`
- Admin 前端删除 `MEMBERSHIP_TIER_OPTIONS` 常量，改为从 config 端点获取
- 服务端 DTO 不用 `z.enum()` 硬编码 tier 值，改为运行时校验

### D2: API 契约统一

**问题**：admin 前端是为 anyhunt server 设计的，moryflow server 需要完全兼容其 API 契约。

**决策**：moryflow server 的兑换端点完全对齐 admin 前端的期望：

- 分页：`page/limit`（不是 `offset/limit`），响应格式 `{ items: [...], pagination: { page, limit, total, totalPages } }`
- HTTP 方法：列表 `GET`、创建 `POST`、更新 `PATCH`（不是 `PUT`）、删除 `DELETE`
- 响应字段名：`items`（不是 `users` 或 `codes`）

### D3: 返回值类型大小写

**问题**：`RedemptionCodeType` 枚举是 `CREDITS | MEMBERSHIP`（UPPERCASE），但 `membershipTier` 存的是 `basic`（lowercase）。admin 前端和 PC app 都依赖这些值做条件分支。

**决策**：保持 Prisma 枚举原样返回。`type` 字段返回 UPPERCASE（`CREDITS`/`MEMBERSHIP`），`membershipTier` 返回 lowercase（`basic`/`pro`）。前端已经按这个契约工作。

---

## 执行步骤

### Step 1: Prisma Schema + Migration

编辑 `apps/moryflow/server/prisma/schema.prisma`，在文件末尾添加：

```prisma
enum RedemptionCodeType {
  CREDITS
  MEMBERSHIP
}

model RedemptionCode {
  id                 String             @id @default(cuid())
  code               String             @unique
  type               RedemptionCodeType
  creditsAmount      Int?
  membershipTier     SubscriptionTier?  // free/starter/basic/pro
  membershipDays     Int?
  maxRedemptions     Int                @default(1)
  currentRedemptions Int                @default(0)
  expiresAt          DateTime?
  isActive           Boolean            @default(true)
  createdBy          String
  note               String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  usages             RedemptionCodeUsage[]
  @@index([isActive])
  @@index([createdAt])
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
  @@index([userId])
  @@index([redeemedAt])
}
```

生成 Prisma Client：`pnpm --filter @moryflow/server prisma:generate`

生成 Migration（需要数据库连接时执行）。

---

### Step 2: 替换代理模块为原生兑换服务

目录：`apps/moryflow/server/src/redemption/`

**删除**：

- `redemption-proxy.controller.ts`
- `redemption-proxy.service.ts`

**新建 `redemption.dto.ts`**：

```typescript
import { z } from 'zod';

export const createRedemptionCodeSchema = z
  .object({
    type: z.enum(['CREDITS', 'MEMBERSHIP']),
    creditsAmount: z.number().int().min(1).max(1_000_000).optional(),
    membershipTier: z.string().min(1).optional(), // 运行时校验，不硬编码 enum
    membershipDays: z.number().int().min(1).max(365).optional().default(30),
    maxRedemptions: z.number().int().min(1).max(100_000).optional().default(1),
    code: z.string().trim().toUpperCase().min(3).max(20).optional(),
    expiresAt: z.coerce.date().optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'CREDITS')
        return data.creditsAmount !== undefined && data.creditsAmount > 0;
      if (data.type === 'MEMBERSHIP') return !!data.membershipTier && !!data.membershipDays;
      return true;
    },
    {
      message:
        'CREDITS requires creditsAmount; MEMBERSHIP requires membershipTier and membershipDays',
    }
  );

export const updateRedemptionCodeSchema = z.object({
  maxRedemptions: z.number().int().min(1).max(100_000).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export const redemptionCodeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['CREDITS', 'MEMBERSHIP']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const redeemCodeSchema = z.object({
  code: z.string().trim().min(1).max(20),
});
```

注意：

- `membershipTier` 用 `z.string()` 而非 `z.enum()`，运行时在 service 中校验是否在 `TIER_CREDITS` 允许范围内
- 分页用 `page/limit`（对齐 admin 前端），不用 `offset/limit`

**新建 `redemption.service.ts`**：

注入 `PrismaService`、`CreditService`、`ActivityLogService`。

导入 `TIER_CREDITS` from `'../config'`。

```typescript
// 运行时校验 tier 是否合法
private readonly VALID_TIERS = Object.keys(TIER_CREDITS).filter(t => t !== 'free');

private validateTier(tier: string): void {
  if (!this.VALID_TIERS.includes(tier)) {
    throw new BadRequestException(`Invalid membership tier: ${tier}. Valid: ${this.VALID_TIERS.join(', ')}`);
  }
}
```

核心方法：

- **`getConfig()`** — 返回 `{ tiers: VALID_TIERS.map(t => ({ value: t, label: capitalize(t) })) }`
- **`createCode(actorUserId, dto)`** — MEMBERSHIP 类型先 `validateTier(dto.membershipTier)`；自动生成 `MF-XXXX-XXXX` 码（若未提供）；P2002 捕获返回 ConflictException
- **`listCodes(query)`** — `page/limit` 分页，返回 `{ items, pagination: { page, limit, total, totalPages } }`；含 `_count: { usages: true }`
- **`getCode(id)`** — 含 usages（select `id, userId, redeemedAt, type, creditsAmount, membershipTier, membershipDays`），404 if not found
- **`updateCode(id, dto)`** — 仅更新提供的字段
- **`deactivateCode(id)`** — `isActive = false`
- **`redeemCode(userId, code)`** — `prisma.$transaction` 内：
  1. 查找码，校验 isActive + 未过期（`expiresAt === null || expiresAt > now`）
  2. 原子递增：`updateMany({ where: { id, currentRedemptions: { lt: maxRedemptions }, isActive: true }, data: { currentRedemptions: { increment: 1 } } })`，count=0 → BadRequestException
  3. 创建 RedemptionCodeUsage，P2002 → ConflictException
  4. **CREDITS**：`creditService.grantPurchasedCredits(userId, amount, undefined, undefined, tx)`
  5. **MEMBERSHIP**：
     - `tx.subscription.upsert({ where: { userId }, create: { userId, tier, status: 'active', currentPeriodStart: now, currentPeriodEnd }, update: { tier, status: 'active', currentPeriodStart: now, currentPeriodEnd } })`
     - `creditService.grantSubscriptionCredits(userId, TIER_CREDITS[tier], now, periodEnd, tx)`
  6. `activityLogService.logAdminAction(...)` — 在 try/catch 中，失败只 log
  7. 返回 `{ type, creditsAmount?, membershipTier?, membershipDays? }`

**新建 `redemption.controller.ts`** — 用户端（`/api/v1/app/redemption-codes/redeem`）：

```typescript
@Controller({ path: 'app/redemption-codes', version: '1' })
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redeem')
  async redeemCode(@CurrentUser() user: CurrentUserDto, @Body() body: unknown) {
    const parsed = redeemCodeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return this.redemptionService.redeemCode(user.id, parsed.data.code);
  }
}
```

**新建 `admin-redemption-codes.controller.ts`** — 管理端（`/api/v1/admin/redemption-codes/*`）：

```typescript
@ApiTags('Admin - Redemption Codes')
@ApiBearerAuth()
@Controller({ path: 'admin/redemption-codes', version: '1' })
@UseGuards(AdminGuard)
export class AdminRedemptionCodesController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Get('config')
  getConfig() {
    return this.redemptionService.getConfig();
  }

  @Post()
  createCode(@CurrentUser() user: CurrentUserDto, @Body() body: unknown) {
    // safeParse + validate
    return this.redemptionService.createCode(user.id, parsed.data);
  }

  @Get()
  listCodes(@Query() query: unknown) {
    // safeParse redemptionCodeQuerySchema
    return this.redemptionService.listCodes(parsed.data);
  }

  @Get(':id')
  getCode(@Param('id') id: string) {
    return this.redemptionService.getCode(id);
  }

  @Patch(':id') // PATCH 不是 PUT！
  updateCode(@Param('id') id: string, @Body() body: unknown) {
    // safeParse updateRedemptionCodeSchema
    return this.redemptionService.updateCode(id, parsed.data);
  }

  @Delete(':id')
  deactivateCode(@Param('id') id: string) {
    return this.redemptionService.deactivateCode(id);
  }
}
```

**修改 `redemption.module.ts`**：

```typescript
import { Module } from '@nestjs/common';
import { CreditModule } from '../credit';
import { PrismaModule } from '../prisma';
import { ActivityLogModule } from '../activity-log';
import { RedemptionService } from './redemption.service';
import { RedemptionController } from './redemption.controller';
import { AdminRedemptionCodesController } from './admin-redemption-codes.controller';

@Module({
  imports: [CreditModule, PrismaModule, ActivityLogModule],
  controllers: [RedemptionController, AdminRedemptionCodesController],
  providers: [RedemptionService],
})
export class RedemptionModule {}
```

---

### Step 3: Anyhunt server 添加 config 端点

编辑 `apps/anyhunt/server/src/redemption/admin-redemption-codes.controller.ts`：

新增端点 `GET /api/v1/admin/redemption-codes/config`（放在 `:id` 路由之前）：

```typescript
@Get('config')
@ApiOperation({ summary: 'Get redemption code configuration' })
getConfig() {
  return {
    tiers: [
      { value: 'BASIC', label: 'Basic' },
      { value: 'PRO', label: 'Pro' },
      { value: 'TEAM', label: 'Team' },
    ],
  };
}
```

---

### Step 4: Admin 前端改造

改动 `apps/anyhunt/admin/www/src/features/redemption-codes/`：

**4a. 删除硬编码 tier 常量**

编辑 `constants.ts`：删除 `MEMBERSHIP_TIER_OPTIONS`。

**4b. 修改 `schemas.ts` 的 `membershipTier` 约束**

`createRedemptionCodeSchema` 中的 `membershipTier` 从 `z.enum(['FREE', 'BASIC', 'PRO', 'TEAM'])` 改为 `z.string().min(1).optional()`。tier 值由后端 config 端点驱动，前端不再硬编码校验。

**4c. 添加 config API 和 hook**

编辑 `api.ts`：新增 `getRedemptionCodeConfig()` 函数，调用 `GET /api/v1/admin/redemption-codes/config`。

编辑 `hooks.ts`：新增 `useRedemptionCodeConfig()` hook，query key `redemptionCodeKeys.config()`。

**4d. 改造 CreateRedemptionCodeDialog**

编辑 `components/CreateRedemptionCodeDialog.tsx`：

- 调用 `useRedemptionCodeConfig()` 获取 tier 列表
- tier 下拉框用接口返回的 `tiers` 数据渲染（而非硬编码常量）
- 移除 `MEMBERSHIP_TIER_OPTIONS` import

**4e. 更新 index.ts 导出**

移除 `MEMBERSHIP_TIER_OPTIONS` 导出（如果有的话）。

---

### Step 5: 注册 + 验证

**moryflow server**：

- `app.module.ts` — RedemptionModule 已注册（保持）
- `main.ts` — 已在 `PUBLIC_API_MODULES`（保持）；将 `RedemptionModule` 加入 `INTERNAL_API_MODULES`（admin 端点需要出现在内部 OpenAPI 文档中）
- 检查 `ActivityLogModule` 是否可被 `RedemptionModule` 导入（若是全局模块则无需；否则需要在 RedemptionModule 的 imports 中添加或在 app.module 中确保可用）

**本地验证（必须在推送前全部通过）**：

1. `pnpm --filter @moryflow/server prisma:generate` — Prisma Client 包含新类型
2. `pnpm --filter @moryflow/server exec tsc --noEmit` — 编译通过
3. `pnpm --filter @moryflow/server lint` — 0 errors
4. `pnpm --filter @anyhunt/anyhunt-server exec tsc --noEmit` — anyhunt config 端点编译通过
5. `pnpm --filter @anyhunt/anyhunt-server lint` — 0 errors
6. `pnpm --filter @anyhunt/admin build` — admin 前端构建通过（验证 tier 改造不破坏构建）
7. 完整 pre-commit hooks 通过

---

## 不动的部分

| 区域                    | 原因                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| PC app                  | `redeemCode` API 已指向 `apiClient`（moryflow server），路径 `/api/v1/app/redemption-codes/redeem` 不变 |
| Anyhunt server 兑换模块 | 独立系统，保留不动。仅新增 config 端点                                                                  |
| i18n                    | 已添加完毕                                                                                              |

---

## 关键注意事项

1. **SubscriptionTier 是 lowercase**：moryflow 用 `free/starter/basic/pro`，anyhunt 用 `FREE/BASIC/PRO/TEAM`。moryflow DTO 用 `z.string()` + 运行时校验，不硬编码 enum
2. **CreditService 接受 tx 参数**：兑换事务内调用 `grantPurchasedCredits` 和 `grantSubscriptionCredits` 时必须传入 `tx`，保证原子性
3. **DTO 验证用 safeParse**：moryflow server 不用 ZodValidationPipe，用 `schema.safeParse(body)` + `BadRequestException`（与现有 `AdminController` 一致）
4. **ActivityLog 不能阻断业务**：日志记录放在 try/catch 中，失败只 log 不抛
5. **分页对齐 admin 前端**：`page/limit` 入参，`{ items, pagination: { page, limit, total, totalPages } }` 响应
6. **HTTP 方法对齐**：更新用 `@Patch()`（不是 `@Put()`），与 admin 前端 `apiClient.patch()` 匹配
7. **config 端点路径 `GET config` 必须放在 `GET :id` 之前**：否则 NestJS 会把 `config` 当作 `:id` 参数
8. **返回值大小写**：`type` 字段 UPPERCASE（`CREDITS`/`MEMBERSHIP`，Prisma enum 原样）；`membershipTier` lowercase（`basic`/`pro`，moryflow Prisma enum 原样）
9. **admin 前端 `ACTIVE_STATUS_OPTIONS` 的 "All" 值是 `'all'`**（不是空字符串），已在 PR #235 中修复
10. **Delete 端点不加 `@HttpCode(204)`**：admin 前端 `apiClient.del()` 会解析响应体，204 无 body 会导致 JSON.parse 失败。保持 NestJS 默认 200
11. **admin 前端 `schemas.ts` 的 `membershipTier` 必须改为 `z.string()`**：原来是 `z.enum(['FREE', 'BASIC', 'PRO', 'TEAM'])`，moryflow 的 lowercase tier 值会被拒绝
12. **`expiresAt` 前后端兼容**：admin 前端 `handleUpdate` 已将空字符串转为 `null` 再发送。moryflow server DTO 用 `z.coerce.date().nullable().optional()` 接收——`null` 会通过 nullable，非空字符串会被 coerce 为 Date
