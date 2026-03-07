---
title: Anyhunt Runbooks 索引
date: 2026-02-28
scope: docs/design/anyhunt/runbooks
status: active
---

# Anyhunt Runbooks

- `deployment-and-troubleshooting.md`：部署前置、发布顺序、常见故障排查。
- `anyhunt-dokploy.md`：Dokploy 多项目部署清单与初始化步骤。
- `megaboxpro-1panel-reverse-proxy.md`：入口反代 Host->Upstream 配置清单。
- `dev-and-testing-baseline.md`：开发环境与测试门禁基线。
- `migrations-and-cutovers.md`：路由切换、治理规则与收口记录。
- `memox-phase2-moryflow-cutover.md`：Memox 二期切换 runbook，只承接主文档 `11.2.5` 的 Step 5 / Step 6，固定 backfill / replay / drift check / cutover / failure recovery 闸门。
- `memox-phase2-code-review-plan.md`：Memox 二期大改动的专用 code review 执行计划；按链路分块审查 staged 改动，并在同一文档持续回写每块的 P0/P1/P2 与整体结论。
- `aiget-to-anyhunt-migration.md`：品牌迁移全量执行清单与风险项。
- `open-source-package-subtree.md`：Monorepo 包开源拆分与双向同步流程。
- `memox-phase1-review-hardening.md`：Memox 一期 review 阻塞项硬化执行记录（cleanup、guardrail、migration reset、事实源回写）。
