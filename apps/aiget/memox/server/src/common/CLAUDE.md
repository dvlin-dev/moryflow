# Common Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

服务端通用模块，提供 Guard、Decorator、Interceptor、Filter 与通用工具函数，供所有业务模块复用。

## 职责

**包含：**

- 全局 Guard（限流、节流）
- 响应拦截器（统一响应结构）
- 异常过滤器（统一错误格式）
- 通用装饰器
- 工具函数（分页、HTTP 工具）
- JSON 工具（JsonValueSchema + JSON 输出转换）
- BaseRepository（集中实现 apiKeyId 数据隔离）

**不包含：**

- 业务逻辑（各模块自行处理）
- 认证逻辑（由 auth/、api-key/ 处理）

## 成员清单

| 文件/目录                                       | 类型        | 说明                     |
| ----------------------------------------------- | ----------- | ------------------------ |
| `guards/user-throttler.guard.ts`                | Guard       | 用户/Key 限流            |
| `guards/index.ts`                               | Export      | Guard 导出               |
| `interceptors/response.interceptor.ts`          | Interceptor | 统一响应包装             |
| `interceptors/api-key-isolation.interceptor.ts` | Interceptor | API Key 隔离             |
| `interceptors/index.ts`                         | Export      | Interceptor 导出         |
| `decorators/api-key.decorator.ts`               | Decorator   | @ApiKeyContext           |
| `decorators/response.decorator.ts`              | Decorator   | @Response 元数据         |
| `decorators/index.ts`                           | Export      | Decorator 导出           |
| `filters/http-exception.filter.ts`              | Filter      | 全局错误处理             |
| `filters/index.ts`                              | Export      | Filter 导出              |
| `utils/pagination.utils.ts`                     | Utility     | 分页工具                 |
| `utils/http.utils.ts`                           | Utility     | HTTP 工具                |
| `utils/json.zod.ts`                             | Utility     | JsonValueSchema（Zod）   |
| `utils/json.utils.ts`                           | Utility     | asRecordOrNull JSON 转换 |
| `utils/index.ts`                                | Export      | 工具导出                 |
| `base.repository.ts`                            | Class       | 通用仓库基类             |
| `index.ts`                                      | Export      | 模块公开导出             |

## 响应格式

统一响应结构：

```typescript
// 成功
{
  success: true,
  data: T,
  meta?: { pagination, ... }
}

// 失败
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: Record<string, unknown>
  }
}
```

## 异常处理

```typescript
// HttpExceptionFilter 统一处理
throw new NotFoundException('Memory not found');

// 自定义模块错误
throw new MemoryNotFoundError(id);
```

## 分页工具

```typescript
import { paginate, PaginationMeta } from '@/common';

const result = paginate(items, { page: 1, limit: 20 });
// 返回：{ items, meta: { total, page, limit, totalPages } }
```

## 常见修改场景

| 场景           | 文件                                   | 说明               |
| -------------- | -------------------------------------- | ------------------ |
| 新增全局 Guard | `guards/` + `app.module.ts`            | 全局注册           |
| 修改响应格式   | `interceptors/response.interceptor.ts` | 更新包装结构       |
| 新增工具函数   | `utils/`                               | 需在 index.ts 导出 |
| 新增装饰器     | `decorators/`                          | 需在 index.ts 导出 |

## 依赖关系

```
common/
├── 被依赖 ← 所有模块
└── 无外部模块依赖
```

---

_见 [apps/aiget/memox/server/CLAUDE.md](../CLAUDE.md) 获取服务端约定_
