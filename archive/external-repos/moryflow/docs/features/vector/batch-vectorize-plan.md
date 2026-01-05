# 批量向量化

## 需求

解决首次启用智能索引时已有文件不会被向量化的问题：
- 首次同步时，上传的文件自动进入向量化队列
- 增量同步时，新上传的文件自动进入向量化队列

## 技术方案

### 核心思路

**将向量化集成到同步 commit 流程中**

### 流程

```
PC 客户端:
  文件变化 → syncDiff → actions → commit

后端 SyncService.commitSync():
  1. 乐观锁校验
  2. upsert SyncFile 记录
  3. 软删除处理
  4. 更新 lastSyncAt
  5. 【新增】对 upload 文件入队向量化
      → VectorizeService.queueFromSync()
      → 检查 vectorizeEnabled
      → 过滤：size <= 100KB，isMarkdown
      → 批量加入 BullMQ 队列
```

### 入队条件

| 条件 | 说明 |
|------|------|
| action = upload | 仅上传的文件 |
| size <= 100KB | 大小限制 |
| .md/.markdown | 仅 Markdown 文件 |

### 两种触发路径

| 路径 | 触发场景 | content 来源 |
|------|----------|--------------|
| PC 端触发 | 文件实时变化 | PC 端传入 |
| commit 触发 | 同步完成后 | 后端从 R2 读取 |

### 去重保证

- 队列 jobId: `${userId}:${fileId}`
- 数据库 `@@unique([userId, fileId])`

## 代码索引

| 模块 | 路径 |
|------|------|
| 同步服务 | `apps/server/src/sync/sync.service.ts` |
| 同步 DTO | `apps/server/src/sync/dto/sync.dto.ts` |
| 向量化服务 | `apps/server/src/vectorize/vectorize.service.ts` |
| 向量化处理器 | `apps/server/src/vectorize/vectorize.processor.ts` |
