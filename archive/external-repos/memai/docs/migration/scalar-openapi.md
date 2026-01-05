# Scalar + OpenAPI 迁移

## 需求

1. 使用 Scalar 替换 Swagger UI
2. 使用 Zod 替换 class-validator
3. 增强 OpenAPI 文档装饰器

## 技术方案

### 依赖

```bash
pnpm add @scalar/nestjs-api-reference zod nestjs-zod --filter @memai/server
```

### 核心文件

```
apps/server/src/openapi/
├── openapi.module.ts        # 模块
├── openapi.service.ts       # DocumentBuilder 配置
├── openapi.constants.ts     # 路径常量
└── scalar.middleware.ts     # Scalar UI 中间件
```

### main.ts 配置

```typescript
// OpenAPI + Scalar 设置
const openApiService = app.get(OpenApiService);
const config = openApiService.buildConfig();
const document = SwaggerModule.createDocument(app, config, {
  include: [MemoryModule, EntityModule, ...],  // 使用 Module 类
});

// 提供 OpenAPI JSON
app.use('/openapi.json', (_, res) => res.json(document));

// 提供 Scalar UI
app.use('/api-reference', apiReference({ url: '/openapi.json' }));
```

### Zod Schema 模式

```typescript
// dto/memory.schema.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// 定义 Schema
export const CreateMemorySchema = z.object({
  userId: z.string().min(1),
  content: z.string().min(1).max(50000),
  metadata: z.record(z.unknown()).optional(),
});

// 推导类型（单一来源）
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

// 创建 DTO 类
export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
```

### Controller 装饰器

```typescript
@ApiTags('Memory')
@ApiSecurity('apiKey')
@Controller({ path: 'memories', version: '1' })
export class MemoryController {

  @Post()
  @ApiOperation({ summary: 'Create a memory' })
  @ApiOkResponse({ description: 'Memory created' })
  async create(@Body() dto: CreateMemoryDto) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a memory' })
  @ApiNoContentResponse({ description: 'Memory deleted' })
  @ApiParam({ name: 'id', description: 'Memory ID' })
  async delete(@Param('id') id: string) {}
}
```

## 验证清单

- [ ] `/api-reference` 可访问
- [ ] `/openapi.json` 返回有效 JSON
- [ ] Zod 验证错误格式正确
- [ ] 所有端点有 `@ApiOperation`
- [ ] 所有响应有 `@ApiOkResponse` 或 `@ApiNoContentResponse`

---

*实现参考: `apps/server/src/openapi/`, `apps/server/src/*/dto/*.schema.ts`*
