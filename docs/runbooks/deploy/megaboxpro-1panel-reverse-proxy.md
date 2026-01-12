---
title: megaboxpro（1panel）反代路由配置
date: 2026-01-12
scope: megaboxpro, 1panel, nginx
status: active
---

<!--
[INPUT]: megaboxpro 只做入口反代；4c6g 跑 Moryflow compose；8c16g 跑 Aiget Dev（Dokploy）
[OUTPUT]: 可照做的域名 → IP:端口 反代清单（Host 分流）
[POS]: 入口反代的唯一 runbook

[PROTOCOL]: 本文件变更如影响域名职责/端口口径，需同步更新 `docs/architecture/domains-and-deployment.md` 与根 `CLAUDE.md`。
-->

# megaboxpro（1panel）反代路由配置

## 前置约束

- Cloudflare 仅做 DNS（不开橙云）
- TLS 证书在 megaboxpro 处理；服务机只暴露 `IP:端口`
- 按 `Host` 分流（必要时按 `Path` 分流 `/api/*`）

## Host → 上游（固定口径）

| Host                           | Upstream                 |
| ------------------------------ | ------------------------ |
| `www.moryflow.com`             | `http://<4c6g-ip>:3102`  |
| `docs.moryflow.com`            | `http://<4c6g-ip>:3103`  |
| `app.moryflow.com`             | `http://<4c6g-ip>:3105`  |
| `app.moryflow.com` 的 `/api/*` | `http://<4c6g-ip>:3100`  |
| `aiget.dev`                    | `http://<8c16g-ip>:3103` |
| `server.aiget.dev`             | `http://<8c16g-ip>:3100` |
| `docs.aiget.dev`               | `http://<8c16g-ip>:3110` |
| `console.aiget.dev`            | `http://<8c16g-ip>:3102` |
| `admin.aiget.dev`              | `http://<8c16g-ip>:3101` |

> 端口与职责的“最终真相”仍以 `docs/architecture/domains-and-deployment.md` 为准；本 runbook 只负责“怎么配”。
