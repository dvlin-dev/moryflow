<!--
[INPUT]: Cloudflare Worker 请求（moryflow.app / *.moryflow.app）
[OUTPUT]: 从 R2 读取并返回站点静态内容（含站点状态/过期/水印）
[POS]: Moryflow 发布站点边缘服务，承载 `moryflow.app` 的内容分发

[PROTOCOL]: 本目录变更需同步更新本文件与上层架构文档（docs/architecture/domains-and-deployment.md）。
-->

# Moryflow Publish Worker

## 目的

- 处理 `moryflow.app` 与 `*.moryflow.app` 的访问请求。
- 根据子域名 `{siteSlug}.moryflow.app` 从 R2 读取站点文件并返回。
- 支持站点状态（OFFLINE/DELETED）、过期提示、404 回退、免费水印注入。
- 仅允许 GET/HEAD，其他方法返回 405 并带 Allow 头。
- OFFLINE/EXPIRED/404 状态页禁缓存（`Cache-Control: no-store, must-revalidate`）。
- `_meta.json` 结构校验失败视为离线，避免异常导致 500。

## 存储约定（R2）

- 站点前缀：`sites/{siteSlug}/...`
- 元数据：`sites/{siteSlug}/_meta.json`
- 首页：`sites/{siteSlug}/index.html`
- 自定义 404：`sites/{siteSlug}/404.html`（可选）

## 运维

- 部署使用 `wrangler`。
- R2 bucket 绑定：`SITE_BUCKET`。
- 环境变量：`SITE_DOMAIN=moryflow.app`。
