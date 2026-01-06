---
title: 改造进度记录
date: 2026-01-07
scope: moryflow.com, aiget.dev
status: active
---

<!--
[INPUT]: 近期改造内容与里程碑计划
[OUTPUT]: 当前进度 + 下一步行动清单
[POS]: 改造进度追踪文档

[PROTOCOL]: 本文件变更需同步更新 docs/CLAUDE.md 与根 CLAUDE.md 的文档索引。
-->

# 改造进度记录

## 当前进度（截至 2026-01-07）

### 已完成

- 用户系统与 Fetchx 接入方案已更新：`docs/features/user-system/fetchx-integration-plan.md`
- Auth 服务模板已落地：`templates/auth-service/README.md`、`.env.example`、`CLAUDE.md`
- Aiget Dev Console/Admin 已接入 `@aiget/auth-client`（含 refresh 流程与用户态映射）
- 清理旧版后台：删除 `apps/aiget/admin/www-old`
- ESLint 体系收口：根配置补齐 react-refresh/react-hooks 插件，console/admin 组件目录允许多导出
- Moryflow 侧 lint/type 修复（admin/server/mobile）

### 已验证

- `pnpm lint`（通过，mobile 仍有 warning）
- `pnpm typecheck`（通过）
- `pnpm test:unit`（通过，Redis/网络相关日志为测试噪音）

## 当前风险与待处理

- `apps/moryflow/mobile` 仍有 `react-hooks/exhaustive-deps` 与 `no-console` 警告
- `model-registry-data` 拉取依赖外网（离线会使用缓存）

## 下一步（按优先级）

1. **落地 Aiget Dev Auth Service 部署**
   - 配置 `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`TRUSTED_ORIGINS`、`COOKIE_DOMAIN`
   - 绑定 `console.aiget.dev` / `admin.aiget.dev` 的 `/api/v1/auth/*` 反代
2. **Fetchx 服务侧切换认证**
   - 移除 `apps/aiget/fetchx/server/src/auth` 旧逻辑
   - 接入 Auth Service 的 JWKS 验签与 API key 鉴权
3. **Console/Admin 能力补齐**
   - API key 管理（生成/轮换/禁用）
   - 基础用量/配额展示
4. **补齐开源与复用文档**
   - Auth 模板 README 增补部署示例与最小配置
   - 输出独立的快速接入步骤（若需对外开源）
