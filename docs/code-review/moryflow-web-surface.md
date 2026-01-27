---
title: Moryflow Admin/WWW/Site Template Code Review
date: 2026-01-24
scope: apps/moryflow/admin, apps/moryflow/www, apps/moryflow/site-template
status: done
---

<!--
[INPUT]: apps/moryflow/admin, apps/moryflow/www, apps/moryflow/site-template
[OUTPUT]: 问题清单 + 修复建议 + 进度记录
[POS]: Phase 3 / P2 模块审查记录（Moryflow Admin/WWW/Site Template）
[PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/index.md、docs/index.md、docs/CLAUDE.md
-->

# Moryflow Admin/WWW/Site Template Code Review

## 范围

- 管理后台：`apps/moryflow/admin/`
- 官网（SSR）：`apps/moryflow/www/`（含 `server/routes`）
- 站点模板：`apps/moryflow/site-template/`

## 结论摘要

- 高风险问题（P1）：1 个（已修复）
- 中风险问题（P2）：3 个（已修复）
- 低风险/规范问题（P3）：3 个（已修复）
- 待确认/延后：0 个

## 发现（按严重程度排序）

- [P1] 管理后台未强制管理员身份校验（非管理员可能进入 UI）
  - 调研：
    - 后端鉴权应强制，但前端也应做最小门槛校验，避免误导或暴露管理入口
    - Admin UI 不应对非管理员展示主界面与敏感页面
  - 解决方案（已落地）：
    - `bootstrap` 与 `signIn` 明确校验 `user.isAdmin`，非管理员清空状态并提示错误
    - 补充 AuthStore 回归测试（非管理员应被拒绝）
  - 关联改动：
    - `apps/moryflow/admin/src/stores/auth.ts`
    - `apps/moryflow/admin/src/stores/auth.test.ts`

- [P2] 管理后台重复挂载 QueryClientProvider（缓存分裂 + 默认配置冲突）
  - 调研：
    - React Query 建议单一 QueryClient 实例，避免多个 provider 造成缓存隔离与重复请求
  - 解决方案（已落地）：
    - 入口统一初始化 QueryClient，移除 App 内重复 Provider
  - 关联改动：
    - `apps/moryflow/admin/src/main.tsx`
    - `apps/moryflow/admin/src/App.tsx`

- [P2] 官网 SEO 配置指向错误域名与不存在的资产
  - 调研：
    - canonical / og:url 必须与主域名一致，否则搜索引擎可能分裂索引
    - OG 图片与 JSON-LD logo 不应指向不存在资源
  - 解决方案（已落地）：
    - 统一主域名为 `https://www.moryflow.com`
    - OG 图片/Logo 指向现有 `og-image.svg` 与 `logo.svg`
  - 关联改动：
    - `apps/moryflow/www/src/lib/seo.ts`
    - `apps/moryflow/www/src/components/seo/JsonLd.tsx`
    - `apps/moryflow/www/server/routes/sitemap.xml.ts`
    - `apps/moryflow/www/server/routes/robots.txt.ts`
    - `apps/moryflow/www/vite.config.ts`

- [P2] 健康检查使用 UI 路由，占用 SSR 渲染链路
  - 调研：
    - 健康检查应由 server route 提供轻量 JSON 响应，避免 SSR 负担
  - 解决方案（已落地）：
    - 新增 Nitro `server/routes/api/health.ts` 返回 JSON
    - 移除 UI 路由 `/api/health`
    - 删除历史 `server/api/health.ts`，避免重复入口
    - 补充服务端路由单测
  - 关联改动：
    - `apps/moryflow/www/server/api/health.ts`（已删除）
    - `apps/moryflow/www/server/routes/api/health.ts`
    - `apps/moryflow/www/server/routes/__tests__/health.spec.ts`
    - `apps/moryflow/www/src/routeTree.gen.ts`

- [P3] Site Template 文档缺少 `MENU_TOGGLE_SCRIPT` 占位符说明
  - 调研：
    - 发布模板占位符必须与 `sync.ts` 输出一致，否则易误删/误用
  - 解决方案（已落地）：
    - 在 `CLAUDE.md` 补充通用占位符说明
  - 关联改动：
    - `apps/moryflow/site-template/CLAUDE.md`

- [P3] 管理后台仍使用 `@hugeicons/*` 图标库
  - 调研：
    - UI/UX 规范要求统一 Lucide，避免混用图标库
  - 解决方案（已落地）：
    - 迁移到 `lucide-react`，直接使用组件渲染（如 `<ChevronDown />`）
    - 清理 `@hugeicons/*` 依赖
  - 关联改动：
    - `apps/moryflow/admin/src/components/ui/icon.tsx`
    - `apps/moryflow/admin/src/pages/*`
    - `apps/moryflow/admin/src/features/*`
    - `apps/moryflow/admin/package.json`

- [P3] 站点模板的 `index-page.html`/`404.html` 缺少 `lang` 与 `description` 占位符
  - 调研：
    - SEO 页面建议配置 `lang` 与 `meta description`
  - 解决方案（已落地）：
    - 模板新增 `{{lang}}`/`{{description}}` 占位符
    - 发布链路补齐 `lang`（默认 `en`）与 `description`
  - 关联改动：
    - `apps/moryflow/site-template/src/templates/index-page.html`
    - `apps/moryflow/site-template/src/templates/404.html`
    - `apps/moryflow/pc/src/main/site-publish/builder/pages.ts`
    - `apps/moryflow/pc/src/main/site-publish/builder/index.ts`
    - `apps/moryflow/pc/src/main/site-publish/handlers.ts`

## 修复计划与进度

- 状态：done
- 已完成：
  - Admin 管理员身份强制校验 + 回归测试
  - React Query Provider 去重
  - 官网 SEO 主域名与 OG 资源修复
  - 健康检查改为 Nitro server route + 单测
  - Site Template 文档占位符补齐
  - Admin 全量 Lucide 图标迁移
  - 站点模板补齐 `lang` + `description` 占位符并同步发布链路
- 验证记录（2026-01-24）：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
