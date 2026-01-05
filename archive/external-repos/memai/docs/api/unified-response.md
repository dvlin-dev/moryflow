# API 统一响应规范

## 需求

1. 后端 Controller 只返回业务数据，拦截器负责统一封装
2. 前端 API Client 自动解包响应，业务代码直接使用数据
3. 统一分页模式（offset-based）和错误格式

## 响应格式

### 成功响应

```typescript
// 标准响应
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;  // ISO 8601
}

// 分页响应
interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}
```

### 错误响应

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;       // VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND...
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
```

## 核心实现

### 后端核心文件

| 文件 | 位置 | 职责 |
|------|------|------|
| `response.interceptor.ts` | `apps/server/src/common/interceptors/` | 自动包装响应 |
| `http-exception.filter.ts` | `apps/server/src/common/filters/` | 统一错误格式 |
| `response.decorator.ts` | `apps/server/src/common/decorators/` | `@SkipResponseWrap` 装饰器 |

### 响应拦截器逻辑

```typescript
// 伪代码
intercept(data) {
  if (已有 success 字段) return data;  // 避免重复包装
  if (statusCode === 204) return undefined;

  if (data 是 { items, pagination }) {
    // 分页响应
    return { success: true, data: items, meta: {...}, timestamp };
  }

  // 标准响应
  return { success: true, data, timestamp };
}
```

### 前端 API Client

```typescript
// apps/console/src/lib/api-client.ts
// apps/admin/src/lib/api-client.ts

// 自动解包
async get<T>(endpoint): Promise<T> {
  const response = await fetch(endpoint);
  const json = await response.json();
  if (!json.success) throw new ApiError(json.error);
  return json.data;  // 直接返回业务数据
}

// 分页请求
async getPaginated<T>(endpoint): Promise<{ data: T[], meta }> {
  const json = await fetch(endpoint).then(r => r.json());
  return { data: json.data, meta: json.meta };
}
```

## 特殊响应（跳过包装）

| 端点 | 原因 | 处理方式 |
|------|------|---------|
| `/health` | 监控系统兼容 | `@SkipResponseWrap()` |
| `/webhooks/*` | 第三方回调格式 | `@SkipResponseWrap()` |
| `/api/auth/*` | Better Auth 决定 | `@SkipResponseWrap()` |
| 文件下载 | 非 JSON | `@SkipResponseWrap()` + `@Res()` |

## 错误码对照

| HTTP | Code | 说明 |
|------|------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未认证 |
| 403 | `FORBIDDEN` | 无权限 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 422 | `VALIDATION_ERROR` | Zod 验证失败 |
| 429 | `TOO_MANY_REQUESTS` | 请求频率超限 |

---

*实现参考: `apps/server/src/common/interceptors/response.interceptor.ts`*
