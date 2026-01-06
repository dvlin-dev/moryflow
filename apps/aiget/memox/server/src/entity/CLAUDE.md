# Entity Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

实体抽取与管理模块。使用 LLM 从记忆内容中抽取实体（人名、地点、概念等）。

## 职责

**包含：**

- 实体抽取
- 实体 CRUD
- 跨记忆实体关联
- 实体类型分类
- `properties` 字段输入使用 `JsonValueSchema`，输出使用 `asRecordOrNull` 收敛为对象或 null

**不包含：**

- 关系抽取（由 relation/ 负责）
- 记忆存储（由 memory/ 负责）
- LLM 调用封装（由 extract/ 负责）

## 成员清单

| 文件                           | 类型       | 说明              |
| ------------------------------ | ---------- | ----------------- |
| `entity.controller.ts`         | Controller | 公网 API          |
| `console-entity.controller.ts` | Controller | Console API       |
| `entity.service.ts`            | Service    | 业务逻辑          |
| `entity.repository.ts`         | Repository | 数据库操作        |
| `entity.module.ts`             | Module     | NestJS 模块定义   |
| `entity.errors.ts`             | Errors     | 自定义错误        |
| `dto/entity.schema.ts`         | Schema     | Zod schemas + DTO |
| `dto/index.ts`                 | Export     | DTO 导出          |
| `index.ts`                     | Export     | 模块导出          |

## 依赖关系

```
entity/
├── 依赖 → extract/（LLM 抽取）
├── 依赖 → prisma/（数据库）
├── 被依赖 ← memory/（实体关联）
└── 被依赖 ← graph/（知识图谱）
```

---

_见 [apps/aiget/memox/server/CLAUDE.md](../CLAUDE.md) 获取服务端约定_
