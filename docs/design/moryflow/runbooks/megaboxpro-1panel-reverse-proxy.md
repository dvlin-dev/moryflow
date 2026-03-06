---
title: megaboxpro（1panel）反代路由配置（Moryflow 视角）
date: 2026-02-28
scope: moryflow ingress, 1panel, nginx
status: active
---

<!--
[INPUT]: Moryflow 域名入口、4c6g 服务端口、megaboxpro 入口反代规则
[OUTPUT]: Moryflow 反代最小执行清单（避免与平台全量表重复维护）
[POS]: Moryflow Runbooks / Ingress

[PROTOCOL]: 本文件变更需同步 `docs/design/moryflow/runbooks/index.md`、`docs/design/anyhunt/runbooks/megaboxpro-1panel-reverse-proxy.md` 与 `docs/design/anyhunt/core/domains-and-deployment.md`。
-->

# megaboxpro（1panel）反代路由配置（Moryflow 视角）

## 1. 单一事实源

全平台 Host -> Upstream 全量表维护在：

- `docs/design/anyhunt/runbooks/megaboxpro-1panel-reverse-proxy.md`

本文件仅保留 Moryflow 必需映射与验收点。

## 2. Moryflow 必需映射

| Host                              | Upstream                |
| --------------------------------- | ----------------------- |
| `www.moryflow.com`                | `http://<4c6g-ip>:3102` |
| `docs.moryflow.com`               | `http://<4c6g-ip>:3103` |
| `server.moryflow.com`             | `http://<4c6g-ip>:3105` |
| `server.moryflow.com` 的 `/api/*` | `http://<4c6g-ip>:3100` |

## 3. 前置约束

- Cloudflare 仅做 DNS（不开橙云）。
- TLS 证书在 megaboxpro 处理。
- 4c6g 仅暴露 `IP:端口`，不直接绑定域名证书。
- 必须透传 `Host`、`X-Forwarded-Proto`、`X-Forwarded-For`。

## 4. 验收清单

1. `https://www.moryflow.com` 正常打开。
2. `https://docs.moryflow.com` 正常打开。
3. `https://server.moryflow.com` Web 页面正常。
4. `https://server.moryflow.com/api/v1/...` 命中 3100 API 服务。
5. 无 307 自重定向循环（重点检查 SSR Origin 推断）。

## 5. 故障排查入口

- 优先查共享全量反代文档中的 Nginx/1panel 规则。
- 再对照：`docs/design/anyhunt/core/domains-and-deployment.md` 的域名职责与端口口径。
