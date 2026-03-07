# /types

> Anyhunt 跨业务线共享类型定义（不代表账号/数据互通）

## 目录结构

```
src/
└── common/              # 通用基础类型
    ├── api.ts           # API 响应元数据与错误结构
    └── chat.ts          # 聊天消息与附件类型
```

> 类型可在 Moryflow 与 Anyhunt Dev 复用，但业务数据严格隔离。

## 导入方式

```typescript
import type { ChatAttachment, PaginationMeta, ProblemDetails } from '@moryflow/types';
```

## 类型规范

1. **常量对象 + 类型推断**：使用 `as const` + `typeof` 模式
2. **接口命名**：驼峰命名，描述性名称
3. **文件头注释**：`[DEFINES]`, `[USED_BY]`, `[POS]`
