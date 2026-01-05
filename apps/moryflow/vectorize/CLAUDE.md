<!--
[INPUT]: 向量化/向量检索请求（服务端或受控客户端）
[OUTPUT]: Embedding 生成与 Vectorize 向量索引操作（upsert/query/delete）
[POS]: Moryflow 的 Cloudflare AI + Vectorize 边缘服务

[PROTOCOL]: 本目录变更需同步更新 docs/architecture/unified-identity-platform.md（若该服务被纳入平台能力）。
-->

# Moryflow Vectorize Worker

## 目的

- 在 Cloudflare Workers 上调用 Workers AI 生成 embedding。
- 使用 Cloudflare Vectorize 进行向量 upsert/query/delete。
- 通过 `Authorization: Bearer <API_SECRET>` 做最小鉴权。

## 运维

- 部署使用 `wrangler`。
- 机密：`API_SECRET` 用 `wrangler secret put API_SECRET` 设置。

