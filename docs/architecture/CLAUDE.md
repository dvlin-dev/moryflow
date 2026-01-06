<!--
[INPUT]: 架构/部署相关文档（域名、路由、服务边界、数据模型、运维约束）
[OUTPUT]: 可执行的系统设计说明，供实现与部署对齐
[POS]: docs/architecture/ 的协作入口与索引

[PROTOCOL]: 本目录新增/更新“最终决策类”文档时，应同步更新 docs/CLAUDE.md 与根 CLAUDE.md 的文档索引（若影响全局）。
-->

# docs/architecture/ 指南

## 目标

- 把“已拍板的架构决策”固化为可执行规范，避免口头约定漂移。
- 以个人/小团队可维护为优先：复杂度足够低，但保留未来升级空间。

## 文档清单

- `subdomain-uip-architecture.md`：主域名 + 子域名（`*.aiget.dev`）统一用户系统与计费的推荐落地方案。
  - 默认鉴权：Token 优先（Web 使用 refresh cookie + access token）
  - 发布站点：`moryflow.app` 由 Cloudflare Worker + R2 按子域名提供静态站点
- `unified-identity-platform.md`：统一身份平台（UIP）入口与关键约束（短文档，指向 uip/ 拆分文档）。
- `uip/`：UIP 拆分文档目录（见 `uip/index.md`）。
