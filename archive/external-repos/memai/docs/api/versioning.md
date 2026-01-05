# API 路由结构

## 需求

统一 API 路由，使用 NestJS Global Prefix + URI Versioning。

## 路由结构

```
/api                          # Global Prefix
├── /v1                       # Public API (API Key 认证)
│   ├── /memories
│   ├── /entities
│   ├── /relations
│   ├── /graph
│   ├── /extract
│   ├── /quota
│   └── /usage
│
├── /console                  # Console API (Session 认证)
│   ├── /api-keys
│   ├── /entities
│   ├── /memories
│   ├── /stats
│   └── /webhooks
│
├── /admin                    # Admin API (Admin Session)
│   ├── /dashboard
│   ├── /users
│   └── /orders
│
├── /user                     # User API (Session)
│   └── /me
│
└── /auth                     # Auth API (Public)
    └── /*

/health                       # Health Check (无前缀)
/webhooks/creem               # External Webhooks (无前缀)
```

## 核心配置

### main.ts

```typescript
// 全局前缀，排除 health 和 webhooks
app.setGlobalPrefix('api', {
  exclude: ['health', 'health/(.*)', 'webhooks/(.*)'],
});

// URI 版本控制
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

### Controller 版本装饰器

```typescript
// Public API - 使用版本号
@Controller({ path: 'memories', version: '1' })  // → /api/v1/memories

// Console/Admin API - 使用 VERSION_NEUTRAL
@Controller({ path: 'console/api-keys', version: VERSION_NEUTRAL })  // → /api/console/api-keys
```

## 前端 API 路径

```typescript
// apps/console/src/lib/api-paths.ts
export const CONSOLE_API = {
  API_KEYS: '/api/console/api-keys',
  MEMORIES: '/api/console/memories',
};

export const PUBLIC_API = {
  MEMORIES: '/api/v1/memories',
  ENTITIES: '/api/v1/entities',
};
```

---

*实现参考: `apps/server/src/main.ts`*
