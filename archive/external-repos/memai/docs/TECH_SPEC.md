# Memai 技术架构

> Memory as a Service - 为 AI 应用提供持久化语义记忆

## 需求

为 AI 应用提供：
- 语义记忆存储和向量检索
- 实体/关系知识图谱
- 多租户 API Key 管理
- 配额和订阅计费

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | NestJS 11 + Prisma 7 | API 服务 |
| 数据库 | PostgreSQL 16 + pgvector | 向量存储 |
| 缓存/队列 | Redis 7 + BullMQ | 异步任务 |
| 向量嵌入 | OpenAI / Aliyun | 文本向量化 |
| 认证 | Better Auth | 用户认证 |
| 前端 | React 19 + Vite | Console/Admin |
| 支付 | Creem | 订阅计费 |
| 文档 | Fumadocs + TanStack Start | API 文档 |

## 核心模块

```
apps/server/src/
├── memory/      # 记忆 CRUD + 向量搜索 → memory.service.ts
├── entity/      # 实体提取和管理 → entity.service.ts
├── relation/    # 实体关系管理 → relation.service.ts
├── graph/       # 知识图谱查询 → graph.service.ts
├── extract/     # LLM 实体/关系提取 → extract.service.ts
├── embedding/   # 向量嵌入服务 → embedding.service.ts
├── api-key/     # API Key 管理 → api-key.service.ts
├── quota/       # 配额管理 → quota.service.ts
├── webhook/     # Webhook 推送 → webhook.service.ts
├── auth/        # 用户认证 → auth.service.ts
├── user/        # 用户管理 → user.service.ts
├── payment/     # 支付处理 → payment.service.ts
├── admin/       # 管理后台 API → admin.service.ts
└── common/      # 守卫、拦截器、装饰器
```

## 核心流程

### Memory 创建流程

```
POST /api/v1/memories { userId, content, metadata }
  ↓
ApiKeyGuard → 验证 API Key，获取 apiKeyId
  ↓
QuotaService.check(userId) → 检查配额
  ↓
EmbeddingService.embed(content) → 生成 1536 维向量
  ↓
prisma.memory.create({ content, embedding, userId, apiKeyId })
  ↓
Response { id, content, createdAt }
```

**核心实现：** `apps/server/src/memory/memory.service.ts:create()`

### Memory 搜索流程

```
POST /api/v1/memories/search { query, userId, limit, threshold }
  ↓
EmbeddingService.embed(query) → 查询向量
  ↓
prisma.$queryRaw(`
  SELECT *, 1 - (embedding <=> $1) AS similarity
  FROM "Memory"
  WHERE similarity > threshold
  ORDER BY similarity DESC
  LIMIT $2
`)
  ↓
Results [{ id, content, similarity, ... }]
```

**核心实现：** `apps/server/src/memory/memory.service.ts:search()`

### 实体提取流程

```
POST /api/v1/extract { text, userId }
  ↓
ExtractService.extractFromText(text) → 调用 LLM (OpenAI/DashScope)
  ↓
LLM Response: { entities: [...], relations: [...] }
  ↓
EntityService.createMany(entities)
RelationService.createMany(relations)
  ↓
Response { entities, relations }
```

**核心实现：** `apps/server/src/extract/extract.service.ts:extract()`

## 数据模型

```
User ─┬─ Session (Better Auth)
      ├─ Account
      ├─ Subscription → tier, monthlyQuota, usedQuota
      ├─ ApiKey ─── Memory ─┬─ Entity
      │                     └─ Relation (source, target)
      └─ Webhook → WebhookDelivery
```

### 关键表结构

```typescript
// Memory 表 - 核心记忆存储
model Memory {
  id        String    @id
  content   String    // 文本内容
  embedding Unsupported("vector(1536)")  // pgvector 向量
  metadata  Json?     // 自定义元数据
  userId    String    // 用户标识
  apiKeyId  String    // 创建时的 API Key
  createdAt DateTime
}

// Entity 表 - 实体
model Entity {
  id       String  @id
  name     String  // 实体名称
  type     String  // 类型：PERSON, ORG, LOCATION...
  memoryId String? // 关联的 Memory
  userId   String
}

// Relation 表 - 关系
model Relation {
  id          String @id
  type        String // 关系类型：WORKS_AT, KNOWS...
  sourceId    String // 源实体
  targetId    String // 目标实体
  description String?
  userId      String
}

// ApiKey 表 - API 密钥
model ApiKey {
  id        String @id
  keyHash   String @unique  // SHA256 哈希
  keyPrefix String          // mm_xxxx (前8位)
  name      String
  userId    String
}
```

**Schema 位置：** `apps/server/prisma/schema.prisma`

## 配额逻辑

```typescript
// 伪代码 - quota.service.ts
async deduct(userId: string, amount: number) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })

  // 1. 优先扣月度配额
  if (sub.monthlyQuota - sub.usedQuota >= amount) {
    await prisma.subscription.update({
      where: { userId },
      data: { usedQuota: { increment: amount } }
    })
    return { source: 'MONTHLY' }
  }

  // 2. 其次扣购买配额
  if (sub.purchasedQuota >= amount) {
    await prisma.subscription.update({
      where: { userId },
      data: { purchasedQuota: { decrement: amount } }
    })
    return { source: 'PURCHASED' }
  }

  // 3. 配额不足
  throw new QuotaExceededError()
}

// 失败时返还
async refund(userId: string, amount: number, source: string) {
  if (source === 'MONTHLY') {
    await prisma.subscription.update({
      where: { userId },
      data: { usedQuota: { decrement: amount } }
    })
  } else {
    await prisma.subscription.update({
      where: { userId },
      data: { purchasedQuota: { increment: amount } }
    })
  }
}
```

**实现位置：** `apps/server/src/quota/quota.service.ts`

## API 路由结构

```
/api
├── /v1                       # Public API (API Key 认证)
│   ├── /memories             → memory.controller.ts
│   ├── /entities             → entity.controller.ts
│   ├── /relations            → relation.controller.ts
│   ├── /graph                → graph.controller.ts
│   └── /extract              → extract.controller.ts
│
├── /console                  # Console API (Session 认证)
│   ├── /api-keys             → api-key.controller.ts
│   ├── /memories             → console-memory.controller.ts
│   ├── /entities             → console-entity.controller.ts
│   ├── /webhooks             → webhook.controller.ts
│   └── /stats                → console-stats.controller.ts
│
├── /admin                    # Admin API (Admin Session)
│   ├── /dashboard            → admin-dashboard.controller.ts
│   └── /users                → admin-users.controller.ts
│
└── /auth                     # Auth API (Better Auth)
```

**配置位置：** `apps/server/src/main.ts`

## 前端应用

| 应用 | 目录 | 技术 | 说明 |
|------|------|------|------|
| Console | `apps/console/` | React + Vite + TanStack | 用户控制台 |
| Admin | `apps/admin/` | React + Vite + TanStack | 管理后台 |
| Docs | `apps/docs/` | Fumadocs + TanStack Start | API 文档 |
| WWW | `apps/www/` | TanStack Start | 官网 |

### 共享包

| 包 | 目录 | 说明 |
|---|------|------|
| UI | `packages/ui/` | shadcn/ui 组件库 (50+ 组件) |
| Shared Types | `packages/shared-types/` | API 响应类型定义 |

## 部署架构

```
Cloudflare CDN
      ↓
┌─────────────────────────────────────┐
│  console.memai.dev (Nginx)          │
│  admin.memai.dev (Nginx)            │
│  docs.memai.dev (Workers)           │
│  memai.dev (Workers)                │
└─────────────────────────────────────┘
      ↓
server.memai.dev (NestJS Docker)
      ↓
┌─────────┬──────────┬───────────────┐
│PostgreSQL│  Redis  │ Cloudflare R2 │
│+pgvector │         │               │
└─────────┴──────────┴───────────────┘
```

## 环境变量

```bash
# 数据库
DATABASE_URL="postgresql://..."

# Redis
REDIS_HOST="..."
REDIS_PORT="6379"

# 向量嵌入
OPENAI_API_KEY="..."
# 或 DASHSCOPE_API_KEY="..."

# 认证
BETTER_AUTH_SECRET="..."

# 支付
CREEM_API_KEY="..."
CREEM_WEBHOOK_SECRET="..."
```

---

*版本: 3.0 | 更新: 2026-01*
