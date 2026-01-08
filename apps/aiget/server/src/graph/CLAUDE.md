# Graph Module

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

知识图谱相关操作，提供实体/关系的遍历与查询能力。

**数据来源**：通过 Repository 层查询向量库

## 职责

**包含：**

- 图遍历与路径查询
- 子图抽取
- 图可视化数据输出
- 节点/边 `properties` 字段输出使用 `asRecordOrNull` 收敛 JSON

**不包含：**

- 实体管理（由 entity/ 负责）
- 关系管理（由 relation/ 负责）
- 记忆存储（由 memory/ 负责）

## 成员清单

| 文件                  | 类型       | 说明              |
| --------------------- | ---------- | ----------------- |
| `graph.controller.ts` | Controller | 图查询 API        |
| `graph.service.ts`    | Service    | 图查询逻辑        |
| `graph.module.ts`     | Module     | NestJS 模块定义   |
| `dto/graph.schema.ts` | Schema     | Zod schemas + DTO |
| `dto/index.ts`        | Export     | DTO 导出          |
| `index.ts`            | Export     | 模块导出          |

## 依赖关系

```
graph/
├── 依赖 → entity/（EntityRepository - 向量库）
└── 依赖 → relation/（RelationRepository - 向量库）
```

---

_见 [apps/aiget/server/CLAUDE.md](../../CLAUDE.md) 获取服务端约定_
