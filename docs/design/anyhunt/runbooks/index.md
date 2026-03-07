---
title: Anyhunt Runbooks 索引
date: 2026-03-08
scope: docs/design/anyhunt/runbooks
status: active
---

# Anyhunt Runbooks

- `deployment-and-troubleshooting.md`：部署前置、发布顺序、常见故障排查。
- `anyhunt-dokploy.md`：Dokploy 多项目部署清单与初始化步骤。
- `megaboxpro-1panel-reverse-proxy.md`：入口反代 Host->Upstream 配置清单。
- `dev-and-testing-baseline.md`：开发环境与测试门禁基线。
- `migrations-and-cutovers.md`：路由切换、治理规则与收口记录。
- `memox-phase2-moryflow-cutover.md`：Memox 二期唯一切流 runbook，固定 backfill / replay / drift check / cutover / rollback / 最终下线步骤，以及本地验证证据与剩余外部 gate。
- `memox-phase2-deep-code-review.md`：Memox 二期合并前深度 code review 长期事实源，固定 review 分块、相关链路补读范围、真实 findings 与最终 merge readiness 判定。
- `aiget-to-anyhunt-migration.md`：品牌迁移全量执行清单与风险项。
- `open-source-package-subtree.md`：Monorepo 包开源拆分与双向同步流程。
