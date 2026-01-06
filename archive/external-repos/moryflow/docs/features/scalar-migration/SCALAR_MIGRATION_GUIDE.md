# Scalar + OpenAPI 迁移

## 需求

将 Moryflow Server 从 Swagger UI 迁移到 Scalar：
- 现代化 API 文档 UI
- 分离公开 API 和内部 API
- 统一使用 ZodValidationPipe

## 技术方案

### API 文档路径

| 类型 | 路径 |
|------|------|
| 公开 API 文档 | `/api-reference` |
| 内部 API 文档 | `/api-reference/internal`（仅开发环境） |

### API 分类

**公开 API**：Health, Auth, License, Payment, AI Proxy, AI Image, Speech, Search, Storage, Sync, Site

**内部 API**：Admin, Admin Payment, Admin Storage, Agent Trace, AI Admin, Alert, Quota, Vectorize

### 核心模块

```
src/openapi/
├── openapi.constants.ts   # 路径常量
├── openapi.service.ts     # 文档构建器
├── scalar.middleware.ts   # Scalar 中间件
└── openapi.module.ts      # 模块定义
```

### DTO 迁移模式

```typescript
// 使用 createZodDto
import { createZodDto } from 'nestjs-zod'

export const CreateLicenseSchema = z.object({
  name: z.string().min(1),
  plan: z.enum(['free', 'pro', 'team']),
})

export class CreateLicenseDto extends createZodDto(CreateLicenseSchema) {}
```

### OpenAPI 装饰器模板

```typescript
@ApiTags('Module Name')
@ApiBearerAuth('bearer')
@Controller({ path: 'module', version: '1' })
export class ModuleController {
  @Post()
  @ApiOperation({ summary: '创建资源' })
  @ApiOkResponse({ description: '创建成功' })
  async create(@Body() dto: CreateDto) {}
}
```

## 代码索引

| 模块 | 路径 |
|------|------|
| OpenAPI 模块 | `apps/server/src/openapi/` |
| Scalar 中间件 | `apps/server/src/openapi/scalar.middleware.ts` |
| 入口配置 | `apps/server/src/main.ts` |
