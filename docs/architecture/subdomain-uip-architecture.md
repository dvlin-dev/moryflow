---
title: 子域名统一用户系统（UIP）架构
date: 2026-01-05
scope: aiget.dev, moryflow
status: active
---

<!--
[INPUT]: 多产品 Monorepo；每个产品独立品牌发布；尽可能复用用户系统/计费/代码；多机部署（Dokploy）
[OUTPUT]: 域名、路由、服务职责、数据边界与关键流程的可执行方案
[POS]: 当前阶段的“默认架构真相”，实现与部署应以此为准

[PROTOCOL]: 本文件变更时，需同步更新 docs/architecture/CLAUDE.md、docs/CLAUDE.md；若影响全局约束（域名/路由/模型），需同步更新根 CLAUDE.md。
-->

# 子域名统一用户系统（UIP）架构

## 设计目标

1. **最大化复用**：用户系统、订阅、钱包、支付 Webhook 只维护一套实现与数据。
2. **独立品牌发布**：每个产品有独立的应用子域名，互不影响部署节奏。
3. **运维简单**：对外每个产品只有一个入口域名；浏览器端只有一个 origin；避免复杂跨域与多套证书/回调配置。

## 域名职责

### Moryflow

- `moryflow.com`：落地页/文档（营销入口）；点击登录跳转到应用域名。
- `moryflow.aiget.dev`：主应用（Web UI）+ API（同域）。
- `moryflow.app`：用户发布站点（公开访问），由 Cloudflare Worker + R2 提供静态 HTML 服务（按子域名映射到用户站点）。

#### `moryflow.app` 发布站点（Cloudflare Worker + R2）

实现约定（来自 `apps/moryflow/publish-worker`）：

- 访问域名形态：`https://{siteSlug}.moryflow.app/...`
- 根域名 `https://moryflow.app/*`：301 重定向到 `https://moryflow.com/*`
- R2 对象前缀：`sites/{siteSlug}/...`
  - 元数据：`sites/{siteSlug}/_meta.json`
  - 首页：`sites/{siteSlug}/index.html`
  - 可选自定义 404：`sites/{siteSlug}/404.html`
- Worker 行为：
  - 解析 `{siteSlug}`（只允许单层子域，不允许 `a.b.moryflow.app`）
  - 校验站点状态：`OFFLINE` / `DELETED` / `expiresAt`
  - 根据路径解析文件名（支持目录 `.../index.html` 与 route 映射）
  - HTML 可按 `_meta.json.showWatermark` 注入水印

发布流程（核心）：

1. `moryflow.aiget.dev` 生成静态产物（HTML/CSS/JS/资源）
2. 上传到 R2：`sites/{siteSlug}/...`
3. 用户访问 `https://{siteSlug}.moryflow.app`，Worker 从 R2 读取并返回内容

### 平台子域规范

- `{product}.aiget.dev`：每个产品主应用与 API 的唯一入口。

## 对外 API 规范（固定规则）

**统一约定：API 与 Web 同域**：

- Web：`https://{product}.aiget.dev`
- API：`https://{product}.aiget.dev/v1/...`

收益（直接减少运维与前端复杂度）：

- 浏览器端不需要处理跨域 Cookie/CORS。
- 刷新 Token 的安全策略更容易做对（同源 + `HttpOnly` Cookie）。
- 证书只需要覆盖 `*.aiget.dev`（通配符证书）。

## 核心服务与职责

### 1) UIP（Unified Identity Platform）服务（单独部署）

职责（唯一真源）：

- 身份与会话：注册/登录/登出、邮箱验证码、密码、Google OAuth
- 用户数据：`User/Profile/Account/Session`
- 计费：订阅、钱包、权益
- 支付：Checkout 创建、Webhook 接收与入账

UIP 不承载产品业务逻辑；产品业务只通过 UIP API 读写身份与计费数据。

### 2) 产品业务服务（每个产品单独部署）

职责：

- 产品业务 API（抓取、记忆、工作流等）
- 调用 UIP 做：钱包扣减、权益检查（鉴权由产品服务离线验签 JWT 完成）

### 3) 入口网关（每个产品一个）

`{product}.aiget.dev` 前置一个反向代理/网关（Nginx），做两件事：

1. 静态资源/前端 → 产品 Web
2. `/v1/*` → 按路径分别转发到 UIP 与产品业务服务

## 路由分发（固定规则）

在 `https://{product}.aiget.dev`：

- `/v1/auth/*` → UIP
- `/v1/users/*` → UIP
- `/v1/wallet/*` → UIP
- `/v1/subscriptions/*` → UIP
- `/v1/entitlements/*` → UIP
- `/v1/payments/*` → UIP
- `/v1/webhooks/*` → UIP（支付回调/邮件回调等）
- `/v1/*`（其它）→ 产品业务服务

网关必须向 UIP 注入并由 UIP 校验的“产品标识”，用于多品牌配置选择（邮件模板、OAuth 回调、费率/计划展示等）：

- `X-Aiget-Product: moryflow|fetchx|memox|...`（网关固定写死，UIP 白名单校验）

## 会话与登录（Token 优先）

鉴权方式：所有业务请求使用 **Bearer Token**（`Authorization: Bearer <accessToken>`）。

刷新方式：

- Web：refreshToken 存 `HttpOnly` Cookie；accessToken 存内存。
- Electron / React Native：refreshToken 存系统安全存储（Secure Storage）；accessToken 存内存。

### Token 组成（必须理解）

- `accessToken`：短期凭证（JWT），用于访问业务 API。
- `refreshToken`：长期凭证，只用于换取新的 accessToken（以及轮换后的 refreshToken）。
- `refreshRotation`：刷新时签发新的 refreshToken，并让旧 refreshToken 立刻失效，用来降低 refreshToken 泄露后的风险。

### Token 规则（固定参数）

- `accessTokenTtl`：6 小时
- `refreshTokenTtl`：90 天
- `refreshRotation`：开启

### Web / Electron / RN 的“无感刷新”主流程（必须实现）

1. 正常业务请求只带 `accessToken`
2. `accessToken` 过期/收到 `401 token_expired`：
   - 调用 `POST /v1/auth/refresh`
   - 成功后更新内存中的 `accessToken`（同时更新 refreshToken：Web 写 Cookie；Electron/RN 写 Secure Storage）
3. 自动重放原请求（只重试一次）

### Web（SPA）刷新请求的安全约束（UIP 必须做）

因为 refreshToken 存在 Cookie 里，`/v1/auth/refresh` 必须防 CSRF：

- 只允许 `POST`
- 要求 `Content-Type: application/json`
- 校验 `Origin` 必须是 `https://*.aiget.dev`

### 邮箱验证码 + 密码 + Google OAuth

- 邮箱验证码：`/v1/auth/email/start` → 发码；`/v1/auth/email/verify` → 建立会话
- 密码：`/v1/auth/password/login`
- Google OAuth：`/v1/auth/oauth/google` 与回调 `/v1/auth/oauth/google/callback`（每个 `{product}.aiget.dev` 都是一条回调 URL，统一由 UIP 处理）

### 产品服务端如何验证 Token（两种方式）

- UIP 提供 JWKS：`GET /v1/auth/jwks`
- 各产品服务离线验签 JWT（缓存 JWKS，按 `kid` 自动更新）

## 计费与权益（统一到 UIP）

### 钱包扣减（强制幂等）

- 产品业务服务在执行计费动作前调用：`POST /v1/wallet/deduct`
- 必须携带：
  - `userId`
  - `amount`
  - `idempotencyKey`（强唯一，防重试/并发重复扣费）
  - `referenceId`（用于业务侧关联 job/order 等）
  - `product` 与 `operation`（审计与归因）

### 权益检查

- 产品业务服务调用：`POST /v1/entitlements/check`
- UIP 返回是否允许与限制参数（例如额度/并发/速率等）。

## 支付（统一收口，品牌化展示）

### Checkout

- `{product}.aiget.dev` 的定价页请求：`POST /v1/payments/checkout`
- UIP 创建支付会话（Creem），metadata 记录 `product/userId/planId`

### Webhook

- 支付提供商回调：`POST https://{product}.aiget.dev/v1/webhooks/payments`
- 网关转发到 UIP；UIP 完成：
  - 订阅状态更新
  - 发放订阅积分/购买积分
  - 写入钱包账本（可审计）

## 跨云内网（Tailscale）✅ 本方案已选定

你当前的部署条件是“不同云、多台机器”。本架构的服务间调用统一走 Tailscale 私网，避免公网绕行与额外暴露面。

### 它解决了什么问题？

- UIP、各产品服务部署在不同云：没有天然的 VPC/内网
- 你需要“像在局域网一样”的服务互调：`moryflow-server` → `UIP`
- 你不想把 UIP 的内部端口暴露到公网

Tailscale 让所有机器加入同一个私有网络（tailnet），彼此用内网 IP/内网主机名通信。

### 核心概念速查（必须懂）

- `tailnet`：你的 Tailscale 私有网络（通常对应你的账号/组织）。
- `node`：加入 tailnet 的一台设备（你的云服务器就是 node）。
- `tailscale0`：Tailscale 在机器上创建的虚拟网卡（可以理解为“内网网卡”）。
- `MagicDNS`：给 node 自动分配可解析的内网主机名（例如 `uip-1`）。
- `ACL`：访问控制规则（谁能访问谁的哪个端口）。
- `Auth Key`：让服务器“自动加入 tailnet”的密钥（用于 `tailscale up --auth-key ...`）。
- `tag`：给 node 打角色标签（例如 `tag:uip`、`tag:product`），用来写 ACL。
- `Exit Node`：让其它设备把“全部上网流量”从这台机器转发出去；本架构不使用。

### 你会怎么“用”它（把概念变成操作）

你日常只需要记住两件事：

1. **把新机器加入 tailnet**：它就获得了一个“内网身份”（内网 IP + 内网主机名）。
2. **服务间请求改用内网地址**：例如把 `UIP_INTERNAL_URL` 指向 `http://uip-1:3000`，流量就会走 tailnet。

### 最小落地步骤（宿主机安装，最稳）

1. 在 Tailscale 控制台创建 tailnet（注册登录即可）。
2. 每台机器安装（Linux）：
   - `curl -fsSL https://tailscale.com/install.sh | sh`
3. 每台机器加入 tailnet（使用 Auth Key，便于服务器自动化）：
   - `sudo tailscale up --auth-key tskey-...`
4. 控制台开启 MagicDNS（Settings → DNS → MagicDNS）。
5. 在控制台把 UIP 所在机器重命名为 `uip-1`，然后在其它机器上验证：
   - `tailscale status`
   - `tailscale ping uip-1`

### 常用命令（排查与确认）

- 查看当前节点与连接状态：`tailscale status`
- 查看当前机器的 tailnet IP：`tailscale ip -4`
- 测试到某个节点的连通性：`tailscale ping uip-1`
- 查看客户端版本：`tailscale version`

### ACL 与 tag（把“只允许产品访问 UIP”做成规则）

目标：只有产品服务节点能访问 UIP 的内部端口（例如 3000）。

1. 在控制台为 UIP 机器打 tag：`tag:uip`
2. 为产品服务机器打 tag：`tag:product`
3. 配置 ACL（示例）：

```json
{
  "tagOwners": {
    "tag:uip": ["autogroup:admin"],
    "tag:product": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:product"],
      "dst": ["tag:uip:3000"]
    }
  ]
}
```

### 在本架构中怎么用（你需要改的只有两处）

1. **产品服务端调用 UIP 走内网**
   - 在 `moryflow-server`、`fetchx-server` 等服务的环境变量里设置：
     - `UIP_INTERNAL_URL=http://uip-1:3000`
   - 代码里所有“服务端 → UIP”的调用都用 `UIP_INTERNAL_URL`。

2. **网关（Nginx）转发到 UIP 也走内网**
   - `/{product}.aiget.dev/v1/auth/*` 等转发目标使用 `http://uip-1:3000`。

### 安全边界（必须落实）

Tailscale 的 ACL 负责“tailnet 内谁能访问谁”，但你仍要确保 UIP 的内部端口不对公网暴露。

在 UIP 所在机器上做两件事：

1. **云侧安全组**：关闭 UIP 内部端口的公网入站（例如 3000 不开放）。
2. **主机防火墙（示例：ufw）**：只允许来自 `tailscale0` 网卡的访问。

```bash
# 只允许 tailscale0 访问 3000
sudo ufw allow in on tailscale0 to any port 3000 proto tcp

# 禁止其它网卡访问 3000（防止误开安全组/端口映射）
sudo ufw deny in to any port 3000 proto tcp
```

### 深入学习（官方文档）

- Tailscale Docs 总入口：`https://tailscale.com/kb/`
- Install（Linux）：`https://tailscale.com/kb/installation/`
- What is Tailscale：`https://tailscale.com/kb/1151/what-is-tailscale/`
- MagicDNS：`https://tailscale.com/kb/1081/magicdns/`
- ACL：`https://tailscale.com/kb/1018/acls/`
- Auth Keys：`https://tailscale.com/kb/1085/auth-keys/`
- Tags：`https://tailscale.com/kb/1068/tags/`
- Troubleshooting：`https://tailscale.com/kb/1019/troubleshooting/`

## 深入学习（认证与 Token）

理解下面这些文档后，你会更清楚为什么我们要“Web refresh 用 HttpOnly Cookie、业务请求只带 accessToken、并开启 refresh rotation”：

- OWASP Cheat Sheet Series（总入口）：`https://cheatsheetseries.owasp.org/`
- Session Management：`https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html`
- CSRF Prevention：`https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html`
- OAuth 2.0 for Browser-Based Apps（BCP）：`https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps`
