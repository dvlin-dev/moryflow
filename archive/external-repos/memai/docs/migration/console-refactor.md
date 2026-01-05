# Console 改造记录

## 背景

Console 从截图服务项目迁移而来，需要清理旧代码并完善 Memory 服务功能。

## 已完成的改造

### 代码清理

| 模块 | 改造内容 |
|------|---------|
| Webhook | `SCREENSHOT_*` 事件 → `MEMORY_*` 事件 |
| Redis | `SCREENSHOT` 前缀 → 通用缓存方法 |
| Queue | `SCREENSHOT_QUEUE` → `TASK_QUEUE` |
| Admin | Dashboard 统计从截图改为 Memory |

### 新增功能

| 功能 | 实现位置 |
|------|---------|
| Entity 管理 | `apps/console/src/features/entities/` |
| Webhook 投递日志 | `apps/console/src/pages/WebhookDeliveriesPage.tsx` |
| Memory 导出 | `apps/server/src/memory/console-memory.controller.ts` |
| Playground 增强 | Get/Delete/List Memory, cURL 生成 |
| API 使用统计 | `apps/server/src/usage/console-stats.controller.ts` |

### 依赖清理

已移除：
- playwright（截图引擎）
- @aws-sdk（旧存储）
- sharp（图片处理）

---

*完成时间: 2026-01-02*
