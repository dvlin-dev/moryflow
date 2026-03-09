# Server

> Moryflow 后端服务协作入口；仅在目录职责、关键约束、核心入口或引用文档失真时更新。

## 定位

- `apps/moryflow/server` 是 Moryflow Web/API 后端，承载认证、AI 代理、云同步、站点发布、额度与知识库相关服务。
- 本文件只保留目录级事实；通用 NestJS / Zod / DTO / 表单 / Git 规则统一回到根 `CLAUDE.md` 与上层文档路由。

## 核心职责

- 提供 `server.moryflow.com` 对外 API 与应用后端能力。
- 维护用户认证、额度、站点发布、云同步、Vault 与 AI 调度链路。
- 通过 `memox/`、`sync/`、`site/` 等模块对接 Anyhunt/Moryflow 设计事实源。

## 关键约束

- 保持 NestJS 模块化边界；业务入口落在模块内，禁止把跨模块编排散回 `main.ts` 或根模块。
- `build` / `lint` / `typecheck` / `test*` 会通过 `pre*` scripts 自动执行 `prisma:generate`；修改 Prisma schema 或 client 依赖时必须考虑这条生成链路。
- 反代部署必须启用 `trust proxy`，否则 `req.protocol`、secure cookie 与回调 URL 会错误回落到 `http`。
- 用户可见错误、邮件与通知内容保持英文；中文仅用于开发注释与协作文档。
- 涉及共享数据契约时，优先复用 `dto/*.schema.ts` 的 Zod 单一事实源，不在 `types.ts`、service 内重复定义请求/响应类型。
- 云同步、发布、认证等跨端协议改动，必须同步核对 PC / Mobile 消费端与对应 design/runbook。
- Memox 接入固定只走 Anyhunt 单链路；运行时只接受 `ANYHUNT_API_BASE_URL / ANYHUNT_API_KEY / ANYHUNT_REQUEST_TIMEOUT_MS`，禁止恢复第二套搜索后端或旧基线路径。

## 高频目录

- `src/auth/`：认证、token、会话相关模块。
- `src/ai-proxy/`、`src/ai-admin/`、`src/ai-image/`：模型代理、后台模型配置、图像生成。
- `src/sync/`：云同步协议、action token、outbox、内部指标与清理链路。
- `src/site/`：站点读写、发布与公开访问契约。
- `src/memox/`：Memox 桥接、文件投影、搜索适配与切换逻辑。
- `src/quota/`、`src/payment/`：额度与支付相关事实源。
- `src/vault/`：知识库与文件层服务。

## 继续阅读

- 协作规则：`../../../docs/reference/collaboration-and-delivery.md`
- 测试与验证：`../../../docs/reference/testing-and-validation.md`
- 云同步架构：[docs/design/moryflow/core/cloud-sync-architecture.md](../../../docs/design/moryflow/core/cloud-sync-architecture.md)
- 云同步运维：[docs/design/moryflow/runbooks/cloud-sync-operations.md](../../../docs/design/moryflow/runbooks/cloud-sync-operations.md)
- 认证与站点发布：[docs/design/moryflow/core/auth-sync-and-publish.md](../../../docs/design/moryflow/core/auth-sync-and-publish.md)
- Moryflow 身份边界：[docs/design/moryflow/core/system-boundaries-and-identity.md](../../../docs/design/moryflow/core/system-boundaries-and-identity.md)
- 站点发布技术：[docs/design/moryflow/features/site-publish-tech.md](../../../docs/design/moryflow/features/site-publish-tech.md)
- 语音转写技术：[docs/design/moryflow/features/speech-to-text-tech.md](../../../docs/design/moryflow/features/speech-to-text-tech.md)
- Memox 集成细节：`src/memox/CLAUDE.md`
- 云同步模块细节：`src/sync/CLAUDE.md`
