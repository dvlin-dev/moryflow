---
title: 云同步自动绑定（实现方案）
date: 2026-01-12
scope: moryflow, pc
status: active
---

<!--
[INPUT]: 登录后自动绑定 Vault；新用户创建 vault；老用户按目录名匹配；失败重试与降级
[OUTPUT]: 可实现的自动绑定逻辑（伪代码 + 状态映射 + 代码索引）
[POS]: Moryflow 内部技术文档：云同步自动绑定

[PROTOCOL]: 本文件变更时同步更新 `docs/products/moryflow/index.md`（索引与范围）。
-->

# 云同步自动绑定

## 需求

将云同步从"手动开启"改为"默认开启"：

- 登录后自动绑定 Vault 并开始同步
- 静默体验，无 Toast 无弹窗
- 支持新用户和老用户换设备场景

## 技术方案

### 核心场景

| 场景         | 期望行为                  |
| ------------ | ------------------------- |
| 新用户       | 静默创建云端 Vault 并绑定 |
| 老用户换设备 | 按目录名匹配云端 Vault    |

### 核心逻辑（伪代码）

```
tryAutoBinding(vaultPath):
  # 1. 检查是否已绑定
  if readBinding(vaultPath):
    return existing

  # 2. 获取云端 Vault 列表
  vaults = cloudSyncApi.listVaults()

  # 3. 按本地目录名匹配
  localName = path.basename(vaultPath)
  matched = vaults.find(v => v.name == localName)

  # 4. 匹配到则绑定，否则创建
  vaultId = matched ? matched.id : cloudSyncApi.createVault(localName).id

  # 5. 注册设备 + 保存绑定
  cloudSyncApi.registerDevice(vaultId, deviceId)
  writeBinding({ localPath, vaultId })
```

### 错误处理

- 最大重试 3 次，指数退避（2s, 4s, 6s）
- 超过重试次数进入降级模式（offline）

### 状态映射

| 场景       | binding | status   | UI 显示      |
| ---------- | ------- | -------- | ------------ |
| 未登录     | null    | disabled | 请先登录     |
| 自动绑定中 | null    | syncing  | loading      |
| 绑定成功   | 有值    | idle     | 正常同步     |
| 绑定失败   | null    | offline  | 自动绑定失败 |

## 代码索引

| 模块         | 路径                                                        |
| ------------ | ----------------------------------------------------------- |
| 自动绑定模块 | `apps/moryflow/pc/src/main/cloud-sync/auto-binding.ts`      |
| 同步引擎     | `apps/moryflow/pc/src/main/cloud-sync/sync-engine/index.ts` |
| 主进程监听   | `apps/moryflow/pc/src/main/index.ts`                        |
