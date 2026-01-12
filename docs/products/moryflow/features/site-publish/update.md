---
title: 站点更新功能
date: 2026-01-12
scope: moryflow, site-publish
status: archived
archived_date: 2026-01-12
---

<!--
[INPUT]: 历史更新功能说明
[OUTPUT]: 归档追溯信息
[POS]: 归档：站点更新功能

[PROTOCOL]: 本文件为归档记录；仅用于追溯。
-->

# 站点更新功能

## 需求

允许用户在本地文件变更后同步更新线上站点内容。

## 技术方案

### 操作命名规范

| 操作     | 按钮      | API                              | 说明                   |
| -------- | --------- | -------------------------------- | ---------------------- |
| 恢复上线 | Publish   | `POST /sites/:id/online`         | 离线站点恢复，只改状态 |
| 更新内容 | Update    | 构建 + `POST /sites/:id/publish` | 重新读取本地文件并发布 |
| 下线     | Unpublish | `POST /sites/:id/offline`        | 站点下线               |

### UI 设计

**在线站点**：`[Update] [Unpublish] [Delete]`
**离线站点**：`[Publish] [Delete]`

### Update 流程

```
1. 获取站点关联的所有 SitePage
2. 提取 localFilePath 列表
3. 检查文件是否存在
4. 调用 buildAndPublish 重新构建
5. 更新站点内容
```

### 边界情况处理

| 场景             | 处理                        |
| ---------------- | --------------------------- |
| 文件已删除       | 过滤不存在的文件            |
| 所有文件都不存在 | 提示用户                    |
| 站点已下线       | 不显示 Update，需先 Publish |

## 代码索引

| 模块         | 路径                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| 站点控制器   | `apps/moryflow/server/src/site/site.controller.ts`                         |
| IPC 类型     | `apps/moryflow/pc/src/shared/ipc/site-publish.ts`                          |
| 主进程逻辑   | `apps/moryflow/pc/src/main/site-publish/index.ts`                          |
| Sites 页面   | `apps/moryflow/pc/src/renderer/workspace/components/sites/index.tsx`       |
| 站点详情组件 | `apps/moryflow/pc/src/renderer/workspace/components/sites/site-detail.tsx` |
