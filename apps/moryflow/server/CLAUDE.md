# Server

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 后端服务，基于 NestJS 构建的 RESTful API 服务。

## 职责

- 用户认证与授权
- AI 模型代理（多模型统一接口）
- 云同步服务
- 支付与订阅管理
- 语音转写服务
- 向量化与知识库服务

## 约束

- 使用 NestJS 模块化架构
- 数据库操作使用 Prisma ORM
- `build` / `lint` / `typecheck` / `test*` 会通过 `pre*` scripts 自动执行 `prisma:generate`（不需要本地 DB），确保 Prisma Client 与 schema 同步
- 敏感配置通过环境变量管理
- API 需要做权限校验（使用 Guard）
- 反代部署必须启用 `trust proxy`（Express）：否则 `req.protocol`/secure cookie/回调 URL 在反代下会被错误识别为 http

## 模块目录结构

```
module-name/
├── dto/
│   ├── index.ts                    # DTO exports
│   └── module-name.schema.ts       # Zod schemas + inferred types + DTO classes
├── module-name.module.ts           # NestJS module definition
├── module-name.controller.ts       # API controller (ApiKeyGuard)
├── module-name-console.controller.ts # Console controller (SessionGuard) [optional]
├── module-name.service.ts          # Business logic
├── module-name.constants.ts        # Constants, enums, config
├── module-name.errors.ts           # Custom HttpException errors
├── module-name.types.ts            # External API types only [optional]
└── index.ts                        # Public exports
```

### 文件职责

| 文件              | 用途        | 包含内容                                                 |
| ----------------- | ----------- | -------------------------------------------------------- |
| `dto/*.schema.ts` | 验证 + 类型 | Zod schemas, `z.infer<>` types, `createZodDto()` classes |
| `*.constants.ts`  | 配置        | Enums, config values, error codes                        |
| `*.errors.ts`     | 错误处理    | Custom `HttpException` subclasses                        |
| `*.types.ts`      | 仅外部类型  | 第三方 API 响应结构（不用于验证）                        |

## 近期变更

- Build：Dockerfile 固定 pnpm@9.12.2 并带入 .npmrc，避免依赖解析丢失导致 TS2307
- Build：移除 sync 包 node_modules 的 COPY（hoisted 模式下路径不存在），避免 Docker 构建失败
- 统一响应为 raw JSON + RFC7807 错误体，新增 requestId 输出
- AI Proxy：欠费门禁 + 流式断连取消 + stop/n/user 透传 + backpressure 处理 + n 上限与并发收敛
- AI Proxy/Image：计费日志包含欠费、providerOptions 类型收敛
- CreditService：新增欠费记录与付费积分优先抵扣
- Sync：差异计算抽离为纯函数模块，补齐 rename/clock fast-forward 与冲突副本处理
- Sync：预签名 URL 生成前校验存储配置，额度预检包含冲突副本
- Quota：拆分单文件大小与增量存储校验，统一 Sync 额度判断
- Sync：冲突额度增量按本地文件大小计算，避免误判
- Auth：access JWT + refresh rotation + JWKS，移除 pre-register 与旧 bearer 交互
- Auth：Web/设备端区分 CSRF（Web 开启、设备端允许无 Origin），补充 origin 白名单工具与单测
- Auth：接入 Expo plugin（`@better-auth/expo`），`TRUSTED_ORIGINS` 示例包含 `moryflow://`
- Prisma：重置数据库并生成 init 迁移作为新基线
- Prisma：User 增补 refreshTokens 关联，避免 RefreshToken 关系缺失
- Common：ZodValidationPipe 清理未使用参数，避免 lint 报错
- Payment：successUrl 白名单校验、Webhook productId 校验与类型映射、成功页 postMessage 限定 origin
- Payment：Webhook 幂等性补齐唯一约束兜底；新增支付工具与单测
- Quota：存储/向量化扣减改为原子更新并补齐单测
- Quota：QuotaModule 补齐 AuthModule 依赖，修复 AuthGuard 依赖注入失败
- Pricing：空产品 ID 不再进入 tier/credits/license 映射并补齐单测
- Tests：Pricing/Credit/Payment/AiProxy 单测补齐事务与依赖 mock，日积分断言改为使用常量
- Vectorize：Worker 改为 JWKS 验签 access JWT，Server 调用改为按 userId 签发 access token
- 环境变量：BETTER_AUTH_URL/SERVER_URL 切换为 `app.moryflow.com`，`ADMIN_EMAILS=dvlindev@qq.com`，移除 `VECTORIZE_API_SECRET`/`PRE_REGISTER_ENCRYPTION_KEY`
- E2E 测试 setup 补充默认环境变量（BETTER_AUTH_SECRET、VECTORIZE_API_URL），避免缺失配置阻断启动
- 管理端站点筛选与更新使用 Prisma 类型约束，避免 `any` 与不安全访问
- 用户限流 Guard 改为同步返回 `Promise.resolve` 避免无用 `async`
- AuthModule 设为全局并导出 AuthGuard，修复 e2e 中 Guard 依赖注入失败
- Common：补齐 ZodValidationPipe，用于 controller 级别 schema 校验
- Auth：补齐 JWKS e2e 验签测试
- E2E：Admin/AI Proxy/License 测试对齐 subscription tier 与 access JWT 认证
- Build：补齐 @ai-sdk/provider-utils 与 jose 依赖，修复 Docker 构建 TS2307

## 错误信息规范

### 原则

- **错误信息**：全部使用英文（用户可见的报错）
- **代码注释**：保持中文（便于团队协作）
- **日志信息**：使用英文（logger.warn/error/log）

### 示例

```typescript
// ✅ 正确：英文错误信息 + 中文注释
// 检查用户是否存在
if (!user) {
  throw new NotFoundException('User not found');
}

// ❌ 错误：中文错误信息
if (!user) {
  throw new NotFoundException('用户不存在');
}
```

### DTO 验证信息

```typescript
// ✅ 正确
z.string().email('Invalid email address');
z.string().min(1, 'Password is required');

// ❌ 错误
z.string().email('请输入有效的邮箱');
```

### 邮件/通知内容

- 如果系统支持多语言：根据用户语言偏好发送
- 如果不支持多语言：默认使用英文

## Types & DTO 规范（Zod-First）

### 核心原则：单一数据源

**所有请求/响应类型必须从 Zod schemas 使用 `z.infer<>` 派生。** 禁止定义重复的 TypeScript interface。

### Schema 文件结构

```typescript
// dto/memory.schema.ts
import { z } from 'zod';
import { createZodDto } from '@wahyubucil/nestjs-zod-openapi';

// ========== Shared Field Schemas ==========

const ContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(10000, 'Content too long')
  .openapi({
    description: 'Memory content',
    example: 'User prefers dark mode',
  });

const MetadataSchema = z
  .record(z.unknown())
  .optional()
  .openapi({ description: 'Custom metadata' });

// ========== Request Schemas ==========

export const CreateMemorySchema = z
  .object({
    content: ContentSchema,
    userId: z.string().optional(),
    metadata: MetadataSchema,
  })
  .openapi('CreateMemoryRequest');

// ========== Response Schemas ==========

export const MemorySchema = z
  .object({
    id: z.string(),
    content: z.string(),
    metadata: z.record(z.unknown()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Memory');

// ========== Inferred Types (Single Source of Truth) ==========

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type Memory = z.infer<typeof MemorySchema>;

// ========== DTO Classes (NestJS + OpenAPI) ==========

export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
export class MemoryDto extends createZodDto(MemorySchema) {}
```

### types.ts 使用场景

**仅用于外部/第三方 API 结构（不进行验证）：**

```typescript
// ✅ 正确: types.ts 用于外部 API 响应
// 外部 oEmbed API 响应结构（不进行验证）
export interface OembedData {
  type: 'photo' | 'video' | 'link' | 'rich';
  version: '1.0';
  title?: string;
  html?: string;
}

// ❌ 错误: 请求/响应类型放在 types.ts
// 这些应该在 dto/*.schema.ts 中使用 Zod
export interface CreateMemoryRequest { ... }  // 不要这样做
```

### Controller 使用示例

```typescript
// memory.controller.ts
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { CreateMemoryDto, MemoryDto } from './dto';

@ApiTags('Memory')
@ApiSecurity('apiKey')
@Controller({ path: 'memories', version: '1' })
@UseGuards(ApiKeyGuard)
export class MemoryController {
  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  @ApiOkResponse({ type: MemoryDto })
  async create(@Body() dto: CreateMemoryDto): Promise<MemoryDto> {
    // dto 已经被 ZodValidationPipe 验证
    return this.memoryService.create(dto);
  }
}
```

### 自定义错误

```typescript
// memory.errors.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export type MemoryErrorCode = 'MEMORY_NOT_FOUND' | 'MEMORY_LIMIT_EXCEEDED';

export abstract class MemoryError extends HttpException {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ success: false, error: { code, message, details } }, status);
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super('MEMORY_NOT_FOUND', `Memory not found: ${id}`, HttpStatus.NOT_FOUND, {
      id,
    });
  }
}
```

### 反模式

```typescript
// ❌ 错误: 重复类型定义
// types.ts
export interface CreateMemoryInput { content: string; }
// schema.ts
export const CreateMemorySchema = z.object({ content: z.string() });
// 现在有两个数据源了！

// ❌ 错误: class-validator 装饰器
export class CreateMemoryDto {
  @IsString() content: string;  // 没有 pipe 就没有运行时验证
}

// ❌ 错误: Service 中的内联类型
// service.ts
interface MemoryInput { ... }  // 应该在 dto/schema.ts 中

// ❌ 错误: Zod enum 重复定义为 TypeScript 类型
// types.ts
export type Theme = 'light' | 'dark';
// schema.ts
export const ThemeSchema = z.enum(['light', 'dark']);  // 重复了！

// ✅ 正确: 单一数据源
export const ThemeSchema = z.enum(['light', 'dark']);
export type Theme = z.infer<typeof ThemeSchema>;  // 派生，不重复
```

## 技术栈

| 技术       | 用途       |
| ---------- | ---------- |
| NestJS     | Web 框架   |
| Prisma     | ORM        |
| PostgreSQL | 主数据库   |
| Redis      | 缓存与会话 |
| Creem      | 支付网关   |

## 成员清单

| 文件/目录           | 类型 | 说明                                          |
| ------------------- | ---- | --------------------------------------------- |
| `src/main.ts`       | 入口 | 应用启动入口                                  |
| `src/app.module.ts` | 模块 | 根模块，注册所有子模块                        |
| `src/auth/`         | 模块 | 认证与授权（JWT、OTP、OAuth（Google/Apple）） |
| `src/user/`         | 模块 | 用户管理                                      |
| `src/ai-proxy/`     | 模块 | AI 模型代理服务                               |
| `src/payment/`      | 模块 | 支付与订阅                                    |
| `src/credit/`       | 模块 | 积分管理                                      |
| `src/quota/`        | 模块 | 配额管理                                      |
| `src/sync/`         | 模块 | 云同步服务                                    |
| `src/storage/`      | 模块 | 文件存储服务                                  |
| `src/speech/`       | 模块 | 语音转写服务                                  |
| `src/search/`       | 模块 | 搜索服务                                      |
| `src/vault/`        | 模块 | 知识库服务                                    |
| `src/vectorize/`    | 模块 | 向量化服务                                    |
| `src/email/`        | 模块 | 邮件服务                                      |
| `src/activity-log/` | 模块 | 活动日志                                      |
| `src/license/`      | 模块 | 许可证管理                                    |
| `src/admin/`        | 模块 | 管理后台 API                                  |
| `src/common/`       | 目录 | 通用工具、装饰器、Guard                       |
| `src/config/`       | 目录 | 配置管理                                      |
| `src/prisma/`       | 目录 | Prisma 服务                                   |
| `src/redis/`        | 目录 | Redis 服务                                    |
| `src/types/`        | 目录 | 类型定义                                      |
| `prisma/`           | 目录 | 数据库 Schema 与迁移                          |

## 常见修改场景

| 场景         | 涉及文件                      | 注意事项                                             |
| ------------ | ----------------------------- | ---------------------------------------------------- |
| 新增 API     | 对应模块的 controller/service | 添加 Guard 权限校验                                  |
| 修改数据模型 | `prisma/schema.prisma`        | 需运行 migrate                                       |
| 新增模块     | `src/xxx/`, `app.module.ts`   | 在根模块注册                                         |
| 修改 AI 代理 | `src/ai-proxy/`               | 注意积分消耗计算                                     |
| 修改支付逻辑 | `src/payment/`                | 参考 docs/products/moryflow/features/credits-system/ |
| 修改云同步   | `src/sync/`                   | 参考 docs/products/moryflow/features/cloud-sync/     |

## 依赖关系

```
apps/moryflow/server/
├── 依赖 → packages/api（类型定义）
├── 功能文档 → docs/products/moryflow/features/credits-system/
├── 功能文档 → docs/products/moryflow/features/cloud-sync/
├── 功能文档 → docs/products/moryflow/features/speech-to-text/
└── 被依赖 ← apps/moryflow/pc, apps/moryflow/mobile（API 调用）
```

## 模块架构

```
┌─────────────────────────────────────────────────────┐
│                    Controller 层                     │
│         (接收请求、参数校验、权限检查)                │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│                    Service 层                        │
│              (业务逻辑、数据处理)                     │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│                    Prisma 层                         │
│                  (数据库操作)                        │
└─────────────────────────────────────────────────────┘
```
