# 智能索引（向量化）系统

## 需求

文件语义搜索：
- 文件内容向量化存储
- 支持语义搜索
- 多租户隔离
- 用户配额管理

## 技术方案

### 架构

```
PC Client
├── vault-watcher      # 文件变化监听
└── sync-engine/
    └── scheduler.ts   # 向量化防抖调度（1000ms）
         │
         │ POST /api/vectorize/file
         ▼
后端服务 (NestJS)
├── VectorizeService   # 队列管理、配额检查
├── VectorizeProcessor # 后台处理（BullMQ）
└── VectorizeClient    # Cloudflare API 封装
         │
         ▼
Cloudflare Vectorize   # 向量存储与检索
```

### 数据模型

```prisma
model VectorizedFile {
  id          String
  userId      String
  fileId      String
  title       String
  vectorizedAt DateTime
  @@unique([userId, fileId])
}

model UserStorageUsage {
  userId          String @unique
  vectorizedCount Int    // 已向量化文件数
}
```

### 向量化流程（伪代码）

```
# PC 端
handleFileChange(event, path):
  if event == 'add' or 'change':
    scheduleVectorize(path)   # 1000ms 防抖
  elif event == 'unlink':
    api.deleteVector(fileId)

# 服务端
VectorizeService.queueVectorize(fileId, content):
  checkQuota(userId)
  queue.add('vectorize', { fileId, content })

VectorizeProcessor.process(job):
  vectorText = `文件：${fileName}\n\n${content}`
  vectorizeClient.upsert({
    id: fileId,
    text: vectorText,
    namespace: `user:${userId}`,
    metadata: { title, vaultId }
  })
  updateDatabase()
```

### 多租户隔离

```
# 存储
namespace: user:{userId}

# 搜索
vectorizeClient.query(text, {
  namespace: `user:${userId}`,
  filter: { vaultId }  // 可选
})
```

### 配额管理

| 用户等级 | 最大向量化文件数 |
|----------|------------------|
| free | 100 |
| starter | 1,000 |
| basic | 3,000 |
| pro | 10,000 |

### 语义搜索

```
POST /api/search
{ query: "会议记录", topK: 10, vaultId?: "xxx" }

Response:
{
  results: [
    { fileId, score: 0.92, title: "周会记录.md" }
  ]
}
```

## 代码索引

| 模块 | 路径 |
|------|------|
| 防抖调度器 | `apps/pc/src/main/cloud-sync/sync-engine/scheduler.ts` |
| 同步引擎 | `apps/pc/src/main/cloud-sync/sync-engine/index.ts` |
| API 客户端 | `apps/pc/src/main/cloud-sync/api/client.ts` |
| 向量化服务 | `apps/server/src/vectorize/vectorize.service.ts` |
| 队列处理器 | `apps/server/src/vectorize/vectorize.processor.ts` |
| Vectorize 客户端 | `apps/server/src/vectorize/vectorize.client.ts` |
| 搜索服务 | `apps/server/src/search/search.service.ts` |
| 配额配置 | `apps/server/src/quota/quota.config.ts` |
