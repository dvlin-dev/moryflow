# ActivityLog 日志系统

## 需求

统一的用户行为日志系统：
- 记录关键用户操作事件
- 合并原有 AdminLog
- 支持问题排查和审计追踪

## 技术方案

### 数据模型

```prisma
model ActivityLog {
  id           String    @id
  userId       String    // 操作者
  targetUserId String?   // 目标用户（管理员操作时）
  category     String    // auth | ai | payment | admin | vault | storage | sync
  action       String    // login | chat | grant_credits | ...
  level        String    @default("info")  // info | warn | error
  details      Json      // 请求参数、响应摘要（限制 4KB）
  ip           String?
  userAgent    String?
  duration     Int?      // 耗时（毫秒）
  createdAt    DateTime  @default(now())

  @@index([userId, createdAt])
  @@index([category, action, createdAt])
}
```

### 事件分类

| category | 示例 action |
|----------|-------------|
| `auth` | login, login_failed, register, logout |
| `ai` | chat, speech_transcribe |
| `vault` | note_create, note_delete, vectorize |
| `payment` | credits_purchase, subscription_create |
| `admin` | set_tier, grant_credits, send_email |

### 核心接口

```typescript
interface ActivityLogService {
  // 通用日志记录
  log(params: {
    userId: string
    category: string
    action: string
    level?: 'info' | 'warn' | 'error'
    details?: Record<string, unknown>
    ip?: string
    duration?: number
  }): Promise<void>

  // 便捷方法
  logLogin(userId, ip, userAgent, success): Promise<void>
  logAiChat(userId, details): Promise<void>
  logAdminAction(params): Promise<void>

  // 查询
  query(params): Promise<{ logs, total }>
  getStorageStats(): Promise<Stats>
  deleteOlderThan(days): Promise<{ deletedCount }>
}
```

### details 字段规范

```typescript
// 通用字段
interface BaseDetails {
  requestPath?: string
  statusCode?: number
  error?: string       // level=error 时
}

// AI 事件
interface AiChatDetails extends BaseDetails {
  model: string
  inputTokens: number
  outputTokens: number
  creditsConsumed: number
}
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 模块定义 | `apps/server/src/activity-log/activity-log.module.ts` |
| 核心服务 | `apps/server/src/activity-log/activity-log.service.ts` |
| Admin API | `apps/server/src/activity-log/activity-log.controller.ts` |
| DTO | `apps/server/src/activity-log/dto/` |
| 常量 | `apps/server/src/activity-log/constants.ts` |
| pino 配置 | `apps/server/src/common/logger/pino.config.ts` |
