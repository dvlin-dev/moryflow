---
title: UIP - 服务与网络
date: 2026-01-05
scope: dokploy, tailscale
status: active
---

<!--
[INPUT]: 不同云、多台机器部署；希望服务间走内网调用
[OUTPUT]: 服务边界与跨云内网（Tailscale）调用规范
[POS]: UIP 与产品服务的网络与安全约束
-->

# 服务与网络

## 服务边界

- **UIP 服务**：统一身份（auth/token/user）+ 统一计费（subscription/wallet/entitlement/payment/webhook）
- **产品服务**：只实现产品业务 API；计费/身份相关统一调用 UIP
- **产品网关（Nginx）**：对外单入口 `{product}.aiget.dev`，对内按路径转发

## 跨云内网（固定：Tailscale）

服务部署在不同云时，服务间调用统一走 Tailscale：

- UIP、各产品服务、各产品网关所在宿主机都加入同一个 tailnet
- 开启 MagicDNS，给 UIP 机器固定名称（例如 `uip-1`）
- 统一环境变量：
  - `UIP_INTERNAL_URL=http://uip-1:<PORT>`

强制安全边界：

- UIP 内部端口不开放公网入站（云安全组关闭）
- 主机防火墙仅允许 `tailscale0` 访问 UIP 端口
- tailnet 内通过 ACL 限制：只有产品节点可访问 UIP 端口

> Tailscale 的概念与操作见：`docs/architecture/subdomain-uip-architecture.md`（已包含命令、ACL、ufw 示例）。

