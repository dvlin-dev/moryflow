---
title: 统一登录与 Digest 前端架构
date: 2026-01-14
scope: anyhunt.app, server.anyhunt.app
status: draft
---

# 统一登录与 Digest 前端架构

> 本文档定义 Anyhunt Dev 的统一登录架构，以及 Digest（智能信息订阅）功能在各前端应用中的边界划分。

## 背景

### 问题

1. **登录分散**：www、console、admin 各自有登录页面，用户体验割裂
2. **功能错位**：Digest 订阅管理（C 端功能）放在了 Console（开发者工具）中
3. **域名浪费**：`anyhunt.app` 仅作为官网落地页，未充分利用

### 目标

1. 统一登录入口到 `anyhunt.app`
2. 将 `anyhunt.app` 从官网升级为主产品（面向 C 端用户）
3. Console 回归开发者工具定位
4. 跨子域 Session 共享

---

## 架构设计

### 应用定位

| 应用        | 域名                  | 定位       | 目标用户                       |
| ----------- | --------------------- | ---------- | ------------------------------ |
| **www**     | `anyhunt.app`         | 主产品     | C 端用户（内容消费者、创作者） |
| **console** | `console.anyhunt.app` | 开发者工具 | 开发者（API 调用、调试）       |
| **admin**   | `admin.anyhunt.app`   | 运营后台   | 管理员（审核、监控）           |
| **server**  | `server.anyhunt.app`  | API 服务   | 所有客户端                     |

### 统一登录流程

```
┌─────────────────────────────────────────────────────────────┐
│                        登录流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户访问 console.anyhunt.app                                  │
│       │                                                     │
│       ▼                                                     │
│  检查 Session Cookie (.anyhunt.app)                           │
│       │                                                     │
│       ├── 有效 → 允许访问                                    │
│       │                                                     │
│       └── 无效 → 重定向到 anyhunt.app/login?redirect=...      │
│                     │                                       │
│                     ▼                                       │
│              用户在 www 登录                                 │
│                     │                                       │
│                     ▼                                       │
│          设置 Cookie (domain=.anyhunt.app)                    │
│                     │                                       │
│                     ▼                                       │
│          重定向回原地址 (redirect 参数)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cookie 配置

```typescript
// Better Auth 配置
{
  cookie: {
    domain: '.anyhunt.app',  // 带点前缀，允许所有子域访问
    secure: true,          // 仅 HTTPS
    sameSite: 'lax',       // 允许跨站 GET 请求携带
  },
  trustedOrigins: [
    'https://anyhunt.app',
    'https://console.anyhunt.app',
    'https://admin.anyhunt.app',
  ],
}
```

### 登录入口

| 路由                          | 说明       |
| ----------------------------- | ---------- |
| `anyhunt.app/login`           | 统一登录页 |
| `anyhunt.app/register`        | 注册页     |
| `anyhunt.app/forgot-password` | 密码重置   |

### 重定向逻辑

```typescript
// 登录成功后
const redirect = searchParams.get('redirect');

if (redirect && isAllowedRedirect(redirect)) {
  // 跳转到来源地址
  window.location.href = redirect;
} else {
  // 默认跳转到用户仪表盘
  router.push('/dashboard');
}

// 允许的重定向域名
function isAllowedRedirect(url: string): boolean {
  const allowed = ['anyhunt.app', 'console.anyhunt.app', 'admin.anyhunt.app'];
  const hostname = new URL(url).hostname;
  return allowed.some((d) => hostname === d || hostname.endsWith('.' + d));
}
```

---

## 功能边界划分

### www (anyhunt.app) - 主产品

#### 公开页面（无需登录）

| 路由                         | 说明                              |
| ---------------------------- | --------------------------------- |
| `/`                          | Reader（Digest 主入口，三栏布局） |
| `/developer`                 | Developer hub（导航页）           |
| `/fetchx`                    | Fetchx 模块介绍                   |
| `/memox`                     | Memox 模块介绍                    |
| `/pricing`                   | 价格页                            |
| `/topics`                    | 浏览公开 Topics                   |
| `/topics/:slug`              | Topic 详情页                      |
| `/topics/:slug/editions/:id` | Edition 详情页                    |
| `/login`                     | 统一登录（打开 Auth 弹窗）        |
| `/register`                  | 注册（打开 Auth 弹窗）            |
| `/forgot-password`           | 忘记密码（打开 Auth 弹窗）        |

#### 用户页面（需登录）

www 不再维护独立的“用户页面路由”。登录后的所有 C 端操作（Inbox、Subscriptions、Account Settings、Publish 等）统一在 `/` 的 Reader 壳层内通过弹窗/三栏视图完成，避免跳转与上下文丢失。

### console.anyhunt.app - 开发者工具

| 路由                 | 说明                         | 变更                   |
| -------------------- | ---------------------------- | ---------------------- |
| `/`                  | 开发者仪表盘（API 用量概览） | 保留                   |
| `/api-keys`          | API Key 管理                 | 保留                   |
| `/fetchx/scrape`     | Fetchx 单页抓取测试          | 保留                   |
| `/fetchx/crawl`      | 多页爬取测试                 | 保留                   |
| `/fetchx/map`        | URL 发现测试                 | 保留                   |
| `/fetchx/extract`    | AI 提取测试                  | 保留                   |
| `/fetchx/search`     | 搜索测试                     | 保留                   |
| `/playground/digest` | Digest API 测试              | **新增**               |
| `/webhooks`          | Webhook 配置                 | 保留                   |
| `/usage`             | 详细用量统计                 | 保留                   |
| `/digest/*`          | 订阅管理、收件箱等           | **移除（迁移到 www）** |

### admin.anyhunt.app - 运营后台

| 变更          | 说明                                                      |
| ------------- | --------------------------------------------------------- |
| 移除 `/login` | 改为跳转到 `anyhunt.app/login?redirect=admin.anyhunt.app` |
| 其他功能保留  | 用户管理、举报审核、队列监控等                            |

---

## API 认证方式

### 双认证支持

Digest API 同时支持两种认证方式：

| 场景            | 认证方式 | Header              | 说明           |
| --------------- | -------- | ------------------- | -------------- |
| www 用户操作    | Session  | Cookie              | 登录后自动携带 |
| 开发者 API 调用 | API Key  | `X-API-Key: ah_xxx` | 开发者集成     |

### 后端实现

```typescript
// 示例：订阅列表 API
@Controller({ path: 'digest/subscriptions', version: '1' })
export class DigestSubscriptionController {
  // Session 认证（www 用户）
  @Get()
  @UseGuards(AuthGuard)
  async listMySubscriptions(@CurrentUser() user: CurrentUserDto) {
    return this.service.findByUserId(user.id);
  }

  // API Key 认证（开发者）
  @Get('api')
  @UseGuards(ApiKeyGuard)
  async listSubscriptionsViaApi(@CurrentApiKey() apiKey: ApiKeyDto) {
    return this.service.findByApiKeyId(apiKey.id);
  }
}
```

---

## 迁移计划

### Phase 1: 统一登录

1. www 新增 `/login`、`/register`、`/forgot-password` 页面
2. 配置 Better Auth Cookie domain 为 `.anyhunt.app`
3. Console 移除登录页，改为重定向
4. Admin 移除登录页，改为重定向

### Phase 2: www 用户功能

1. www 新增用户路由（`/dashboard`、`/inbox`、`/subscriptions` 等）
2. 迁移 Console 中的 Digest 组件到 www
3. 实现收件箱、订阅管理、Topic 发布功能

### Phase 3: Console 精简

1. 移除 Console 中的 Digest 管理功能
2. 新增 Digest API Playground
3. 更新导航，添加"前往 www 管理订阅"入口

---

## 技术考虑

### www 技术栈

当前：TanStack Start (SSR)

新增登录态页面后：

- 需要集成 Better Auth 客户端
- 需要处理 SSR 中的认证状态
- 建议使用 `@tanstack/react-query` 管理数据

### 组件复用

从 Console 迁移的组件：

- `create-subscription-dialog.tsx`
- `subscription-list.tsx`
- `inbox-item-card.tsx`
- `publish-topic-dialog.tsx`
- `edit-topic-dialog.tsx`
- `topic-list.tsx`

迁移时注意：

- 调整导入路径
- 统一使用 `/ui` 组件
- 表单使用 `zod/v3` 兼容层

---

## 相关文档

- [Auth 系统入口](../../../architecture/auth.md)
- [v2 智能信息订阅](./v2-intelligent-digest.md)
- [Auth 流程与接口约定](../../../guides/auth/auth-flows-and-endpoints.md)

---

_版本: 1.0 | 创建日期: 2026-01-14_
