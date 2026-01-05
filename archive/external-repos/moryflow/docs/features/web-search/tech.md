# 联网搜索

## 需求

为 AI 对话提供联网搜索能力：
- AI 自动调用：实时信息查询、事实核查
- 用户手动触发：搜索后选择引用
- 智能引用：搜索结果注入对话上下文

## 技术方案

### 架构

```
客户端（PC / Mobile）
├── SearchPanel UI
├── SearchStore (Zustand)
└── SearchAPI
         │
         │ POST /api/search
         ▼
Server（NestJS）
├── SearchController
├── SearchService   ← Redis 缓存 5 分钟
└── ExaClient       → Exa AI API
```

### 请求/响应

```typescript
// 请求
interface SearchRequest {
  query: string
  type?: 'auto' | 'neural' | 'deep'
  category?: 'company' | 'research paper' | 'news' | 'pdf' | 'github'
  numResults?: number       // 默认 5，最大 10
  includeDomains?: string[]
  excludeDomains?: string[]
  includeText?: boolean     // 返回全文（增加成本）
}

// 响应
interface SearchResponse {
  results: Array<{
    id: string
    title: string
    url: string
    publishedDate?: string
    highlights?: string[]   // 高亮片段
    summary?: string
  }>
  cached: boolean
}
```

### AI Tool 定义

```typescript
const webSearchTool = {
  name: 'web_search',
  description: '搜索互联网获取实时信息',
  parameters: z.object({
    query: z.string(),
    category: z.enum(['news', 'research paper', 'github']).optional()
  })
}
```

### 核心逻辑（伪代码）

```
search(userId, dto):
  # 1. 配额检查
  quotaService.checkSearchQuota(userId)

  # 2. 缓存检查
  cacheKey = md5(dto)
  if not dto.skipCache:
    cached = redis.get(cacheKey)
    if cached: return cached

  # 3. 调用 Exa API
  result = exaClient.search(dto)

  # 4. 写入缓存（5 分钟）
  redis.setex(cacheKey, 300, result)

  # 5. 扣除配额
  quotaService.deductSearchQuota(userId)

  return result
```

### 成本控制

| 项 | 定价 | 控制策略 |
|----|------|----------|
| Neural Search | $0.005/次 | 限制每日次数 |
| Deep Search | $0.015/次 | 仅研究场景 |
| Content Text | $0.001/页 | 默认只获取 highlights |

建议配额：免费用户 10 次/日，付费用户 100 次/日

## 代码索引

| 模块 | 路径 |
|------|------|
| 模块定义 | `apps/server/src/search/search.module.ts` |
| 控制器 | `apps/server/src/search/search.controller.ts` |
| 服务 | `apps/server/src/search/search.service.ts` |
| Exa 客户端 | `apps/server/src/search/exa.client.ts` |
| 类型定义 | `packages/shared-api/src/search/types.ts` |
| PC 搜索面板 | `apps/pc/src/renderer/components/search/SearchPanel/` |
| Mobile 搜索面板 | `apps/mobile/components/search/SearchSheet/` |
