# Admin 站点管理

## 需求

在 Admin 后台管理用户发布的站点：
- 列表查看、搜索、筛选
- 强制下线/上线
- 修改配置、软删除、彻底清除

## 技术方案

### 架构

```
Admin 前端
├── SitesPage (列表)
└── SiteDetailPage (详情)
         │
         │ HTTP API
         ▼
NestJS Server
├── AdminSiteController
└── AdminSiteService
    ├── Prisma (Site + User)
    └── SitePublishService (R2 清理)
```

### API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/admin/sites` | 列表（分页+筛选） |
| GET | `/api/admin/sites/:id` | 详情 |
| POST | `/api/admin/sites/:id/offline` | 强制下线 |
| POST | `/api/admin/sites/:id/online` | 恢复上线 |
| PATCH | `/api/admin/sites/:id` | 修改配置 |
| DELETE | `/api/admin/sites/:id` | 软删除 |
| DELETE | `/api/admin/sites/:id/purge` | 彻底清除 |

### 筛选维度

| 维度 | 类型 | 说明 |
|------|------|------|
| subdomain/title/email | 搜索 | 模糊匹配 |
| status | 筛选 | ACTIVE / OFFLINE / DELETED |
| type | 筛选 | MARKDOWN / GENERATED |
| userTier | 筛选 | free / pro / premium |
| expiryFilter | 筛选 | expiring（7天内）/ expired |

### 核心逻辑（伪代码）

```
# 列表查询
getSites(query):
  baseQuery = Site.join(User)
  if search:
    where subdomain ILIKE %search% OR title ILIKE %search% OR email ILIKE %search%
  if status:
    where status = status
  if userTier:
    where user.tier = tier
  if expiryFilter == 'expiring':
    where expiresAt BETWEEN now AND now+7days
  return paginate(baseQuery, limit, offset)

# 彻底清除
purgeSite(siteId):
  sitePublishService.cleanSiteFiles(siteId)  # 清理 R2
  delete SitePage where siteId = id
  delete Site where id = siteId
  log AdminLog
```

### 操作权限

| 操作 | 危险级别 | 说明 |
|------|----------|------|
| 强制下线 | 中 | 站点不可访问 |
| 恢复上线 | 低 | 恢复访问 |
| 修改配置 | 低 | 过期时间、水印 |
| 软删除 | 中 | 状态改为 DELETED |
| 彻底清除 | 高 | 删除 DB + R2，不可恢复 |

## 代码索引

| 模块 | 路径 |
|------|------|
| DTO | `apps/server/src/admin/site/admin-site.dto.ts` |
| 服务 | `apps/server/src/admin/site/admin-site.service.ts` |
| 控制器 | `apps/server/src/admin/site/admin-site.controller.ts` |
| 类型 | `apps/admin/src/features/sites/types.ts` |
| API | `apps/admin/src/features/sites/api.ts` |
| Hooks | `apps/admin/src/features/sites/hooks.ts` |
| 列表页 | `apps/admin/src/pages/SitesPage.tsx` |
| 详情页 | `apps/admin/src/pages/SiteDetailPage.tsx` |
