# Memory SaaS Platform - 项目改造计划

## 项目概述

将现有的 Memory Server 项目改造为一个独立的 SaaS 平台，类似于 [mem0.ai](https://mem0.ai)。

**核心目标：**
- 独立的用户系统（注册、登录）
- API Key 管理（创建、吊销、权限控制）
- 用量统计与配额管理
- 支付集成（订阅 + 按量计费）
- 可作为独立 SaaS 运营
- 完全开源，其他人可以自部署

---

## 定价方案

参考 [mem0.ai/pricing](https://mem0.ai/pricing)，我们采用简化的三层定价：

| Plan | 价格 | Memories | API 调用/月 | End Users | 特性 |
|------|------|----------|------------|-----------|------|
| **Free** | $0 | 10,000 | 1,000 | Unlimited | 全部功能, 社区支持 |
| **Hobby** | $19/月 | 50,000 | 5,000 | Unlimited | 全部功能, 社区支持 |
| **Enterprise** | 按量计费 | Unlimited | Unlimited | Unlimited | 全部功能 + 技术支持 + 定制功能 |

**计费维度：**
- **Memories 存储数量** - 当前存储的 Memory 总数
- **API 调用次数** - 每月 API 请求总数

Enterprise 按量计费，具体价格联系销售。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | NestJS 11 | TypeScript, 模块化架构 |
| 数据库 | PostgreSQL | 关系型数据 + pgvector 向量扩展 |
| ORM | Prisma 7 | 类型安全的数据库访问 |
| 缓存 | Redis | API Key 缓存, 并发控制, 速率限制 |
| 队列 | BullMQ | 异步任务处理 |
| 认证 | Better Auth | Email/Password, OTP, OAuth |
| 前端框架 | React 19 | React Router v7 |
| UI 库 | shadcn/ui | Radix UI + Tailwind CSS 4 |
| 状态管理 | Zustand + React Query | 客户端/服务端状态分离 |
| 支付 | Creem.io | 订阅 + 按量计费 |
| 邮件 | Resend | OTP, 通知邮件 |
| 向量模型 | OpenAI / Aliyun | text-embedding 模型 |

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory SaaS Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户层                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │    WWW    │  │  Console  │  │   Admin   │  │  API 调用  │    │
│  │   官网    │  │ 用户Dashboard│ │  管理后台  │  │  (API Key) │    │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘    │
│        │              │              │              │           │
│  ──────┴──────────────┴──────────────┴──────────────┴───────   │
│                              │                                  │
│  API 层                      ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NestJS Server                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  平台模块                    核心模块                      │   │
│  │  ├─ Auth (认证)             ├─ Memory (记忆)              │   │
│  │  ├─ ApiKey (密钥管理)        ├─ Entity (实体)              │   │
│  │  ├─ Subscription (订阅)     ├─ Relation (关系)            │   │
│  │  ├─ Quota (配额检查)         ├─ Graph (图谱)               │   │
│  │  ├─ Usage (用量记录)         ├─ Extract (抽取)             │   │
│  │  ├─ Payment (支付)          └─ Embedding (向量)           │   │
│  │  ├─ User (用户)                                          │   │
│  │  └─ Admin (管理)                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  数据层                       ▼                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │   BullMQ     │          │
│  │  + pgvector  │  │    缓存      │  │    队列      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据模型

```
┌─────────────────────────────────────────────────────────────────┐
│  平台层 (复用 linksnap)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User (平台用户)                                                 │
│  ├─ id: string (cuid)                                          │
│  ├─ email: string (unique)                                     │
│  ├─ name: string?                                              │
│  ├─ emailVerified: boolean                                     │
│  ├─ isAdmin: boolean                                           │
│  └─ createdAt, updatedAt, deletedAt                            │
│                                                                 │
│  Session (会话)                                                  │
│  ├─ id, token, userId, expiresAt                               │
│  └─ ipAddress, userAgent                                       │
│                                                                 │
│  ApiKey (API 密钥)                                              │
│  ├─ id: string                                                 │
│  ├─ name: string (用户自定义名称)                               │
│  ├─ keyPrefix: string (显示用, 如 mm_abc...)                   │
│  ├─ keyHash: string (SHA256 存储)                              │
│  ├─ userId: string → User                                      │
│  ├─ isActive: boolean                                          │
│  ├─ expiresAt: datetime?                                       │
│  └─ lastUsedAt: datetime?                                      │
│                                                                 │
│  Subscription (订阅)                                            │
│  ├─ id, orderId                                                │
│  ├─ tier: FREE | HOBBY | ENTERPRISE                            │
│  ├─ status: ACTIVE | CANCELED | PAST_DUE | EXPIRED             │
│  ├─ periodStartAt, periodEndAt                                 │
│  └─ 支付平台集成字段 (creemCustomerId, creemSubscriptionId)      │
│                                                                 │
│  Quota (配额) - 仅 FREE/HOBBY 使用                               │
│  ├─ userId                                                     │
│  ├─ monthlyApiLimit, monthlyApiUsed                            │
│  └─ periodStartAt, periodEndAt                                 │
│                                                                 │
│  UsageRecord (用量记录) - Enterprise 按量计费                    │
│  ├─ userId                                                     │
│  ├─ type: MEMORY | API_CALL                                    │
│  ├─ quantity: int                                              │
│  └─ billingPeriod, createdAt                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  核心层 (迁移自 Memory Server)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Memory (记忆)                                                   │
│  ├─ id: uuid                                                   │
│  ├─ apiKeyId: string → ApiKey (数据隔离)                        │
│  ├─ userId: string (调用方的用户ID, 非平台用户)                  │
│  ├─ content: text                                              │
│  ├─ embedding: vector(1024)                                    │
│  ├─ metadata: jsonb                                            │
│  └─ agentId, sessionId (可选)                                  │
│                                                                 │
│  Entity (实体)                                                   │
│  ├─ id: uuid                                                   │
│  ├─ apiKeyId: string → ApiKey                                  │
│  ├─ userId: string                                             │
│  ├─ name, type, description                                    │
│  └─ embedding: vector(1024)                                    │
│                                                                 │
│  Relation (关系)                                                │
│  ├─ id: uuid                                                   │
│  ├─ apiKeyId: string → ApiKey                                  │
│  ├─ userId: string                                             │
│  ├─ sourceId → Entity                                          │
│  ├─ targetId → Entity                                          │
│  └─ type, description                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 配额系统设计

### 模块划分 (单一职责)

```
apps/server/src/
├── subscription/              # 订阅模块 (管理用户订阅状态)
│   ├── subscription.service.ts
│   ├── subscription.controller.ts
│   └── subscription.constants.ts
├── quota/                     # 配额模块 (检查和管理配额)
│   ├── quota.service.ts
│   ├── quota.constants.ts
│   └── quota.guard.ts
├── usage/                     # 用量模块 (记录用量，用于 Enterprise 计费)
│   ├── usage.service.ts
│   └── usage.controller.ts
└── billing/                   # 计费模块 (处理 Enterprise 按量计费)
    ├── billing.service.ts
    └── billing.constants.ts
```

### 订阅层级配置 (分离关注点)

```typescript
// apps/server/src/subscription/subscription.constants.ts

export enum SubscriptionTier {
  FREE = 'FREE',
  HOBBY = 'HOBBY',
  ENTERPRISE = 'ENTERPRISE',
}

// 订阅价格配置
export const TIER_PRICING = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.HOBBY]: 19,        // $19/月
  [SubscriptionTier.ENTERPRISE]: null, // 按量计费
};
```

```typescript
// apps/server/src/quota/quota.constants.ts

// 配额限制配置 (单一职责: 只管理限制)
export const TIER_LIMITS = {
  [SubscriptionTier.FREE]: {
    memories: 10000,               // Memory 存储上限
    monthlyApiCalls: 1000,         // 每月 API 调用次数
    rateLimitPerMinute: 30,        // 每分钟请求限制
  },
  [SubscriptionTier.HOBBY]: {
    memories: 50000,
    monthlyApiCalls: 5000,
    rateLimitPerMinute: 60,
  },
  [SubscriptionTier.ENTERPRISE]: {
    memories: -1,                   // 无限制 (-1)
    monthlyApiCalls: -1,
    rateLimitPerMinute: 300,
  },
};

// 功能开关配置 (单一职责: 只管理功能权限)
export const TIER_FEATURES = {
  [SubscriptionTier.FREE]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: false,
    customFeatures: false,
  },
  [SubscriptionTier.HOBBY]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: false,
    customFeatures: false,
  },
  [SubscriptionTier.ENTERPRISE]: {
    graphMemory: true,
    advancedAnalytics: true,
    auditLogs: true,
    techSupport: true,
    customFeatures: true,
  },
};
```

### 服务层设计 (单一职责)

```typescript
// apps/server/src/subscription/subscription.service.ts
// 职责: 管理用户订阅状态

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string): Promise<Subscription> {
    return this.prisma.subscription.findUnique({
      where: { userId },
    });
  }

  async getTier(userId: string): Promise<SubscriptionTier> {
    const sub = await this.getSubscription(userId);
    return sub?.tier ?? SubscriptionTier.FREE;
  }

  async isEnterprise(userId: string): Promise<boolean> {
    const tier = await this.getTier(userId);
    return tier === SubscriptionTier.ENTERPRISE;
  }
}
```

```typescript
// apps/server/src/quota/quota.service.ts
// 职责: 检查配额是否允许操作

@Injectable()
export class QuotaService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async checkMemoryQuota(userId: string, quantity: number = 1): Promise<QuotaCheckResult> {
    const tier = await this.subscriptionService.getTier(userId);
    const limits = TIER_LIMITS[tier];

    // 无限制
    if (limits.memories === -1) {
      return { allowed: true };
    }

    const currentCount = await this.getMemoryCount(userId);
    if (currentCount + quantity > limits.memories) {
      return {
        allowed: false,
        reason: `Memory limit reached (${limits.memories})`,
      };
    }

    return { allowed: true };
  }

  async checkApiQuota(userId: string): Promise<QuotaCheckResult> {
    const tier = await this.subscriptionService.getTier(userId);
    const limits = TIER_LIMITS[tier];

    // 无限制
    if (limits.monthlyApiCalls === -1) {
      return { allowed: true };
    }

    const quota = await this.getQuota(userId);
    if (quota.monthlyApiUsed >= limits.monthlyApiCalls) {
      return {
        allowed: false,
        reason: `Monthly API call limit reached (${limits.monthlyApiCalls})`,
      };
    }

    return { allowed: true };
  }

  async incrementApiUsage(userId: string): Promise<void> {
    await this.prisma.quota.update({
      where: { userId },
      data: { monthlyApiUsed: { increment: 1 } },
    });
  }
}
```

```typescript
// apps/server/src/usage/usage.service.ts
// 职责: 记录用量 (用于 Enterprise 按量计费)

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async recordUsage(
    userId: string,
    type: UsageType,
    quantity: number = 1,
  ): Promise<void> {
    await this.prisma.usageRecord.create({
      data: {
        userId,
        type,
        quantity,
        billingPeriod: this.getCurrentBillingPeriod(),
      },
    });
  }

  async getMonthlyUsage(userId: string, billingPeriod: string): Promise<UsageSummary> {
    const records = await this.prisma.usageRecord.groupBy({
      by: ['type'],
      where: { userId, billingPeriod },
      _sum: { quantity: true },
    });

    return {
      memories: records.find(r => r.type === 'MEMORY')?._sum.quantity ?? 0,
      apiCalls: records.find(r => r.type === 'API_CALL')?._sum.quantity ?? 0,
    };
  }

  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
```

### 配额检查 Guard (组合服务)

```typescript
// apps/server/src/quota/quota.guard.ts
// 职责: 在请求级别检查配额并记录用量

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private quotaService: QuotaService,
    private usageService: UsageService,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    // 1. 检查 API 配额
    const apiCheck = await this.quotaService.checkApiQuota(userId);
    if (!apiCheck.allowed) {
      throw new ForbiddenException(apiCheck.reason);
    }

    // 2. 增加 API 使用计数 (FREE/HOBBY)
    const isEnterprise = await this.subscriptionService.isEnterprise(userId);
    if (!isEnterprise) {
      await this.quotaService.incrementApiUsage(userId);
    }

    // 3. 记录用量 (Enterprise)
    if (isEnterprise) {
      await this.usageService.recordUsage(userId, UsageType.API_CALL);
    }

    return true;
  }
}
```

---

## API Key 数据隔离设计

所有核心数据 (Memory/Entity/Relation) 通过 `apiKeyId` 进行隔离。使用拦截器统一处理，避免在每个 Service 中重复代码。

### 数据隔离拦截器

```typescript
// apps/server/src/common/interceptors/api-key-isolation.interceptor.ts
// 职责: 自动注入 apiKeyId 到查询条件和创建数据中

@Injectable()
export class ApiKeyDataIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey; // 由 ApiKeyGuard 注入

    if (!apiKey) {
      throw new UnauthorizedException('API Key required');
    }

    // 注入 apiKeyId 到请求上下文，供 Service 层使用
    request.apiKeyId = apiKey.id;
    request.platformUserId = apiKey.userId; // 平台用户 ID

    return next.handle();
  }
}
```

### 基础 Repository 模式

```typescript
// apps/server/src/common/base.repository.ts
// 职责: 提供带数据隔离的基础 CRUD 操作

export abstract class BaseRepository<T> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  // 自动添加 apiKeyId 过滤
  protected withApiKeyFilter(apiKeyId: string, where: any = {}): any {
    return { ...where, apiKeyId };
  }

  async findMany(apiKeyId: string, options: FindManyOptions = {}): Promise<T[]> {
    return this.prisma[this.modelName].findMany({
      ...options,
      where: this.withApiKeyFilter(apiKeyId, options.where),
    });
  }

  async findOne(apiKeyId: string, where: any): Promise<T | null> {
    return this.prisma[this.modelName].findFirst({
      where: this.withApiKeyFilter(apiKeyId, where),
    });
  }

  async create(apiKeyId: string, data: any): Promise<T> {
    return this.prisma[this.modelName].create({
      data: { ...data, apiKeyId },
    });
  }

  async update(apiKeyId: string, where: any, data: any): Promise<T> {
    // 先验证记录属于该 apiKeyId
    const existing = await this.findOne(apiKeyId, where);
    if (!existing) {
      throw new NotFoundException('Record not found');
    }
    return this.prisma[this.modelName].update({
      where: { id: existing.id },
      data,
    });
  }

  async delete(apiKeyId: string, where: any): Promise<void> {
    await this.prisma[this.modelName].deleteMany({
      where: this.withApiKeyFilter(apiKeyId, where),
    });
  }
}
```

### Memory Repository 示例

```typescript
// apps/server/src/memory/memory.repository.ts

@Injectable()
export class MemoryRepository extends BaseRepository<Memory> {
  constructor(prisma: PrismaService) {
    super(prisma, 'memory');
  }

  // 向量搜索需要自定义实现
  async searchSimilar(
    apiKeyId: string,
    userId: string,
    embedding: number[],
    limit: number = 10,
    threshold: number = 0.7,
  ): Promise<Memory[]> {
    return this.prisma.$queryRaw`
      SELECT *, 1 - (embedding <=> ${embedding}::vector) as similarity
      FROM memories
      WHERE api_key_id = ${apiKeyId}
        AND user_id = ${userId}
        AND 1 - (embedding <=> ${embedding}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }
}
```

### Controller 使用示例

```typescript
// apps/server/src/memory/memory.controller.ts

@Controller('v1/memories')
@UseGuards(ApiKeyGuard, QuotaGuard)
@UseInterceptors(ApiKeyDataIsolationInterceptor)
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  @Post()
  async create(
    @ApiKeyId() apiKeyId: string,  // 自定义装饰器获取 apiKeyId
    @Body() dto: CreateMemoryDto,
  ) {
    return this.memoryService.create(apiKeyId, dto);
  }

  @Get()
  async list(
    @ApiKeyId() apiKeyId: string,
    @Query() query: ListMemoryDto,
  ) {
    return this.memoryService.list(apiKeyId, query);
  }
}
```

### 自定义装饰器

```typescript
// apps/server/src/common/decorators/api-key.decorator.ts

export const ApiKeyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKeyId;
  },
);

export const PlatformUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.platformUserId;
  },
);
```

---

## 改造步骤

### Phase 1: 项目初始化

1. **创建新 Git 仓库**
2. **复制 linksnap.dev 到新仓库**
3. **全局重命名**
   - `linksnap` → `memory` (或你选择的名称)
   - `lk_` (API Key 前缀) → `mm_`
   - 包名: `@linksnap/*` → `@memory/*`

### Phase 2: 清理不需要的模块

**删除的文件/目录:**
```
apps/server/src/screenshot/     # Screenshot 模块
apps/server/src/browser/        # Browser 自动化
apps/server/src/storage/        # S3 文件存储
apps/server/src/oembed/         # oEmbed 服务
packages/embed/                 # oEmbed 客户端
packages/embed-react/           # React oEmbed
```

**清理 Prisma Schema:**
- 删除 Screenshot 相关表
- 删除 oEmbed 相关表

### Phase 3: 拆分订阅/配额/用量模块

将原有的 Quota 模块拆分为独立的模块，遵循单一职责原则：

```
apps/server/src/
├── subscription/              # 新增：管理订阅状态
│   ├── subscription.service.ts
│   ├── subscription.controller.ts
│   └── subscription.constants.ts
├── quota/                     # 重构：只负责配额检查
│   ├── quota.service.ts
│   ├── quota.guard.ts
│   └── quota.constants.ts
└── usage/                     # 新增：记录用量
    ├── usage.service.ts
    └── usage.controller.ts
```

**修改订阅层级 (4 层 → 3 层):**
```typescript
export enum SubscriptionTier {
  FREE = 'FREE',              // 免费版
  HOBBY = 'HOBBY',            // $19/月 订阅
  ENTERPRISE = 'ENTERPRISE',  // 按量计费
}
```

### Phase 4: 添加公共模块

创建公共模块，提供数据隔离和复用能力：

```
apps/server/src/common/
├── interceptors/
│   └── api-key-isolation.interceptor.ts  # API Key 数据隔离
├── decorators/
│   └── api-key.decorator.ts              # @ApiKeyId() 装饰器
└── base.repository.ts                    # 带隔离的基础 Repository
```

### Phase 5: 迁移 Memory 核心模块

从 `/Users/bowling/conductor/workspaces/moryflow-meta/hong-kong/memory/packages/server/src/` 迁移:

1. **memory/** → `apps/server/src/memory/`
2. **entity/** → `apps/server/src/entity/`
3. **relation/** → `apps/server/src/relation/`
4. **graph/** → `apps/server/src/graph/`
5. **extract/** → `apps/server/src/extract/`
6. **embedding/** → `apps/server/src/embedding/`
7. **llm/** → `apps/server/src/llm/`

**迁移时的修改:**
- 添加 `apiKeyId` 字段到所有核心表
- 修改 Service 层, 在查询中加入 apiKeyId 过滤
- 使用现有的 ApiKeyGuard 替代无认证
- 使用 `QuotaGuard` 自动检查配额和记录用量

### Phase 6: 合并 Prisma Schema

```prisma
// ===== 平台层 =====

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified Boolean   @default(false)
  isAdmin       Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  sessions      Session[]
  accounts      Account[]
  apiKeys       ApiKey[]
  subscription  Subscription?
  quota         Quota?
  usageRecords  UsageRecord[]
}

model Subscription {
  id                    String   @id @default(cuid())
  userId                String   @unique
  tier                  SubscriptionTier @default(FREE)
  status                SubscriptionStatus @default(ACTIVE)
  creemCustomerId       String?
  creemSubscriptionId   String?
  periodStartAt         DateTime @default(now())
  periodEndAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SubscriptionTier {
  FREE
  HOBBY
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  EXPIRED
}

model Quota {
  id              String   @id @default(cuid())
  userId          String   @unique
  monthlyApiLimit Int      @default(1000)
  monthlyApiUsed  Int      @default(0)
  periodStartAt   DateTime @default(now())
  periodEndAt     DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UsageRecord {
  id            String    @id @default(cuid())
  userId        String
  type          UsageType
  quantity      Int
  billingPeriod String    // 格式: "2026-01"
  createdAt     DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, billingPeriod])
  @@index([billingPeriod])
}

enum UsageType {
  MEMORY
  API_CALL
}

model ApiKey {
  id         String    @id @default(cuid())
  name       String
  keyPrefix  String
  keyHash    String    @unique
  userId     String
  isActive   Boolean   @default(true)
  expiresAt  DateTime?
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  memories  Memory[]
  entities  Entity[]
  relations Relation[]

  @@index([userId])
  @@index([keyHash])
}

// ===== 核心层 =====

model Memory {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  apiKeyId  String
  userId    String
  agentId   String?
  sessionId String?
  content   String
  embedding Unsupported("vector(1024)")?
  metadata  Json?
  source    String?
  importance Float?  @default(0.5)
  tags      String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@index([apiKeyId, userId])
  @@index([apiKeyId, userId, agentId])
  @@index([apiKeyId, createdAt])
}

model Entity {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  apiKeyId   String
  userId     String
  type       String   @db.VarChar(100)
  name       String   @db.VarChar(500)
  properties Json?
  embedding  Unsupported("vector(1024)")?
  confidence Float?   @default(1.0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  apiKey          ApiKey     @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  sourceRelations Relation[] @relation("SourceEntity")
  targetRelations Relation[] @relation("TargetEntity")

  @@unique([apiKeyId, userId, type, name])
  @@index([apiKeyId, userId])
  @@index([apiKeyId, userId, type])
}

model Relation {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  apiKeyId   String
  userId     String
  sourceId   String    @db.Uuid
  targetId   String    @db.Uuid
  type       String    @db.VarChar(100)
  properties Json?
  confidence Float?    @default(1.0)
  validFrom  DateTime?
  validTo    DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  source Entity @relation("SourceEntity", fields: [sourceId], references: [id], onDelete: Cascade)
  target Entity @relation("TargetEntity", fields: [targetId], references: [id], onDelete: Cascade)

  @@index([apiKeyId, userId])
  @@index([sourceId])
  @@index([targetId])
  @@index([apiKeyId, userId, type])
}
```

### Phase 7: 更新前端

**Console (用户 Dashboard):**
```
删除:
- Screenshot Playground
- Screenshot 相关页面

修改:
- 定价页面 (3 层: Free/Hobby/Enterprise)
- 订阅管理页面
- 用量统计页面 (区分固定配额 vs 按量)

新增:
- Memory Playground
- Memory/Entity/Graph 数据浏览器
```

**Admin (管理后台):**
```
修改:
- Users 页面 (显示订阅层级)
- Dashboard (Memory 相关统计)
- Subscriptions 页面 (3 层订阅)
```

**WWW (官网):**
```
修改:
- 定价页面 (3 层定价)
- 功能介绍 (Memory 相关)
- Hero 文案
```

### Phase 8: 测试 & 部署

1. 本地测试所有功能
2. 更新 Docker 配置
3. 配置环境变量
4. 部署到生产环境

---

## 环境变量

```bash
# 基础配置
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# 认证
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=https://your-domain.com

# CORS
ALLOWED_ORIGINS=https://console.your-domain.com,https://admin.your-domain.com

# Embedding 服务
OPENAI_API_KEY=sk-...
# 或
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...

# 邮件
RESEND_API_KEY=re_...

# 支付
CREEM_API_KEY=...
CREEM_WEBHOOK_SECRET=...

# 前端
VITE_API_URL=https://api.your-domain.com
```

---

## 需要删除的文件清单

### Server 端 (`apps/server/`)

```
# Screenshot 模块 (替换为 Memory)
src/screenshot/
├── screenshot.service.ts
├── screenshot.processor.ts
├── screenshot.repository.ts
├── screenshot.controller.ts
├── screenshot-console.controller.ts
├── page-renderer.ts
├── image-processor.ts
├── screenshot.types.ts
├── screenshot.constants.ts
├── url-validator.ts
├── screenshot.errors.ts
├── screenshot.module.ts
└── dto/

# 浏览器模块 (删除)
src/browser/
├── browser.service.ts
├── browser.module.ts
└── ...

# 存储模块 (删除)
src/storage/
├── storage.service.ts
├── storage.module.ts
└── ...

# oEmbed 模块 (删除)
src/oembed/
├── oembed.service.ts
├── oembed.controller.ts
├── oembed.module.ts
└── ...
```

### Packages 目录

```
packages/embed/        # 完全删除
packages/embed-react/  # 完全删除
```

---

## 文件参考清单

### linksnap.dev 中需要复用的关键文件

```
# 认证系统
/apps/server/src/auth/better-auth.ts
/apps/server/src/auth/auth.service.ts
/apps/server/src/auth/auth.guard.ts
/apps/server/src/auth/auth.controller.ts

# API Key 管理
/apps/server/src/api-key/api-key.service.ts
/apps/server/src/api-key/api-key.guard.ts
/apps/server/src/api-key/api-key.controller.ts

# 订阅系统 (拆分自 quota)
/apps/server/src/subscription/subscription.service.ts
/apps/server/src/subscription/subscription.controller.ts
/apps/server/src/subscription/subscription.constants.ts

# 配额系统 (重构)
/apps/server/src/quota/quota.service.ts
/apps/server/src/quota/quota.guard.ts
/apps/server/src/quota/quota.constants.ts

# 用量记录 (新增)
/apps/server/src/usage/usage.service.ts
/apps/server/src/usage/usage.controller.ts

# 支付 (保留并修改)
/apps/server/src/payment/payment.service.ts
/apps/server/src/payment/payment-webhook.controller.ts

# 公共模块 (新增)
/apps/server/src/common/interceptors/api-key-isolation.interceptor.ts
/apps/server/src/common/base.repository.ts
/apps/server/src/common/decorators/api-key.decorator.ts
```

### Memory Server 中需要迁移的关键文件

```
# 核心服务
/memory/packages/server/src/memory/memory.service.ts
/memory/packages/server/src/memory/memory.controller.ts
/memory/packages/server/src/entity/entity.service.ts
/memory/packages/server/src/entity/entity.controller.ts
/memory/packages/server/src/relation/relation.service.ts
/memory/packages/server/src/relation/relation.controller.ts
/memory/packages/server/src/graph/graph.service.ts
/memory/packages/server/src/graph/graph.controller.ts

# 辅助服务
/memory/packages/server/src/embedding/embedding.service.ts
/memory/packages/server/src/extract/extract.service.ts
/memory/packages/server/src/llm/llm.service.ts
```

---

## Docker 部署配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/memory
      - REDIS_URL=redis://redis:6379
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CREEM_API_KEY=${CREEM_API_KEY}
    depends_on:
      - db
      - redis

  console:
    build:
      context: .
      dockerfile: apps/console/Dockerfile
    ports:
      - "3001:80"
    environment:
      - VITE_API_URL=http://localhost:3000

  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=memory
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 实施阶段

| 阶段 | 任务 | 涉及模块 |
|------|------|----------|
| Phase 1 | 项目初始化、复制、重命名 | 全局 |
| Phase 2 | 删除 Screenshot/Browser/Storage 模块 | Server, Prisma |
| Phase 3 | 拆分订阅/配额/用量模块 | Subscription, Quota, Usage |
| Phase 4 | 添加公共模块 (拦截器、装饰器、Repository) | Common |
| Phase 5 | 迁移 Memory 核心模块 | Memory, Entity, Relation, Graph |
| Phase 6 | 合并 Prisma Schema、数据库迁移 | Prisma |
| Phase 7 | 更新前端 (Console/Admin/WWW) | 前端 |
| Phase 8 | 测试 & 部署配置 | DevOps |

---

## 开源许可

建议使用 **MIT License** 或 **Apache 2.0**，允许商业使用和修改。

自部署用户可以：
- 关闭支付模块，所有用户默认 Enterprise 权限
- 通过环境变量配置配额限制
- 完全免费使用所有功能

---

---

## 迁移完成记录

### 状态总览

| 阶段 | 状态 | Commit |
|------|------|--------|
| Phase 1 | ✅ 完成 | 项目初始化、全局重命名 |
| Phase 2 | ✅ 完成 | 清理 Screenshot/Browser/Storage 模块 |
| Phase 3 | ✅ 完成 | 拆分订阅/配额/用量模块 |
| Phase 4 | ✅ 完成 | 添加公共模块 |
| Phase 5 | ✅ 完成 | `Phase 5: Add Memory core modules` |
| Phase 6 | ✅ 完成 | `Phase 6: Add initial database migration` |
| Phase 7 | ✅ 完成 | `Phase 7: Update frontend apps for Memory platform` |
| Phase 8 | ✅ 完成 | `Phase 8: Add deployment configuration` |

**仓库地址:** https://github.com/dvlin-dev/memai

---

### Phase 5: Memory 核心模块迁移

#### 创建的模块

从 Memory Server 迁移并改造了 7 个核心模块：

```
apps/server/src/
├── embedding/          # 向量嵌入服务
├── llm/               # LLM 集成服务
├── memory/            # 记忆存储与搜索
├── entity/            # 实体管理
├── relation/          # 关系管理
├── graph/             # 知识图谱遍历
└── extract/           # 实体关系抽取
```

#### 核心设计: 多租户数据隔离

所有核心模块通过 `apiKeyId` 实现数据隔离，采用 Repository 模式封装：

```
Controller
    ↓ @ApiKeyId() 装饰器注入
Service
    ↓ 传递 apiKeyId
Repository (继承 BaseRepository<T>)
    ↓ withApiKeyFilter() 自动添加过滤条件
Prisma
```

**BaseRepository 核心逻辑:**
- `findMany(apiKeyId, options)` - 自动添加 `WHERE apiKeyId = ?`
- `create(apiKeyId, data)` - 自动注入 `apiKeyId` 字段
- `update/delete` - 先验证记录归属再操作

#### 各模块职责

| 模块 | 职责 | 关键方法 |
|------|------|----------|
| embedding | 文本向量化 | `embed(text)`, `embedBatch(texts)` |
| llm | LLM 调用封装 | `chat(messages, options)` |
| memory | 记忆 CRUD + 语义搜索 | `create()`, `search()`, `list()` |
| entity | 实体 CRUD | `create()`, `findByType()`, `batch()` |
| relation | 关系 CRUD | `create()`, `findByEntity()` |
| graph | 图谱遍历查询 | `traverse()`, `findPath()`, `getNeighbors()` |
| extract | 从文本抽取实体关系 | `extractFromText()`, `preview()` |

#### 模块依赖关系

```
extract
  ├─→ llm (调用 LLM 进行抽取)
  ├─→ entity (保存抽取的实体)
  └─→ relation (保存抽取的关系)

memory
  └─→ embedding (生成向量用于语义搜索)

graph
  ├─→ entity (获取实体)
  └─→ relation (获取关系)
```

---

### Phase 6: 数据库迁移

#### Prisma Schema 核心表结构

**平台层（复用 linksnap）:**
- `User` - 平台用户，包含 `isAdmin` 字段
- `Session` / `Account` - Better Auth 会话管理
- `ApiKey` - API 密钥，SHA256 哈希存储
- `Subscription` - 订阅状态 (FREE/HOBBY/ENTERPRISE)
- `Quota` - 固定配额计数器（FREE/HOBBY 用）
- `UsageRecord` - 用量记录（Enterprise 按量计费用）

**核心层（迁移自 Memory Server）:**
- `Memory` - 记忆存储，含 `embedding: vector(1024)`
- `Entity` - 实体，含向量和唯一约束 `(apiKeyId, userId, type, name)`
- `Relation` - 关系，包含 `sourceId` → `targetId`

#### 向量索引策略

使用 IVFFlat 索引实现高效语义搜索：

```sql
-- 100 个聚类列表，适合中等规模数据
CREATE INDEX idx_memories_embedding ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_entities_embedding ON entities
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**注意:** IVFFlat 需要先有数据再建索引，建议数据量 > 1000 后重建索引。

---

### Phase 7: 前端更新

#### Console 应用改造

**删除的页面:**
- Screenshot Playground 及相关组件

**新增的页面:**
- `MemoryPlaygroundPage.tsx` - Memory API 测试工具

**改造逻辑:**
1. 左侧表单输入 userId + content
2. 调用 `POST /api/v1/memories` 创建记忆
3. 支持 `POST /api/v1/memories/search` 语义搜索
4. 右侧展示 JSON 响应结果

**侧边栏更新:**
```
Dashboard    → /
Playground   → /playground (Memory 测试)
API Keys     → /api-keys
Webhooks     → /webhooks
Settings     → /settings
```

#### WWW 应用改造

**HeroSection:**
- 标题改为 "GIVE YOUR AI LONG-TERM MEMORY"
- 副标题强调语义搜索和知识图谱

**FeaturesSection (8 个特性):**
1. Semantic Search - pgvector 向量搜索
2. Knowledge Graph - 自动实体抽取
3. Multi-tenant Isolation - apiKeyId 数据隔离
4. Rich Metadata - 自定义元数据存储
5. LLM Integration - 内置实体关系抽取
6. Fast & Scalable - <100ms 搜索延迟
7. Developer First - RESTful API + Webhooks
8. Graph Traversal - 关系遍历和路径查询

**PricingSection (3 层定价):**
| Plan | 价格 | Memories | API Calls |
|------|------|----------|-----------|
| Free | $0 | 10,000 | 1,000/月 |
| Hobby | $19/月 | 50,000 | 5,000/月 |
| Enterprise | 按量 | Unlimited | Unlimited |

---

### Phase 8: 部署配置

#### Docker Compose 服务架构

```yaml
services:
  db:         # pgvector/pgvector:pg16 - 带向量扩展的 PostgreSQL
  redis:      # redis:7-alpine - 缓存和队列
  server:     # NestJS API - 端口 3000
  console:    # 用户 Dashboard - 端口 3001
  admin:      # 管理后台 - 端口 3002
  www:        # 官网 - 端口 3003
```

#### 关键环境变量

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `OPENAI_API_KEY` | 向量嵌入和 LLM |
| `BETTER_AUTH_SECRET` | 认证签名密钥 |
| `CREEM_API_KEY` | 支付集成（可选） |

#### 自托管模式

禁用支付后，所有用户默认 Enterprise 权限：
1. 不设置 `CREEM_API_KEY`
2. 修改默认订阅层级为 ENTERPRISE
3. 享受无限 Memory 和 API 调用

---

### 参考的核心模块

迁移过程中主要参考了两个项目：

**linksnap.dev (平台层):**
- `apps/server/src/auth/` - Better Auth 认证
- `apps/server/src/api-key/` - API Key 管理和 Guard
- `apps/server/src/subscription/` - 订阅状态管理
- `apps/server/src/quota/` - 配额检查
- `apps/server/src/payment/` - Creem 支付集成
- `apps/server/src/common/` - 拦截器、装饰器

**memory-server (核心层):**
- `packages/server/src/memory/` - 记忆服务
- `packages/server/src/entity/` - 实体服务
- `packages/server/src/relation/` - 关系服务
- `packages/server/src/graph/` - 图谱服务
- `packages/server/src/embedding/` - OpenAI 嵌入
- `packages/server/src/llm/` - LLM 集成

---

*文档创建时间: 2026-01*
*迁移完成时间: 2026-01-02*
*基于项目: linksnap.dev + memory-server*
*版本: v1.0*
