# Shared API

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

共享 API 客户端与类型定义，为前端应用提供统一的后端 API 调用接口。

## 职责

- API 客户端封装
- 请求/响应类型定义
- 路径常量定义
- 会员相关 API

## 约束

- 类型定义需与 server 端保持同步
- 被 pc、mobile、server 共同使用
- 修改时需评估对所有使用方的影响

## 成员清单

| 文件/目录 | 类型 | 说明 |
|-----------|------|------|
| `index.ts` | 入口 | 主导出 |
| `paths.ts` | 常量 | API 路径常量 |
| `membership/` | 目录 | 会员相关 API 与类型 |
| `file-index/` | 目录 | 文件索引相关 API |

## 常见修改场景

| 场景 | 涉及文件 | 注意事项 |
|------|----------|----------|
| 新增 API 路径 | `paths.ts` | 保持命名一致性 |
| 修改会员 API | `membership/` | 同步更新 server 端 |
| 新增类型定义 | 对应模块 | 同步更新 server 端类型 |

## 依赖关系

```
shared-api/
├── 被依赖 ← apps/pc（API 调用）
├── 被依赖 ← apps/mobile（API 调用）
├── 被依赖 ← apps/server（类型复用）
└── 被依赖 ← apps/admin（API 调用）
```

## 类型同步规范

当修改 API 类型时，需要同步检查：

1. **Server 端**：`apps/server/src/` 对应模块的 DTO
2. **PC 端**：`apps/pc/src/` 的 API 调用处
3. **Mobile 端**：`apps/mobile/lib/` 的 API 调用处
4. **Admin 端**：`apps/admin/src/` 的 API 调用处
