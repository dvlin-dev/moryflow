# Entity Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Memox 实体模块（Mem0 V1 对齐）。提供 user/agent/app/run 的注册与列表能力。

**数据存储**：向量库（`VectorPrismaService` → `MemoxEntity` + `Memory`）

## Responsibilities

**Does:**

- 创建 user/agent/app/run 实体（upsert）
- 列出实体（含 `total_memories`）
- `total_memories` 使用聚合查询（去除 N+1），并默认过滤过期 memory
- 返回实体筛选器（types + count）
- metadata JSON 字段显式 DbNull 处理（`entity.repository.ts`）

**Does NOT:**

- 知识图谱 CRUD
- Console 私有接口

## Member List

| File                   | Type       | Description                            |
| ---------------------- | ---------- | -------------------------------------- |
| `entity.controller.ts` | Controller | Mem0 entity endpoints                  |
| `entity.service.ts`    | Service    | Core business logic + aggregated count |
| `entity.repository.ts` | Repository | MemoxEntity data access                |
| `entity.module.ts`     | Module     | NestJS module definition               |
| `dto/entity.schema.ts` | Schema     | Zod schemas + inferred types           |
| `dto/index.ts`         | Export     | DTO exports                            |
| `index.ts`             | Export     | Public module exports                  |

## API Endpoints

```
Public API (v1) - ApiKeyGuard:
  GET  /v1/entities
  GET  /v1/entities/filters
  POST /v1/users
  POST /v1/agents
  POST /v1/apps
  POST /v1/runs
```

## Key Schemas

```typescript
CreateUserSchema = { user_id: string, metadata?: object }
CreateAgentSchema = { agent_id: string, name?: string, metadata?: object }
CreateAppSchema = { app_id: string, name?: string, metadata?: object }
CreateRunSchema = { run_id: string, name?: string, metadata?: object }
```

## Dependencies

```
entity/
└── depends on → vector-prisma/ (MemoxEntity + Memory 聚合统计)
```

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions_
