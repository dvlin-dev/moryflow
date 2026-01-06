# AI Memory 方案调研

## 需求

为 AI Agent 提供持久化记忆能力：
- 跨会话记忆保持
- 语义检索相关记忆
- 记忆压缩与遗忘

## 技术方案

### 主流方案对比

| 方案 | Stars | 特点 | 适用场景 |
|------|-------|------|----------|
| Mem0 | 44.7k | 多级记忆、API 简洁 | 通用 AI 助手 |
| Cognee | 10.6k | ECL 管道、知识图谱 | 知识密集型 |
| Zep | 3.9k | 时序图谱、低延迟 | 企业级 Agent |
| Letta | 20.3k | 虚拟上下文、自编辑 | 长对话场景 |
| GraphRAG | 30k | 社区检测、全局搜索 | 文档问答 |

### 推荐方案：自研轻量方案

理由：已有向量化基础设施、Agent 框架可扩展、完全可控

### 架构设计

```
MemoryLayer (packages/agents-memory/)
├── MemoryManager
│   ├── addMemory(content, metadata)
│   ├── searchMemory(query, options)
│   ├── summarizeSession(sessionId)
│   └── forgetOld(retentionDays)
│
├── 存储层
│   └── PostgreSQL + pgvector
│
└── Agent 集成
    ├── 对话前自动检索相关记忆
    └── 对话后自动提取关键信息
```

### 核心数据模型

```typescript
interface MemoryItem {
  id: string
  content: string
  embedding: number[]
  metadata: {
    userId: string
    sessionId: string
    timestamp: Date
    type: 'user' | 'assistant' | 'system'
  }
}

interface MemoryStore {
  add(item): Promise<MemoryItem>
  search(query, options?): Promise<MemoryItem[]>
  delete(id): Promise<void>
}
```

### 实现阶段

| 阶段 | 目标 |
|------|------|
| Phase 1 | 对话向量化 + 语义检索 |
| Phase 2 | 记忆压缩与摘要 |
| Phase 3 | 知识图谱（可选） |
| Phase 4 | Agent 深度集成 |

## 代码索引

| 模块 | 路径 |
|------|------|
| Session 接口 | `packages/agents-core/src/memory/session.ts` |
| SessionStore | `packages/agents-runtime/src/session.ts` |
| Mobile 实现 | `apps/mobile/lib/agent-runtime/session-store.ts` |
| PC 实现 | `apps/pc/src/main/chat-session-store/` |
| 向量化服务 | `apps/vectorize/src/index.ts` |
