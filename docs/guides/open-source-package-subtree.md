---
title: 从 Monorepo 开源拆分单个包（Git Subtree 双向同步）
date: 2026-01-07
scope: monorepo, oss-repo
status: proposal
---

<!--
[INPUT]: Monorepo 内的单个包（例如 `packages/auth-server`）；希望对外开源且保留该包的历史；内部仍以 Monorepo 为主要开发场景；允许外部 PR
[OUTPUT]: 一个可复用的“拆分 + 双向同步 + 冲突治理”的落地方案（含自动化策略与约束）
[POS]: 用于未来将任意 `packages/*` 独立开源时复用的流程模板

[PROTOCOL]: 本文件变更需同步更新 `docs/index.md` 与 `docs/CLAUDE.md`；若作为全局协作规范生效，需同步更新根 `CLAUDE.md`。
-->

# 从 Monorepo 开源拆分单个包（Git Subtree 双向同步）

目标：把 Monorepo 中的某个包（下文称 **Package**，例如 `packages/auth-server`）单独开源成一个独立仓库（下文称 **OSS Repo**），同时 Package 仍保留在 Monorepo 里，内部继续在 Monorepo 开发；OSS Repo 允许外部 PR，并能回流到 Monorepo。

本方案采用 **Git Subtree**，并选择以下默认策略（可按包调整）：

- **外部 PR**：在 OSS Repo 合并后，自动向 Monorepo 发起同步 PR；由内部人工 review 并合入。
- **内部改动**：在 Monorepo 合并后，自动直接 push 同步到 OSS Repo（不再走 OSS Repo PR）。

> 说明：本方案把“开源仓库”作为对外协作与可见性的主入口，但不强迫你改变主要在 Monorepo 开发的习惯；通过自动同步把两边保持一致。

## 约束与不变量（必须遵守）

1. **只用 `git subtree` 同步**：禁止手动复制文件/手动合并目录，否则很容易造成历史断裂与分叉。
2. **Package 必须可独立运行**（开源前检查）：
   - 不依赖 Monorepo 内部私有包（或将依赖替换为可开源的外部依赖）。
   - 不依赖 Monorepo 根目录的私有配置文件（如私有 tsconfig/脚本）；需要的配置应当落在 Package 内，或以公开 npm 包形式依赖。
3. **拆分后的提交历史只包含该目录相关提交**：对外仓库不暴露 Monorepo 的其他目录历史。
4. **双向同步需要治理**：两边都可能产生新提交（内部/外部），但必须通过自动化流程回流，避免长期漂移。

## 仓库角色与目录映射

- **Monorepo**：开发主战场；Package 位于 `packages/<name>`，例如 `packages/auth-server`
- **OSS Repo**：对外开源仓库；其仓库根目录 = Package 根目录（拆分后目录结构会“上移一层”）

映射关系：

| Monorepo 路径                  | OSS Repo 路径  |
| ------------------------------ | -------------- |
| `packages/<name>/package.json` | `package.json` |
| `packages/<name>/src/*`        | `src/*`        |
| `packages/<name>/README.md`    | `README.md`    |

因此，**开源仓库需要的文件（README/LICENSE/CONTRIBUTING 等）建议直接放在 Package 根目录**，这样拆分出去后自动成为 OSS Repo 的根文件。

## 初始化：把 Package 的历史“切”成独立仓库

初始化只做一次（在你真正要开源时执行）。思路是：从 Monorepo 中把 `packages/<name>` 的提交历史提取成一条只包含该目录的分支，再推到全新 OSS Repo 的 `main`。

推荐命令（示例包：`packages/auth-server`）：

```bash
# 在 Monorepo 根目录
git subtree split --prefix=packages/auth-server -b oss/auth-server-main

# 推到新建的 OSS Repo（空仓库）
git remote add auth-server-oss git@github.com:<org>/auth-server.git
git push auth-server-oss oss/auth-server-main:main
```

注意事项：

- `subtree split` 得到的分支，其历史只包含该目录相关提交（满足“对外只可见该包历史”）。
- 后续同步请优先使用 `git subtree push/pull`（更容易保持 subtree 的“追踪信息”）。

## 日常同步：双向（内推外 / 外回内）

### A. Monorepo -> OSS Repo（内部合并后直接 push）

触发条件：Monorepo 的 `main` 合并且变更包含 `packages/<name>/**`

同步命令：

```bash
git subtree push --prefix=packages/auth-server auth-server-oss main
```

建议放在 Monorepo 的 CI（例如 GitHub Actions）里，做到“合并即同步”。

关键点：

- `actions/checkout` 需要 `fetch-depth: 0`，否则 subtree 无法正确生成历史。
- 推送 token 需要对 OSS Repo 有 `contents: write` 权限（推荐 GitHub App 或最小权限 fine-grained PAT）。
- 加并发锁（concurrency），避免同一时间多次 push 互相覆盖。

### B. OSS Repo -> Monorepo（外部 PR 合并后自动发起同步 PR）

触发条件：OSS Repo 的 `main` 更新（通常来自 PR merge）

同步动作（在 OSS Repo 的 CI 执行）：

1. checkout Monorepo（需要可写权限的 token）
2. 在新分支执行 subtree pull，把 OSS 的 `main` 拉回 `packages/<name>`
3. push 该分支到 Monorepo fork/同仓库
4. 自动创建一个 PR（需要人工 review + merge）

核心命令：

```bash
git subtree pull --prefix=packages/auth-server auth-server-oss main
```

建议 PR 命名规范：

- 分支：`sync/auth-server-from-oss/<timestamp>`
- PR 标题：`chore(auth-server): sync from OSS`
- PR 内容：自动附上 OSS Repo 的最新 commit 链接与变更摘要（由 CI 生成）

## 分叉与冲突治理（最重要）

这个模式的典型风险是：**OSS Repo 合入了外部 PR，但 Monorepo 的同步 PR 还没合；此时 Monorepo 又尝试 push 到 OSS**，会导致 push 失败或出现分叉。

建议采用以下治理策略（按优先级）：

1. **规定“外回内 PR 必须优先合”**：当存在 `sync/*-from-oss` PR 时，暂缓 Monorepo 中对该 Package 的改动合入（或在合入前先合同步 PR）。
2. **Monorepo 推送失败即中止**：Monorepo 的 push job 如果检测到 non-fast-forward，应直接失败并提示“先合入 OSS->Monorepo 同步 PR 再重试”。
3. **单点入口**：尽量避免在 OSS Repo 直接改动“同步相关文件”（如 Monorepo 专属配置），把外部可改动面限制在 Package 自身。

## GitHub 权限与分支保护（可直接照抄）

> 目标：既允许外部 PR，又保证“Monorepo 合并后可直推 OSS main”，并且最小化 token 权限。

### OSS Repo（开源仓库）

- 分支保护（`main`）建议：
  - Require a pull request before merging：开启（外部贡献走 PR）
  - Required status checks：开启（lint/typecheck/test 必须过）
  - Restrict who can push to matching branches：开启
  - Allow specified actors to bypass required pull requests：把“Monorepo Sync Bot”加入白名单（只让它直推 `main`）
  - Force push：关闭（正常情况下 subtree push 不需要）
- 维护者权限策略：
  - 普通维护者/外部贡献者：只能 PR
  - 同步机器人：允许直接 push `main`

### Monorepo（内部仓库）

- `main` 一律走 PR（符合现有协作约束）。
- 可选：为 `packages/<name>/**` 加 CODEOWNERS（要求指定维护者 review）。

## Token / Bot 设计（最小权限，可直接落地）

本方案推荐创建 **两个 token**（或一个 GitHub App 安装在两个仓库上，效果更好但配置更复杂）。

### Token 1：Monorepo -> OSS 推送 token

- 存放位置：Monorepo 的 Actions Secrets（例如 `OSS_AUTH_SERVER_PUSH_TOKEN`）
- 类型：fine-grained PAT（推荐）或 GitHub App token
- 访问范围：仅 OSS Repo
- 权限（最小）：
  - Repository permissions → Contents: Read and write

### Token 2：OSS -> Monorepo 发 PR token

- 存放位置：OSS Repo 的 Actions Secrets（例如 `MONOREPO_SYNC_PR_TOKEN`）
- 类型：fine-grained PAT（推荐）或 GitHub App token
- 访问范围：仅 Monorepo
- 权限（最小）：
  - Repository permissions → Contents: Read and write（创建分支并推送）
  - Repository permissions → Pull requests: Read and write（创建 PR）

### Bot 身份（git author）

建议固定为一个“同步机器人”身份，便于审计：

```bash
git config user.name  "aiget-sync-bot"
git config user.email "aiget-sync-bot@users.noreply.github.com"
```

## CI 模板：Monorepo 合并后直推 OSS（可直接复制）

把下述 workflow 放到 Monorepo：`.github/workflows/sync-auth-server-to-oss.yml`

> 说明：以 `auth-server` 为例；未来其他包只需改 `prefix` 和 `oss_repo`。

```yaml
name: sync(auth-server): monorepo -> oss

on:
  push:
    branches: [main]
    paths:
      - "packages/auth-server/**"

concurrency:
  group: sync-auth-server-to-oss
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure git
        run: |
          git config user.name  "aiget-sync-bot"
          git config user.email "aiget-sync-bot@users.noreply.github.com"

      - name: Add OSS remote
        run: |
          git remote add auth-server-oss https://x-access-token:${{ secrets.OSS_AUTH_SERVER_PUSH_TOKEN }}@github.com/<org>/auth-server.git
          git remote -v

      - name: Push subtree to OSS main
        run: |
          git subtree push --prefix=packages/auth-server auth-server-oss main
```

失败处理（建议写进 CI 日志或团队约定）：

- 如果 push 报 non-fast-forward：说明 OSS 有新提交尚未回流到 Monorepo。先走“OSS -> Monorepo 自动 PR”，合入后重跑该 job。

## CI 模板：OSS 合并后自动发 PR 回 Monorepo（可直接复制）

把下述 workflow 放到 OSS Repo：`.github/workflows/sync-to-monorepo-pr.yml`

实现策略：

- 在 OSS Repo 的 `main` 发生变更时触发（通常来自 PR merge）
- workflow 会：
  1. checkout Monorepo（完整历史）
  2. 添加 OSS remote（指向当前 repo）
  3. `git subtree pull` 把变更拉回 `packages/auth-server`
  4. 使用 `peter-evans/create-pull-request` 自动创建 PR（需要人工 merge）

```yaml
name: sync(auth-server): oss -> monorepo PR

on:
  push:
    branches: [main]

concurrency:
  group: sync-auth-server-to-monorepo
  cancel-in-progress: true

jobs:
  pr:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout monorepo
        uses: actions/checkout@v4
        with:
          repository: <org>/<monorepo>
          token: ${{ secrets.MONOREPO_SYNC_PR_TOKEN }}
          fetch-depth: 0

      - name: Configure git
        run: |
          git config user.name  "aiget-sync-bot"
          git config user.email "aiget-sync-bot@users.noreply.github.com"

      - name: Add OSS remote + fetch
        run: |
          git remote add auth-server-oss https://github.com/<org>/auth-server.git
          git fetch --no-tags auth-server-oss main

      - name: Subtree pull into packages/auth-server
        run: |
          git subtree pull --prefix=packages/auth-server auth-server-oss main

      - name: Create PR
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.MONOREPO_SYNC_PR_TOKEN }}
          branch: sync/auth-server-from-oss
          delete-branch: true
          title: "chore(auth-server): sync from OSS"
          body: |
            Sync `auth-server` from OSS repo.

            Source: https://github.com/<org>/auth-server/commits/main
          commit-message: "chore(auth-server): sync from OSS"
          labels: |
            sync:auth-server
```

可选增强：

- 如果你担心“每次 push 都发 PR”太频繁，可把触发改成 `workflow_dispatch` + 手动按钮，或仅在有特定 label 的 merge 时触发（需要更复杂的事件过滤）。

## Lockfile / 依赖安装策略（两仓一致的推荐做法）

同步时最大的痛点不是 subtree，而是“OSS Repo 如何独立安装依赖”。

推荐两种策略，二选一：

### 策略 1（推荐）：把 OSS 视为独立项目，维护自己的 lockfile

- 在 Package 根目录维护 `pnpm-lock.yaml`（最终拆分到 OSS 后会成为仓库根 lockfile）。
- 在 Monorepo 中，该 lockfile 不作为 workspace lockfile 使用，但保留即可（它属于 OSS 的可复现构建资产）。

优点：OSS CI 可 `pnpm i --frozen-lockfile`，最稳定。  
代价：Monorepo 与 OSS 的 lockfile 会并存（但职责明确）。

### 策略 2：OSS CI 不冻结 lockfile（最省事，但可复现性弱）

- OSS Repo 不提交 lockfile（或不要求冻结）
- CI 使用 `pnpm i --no-frozen-lockfile`

优点：不需要维护双 lockfile。  
代价：依赖漂移风险更高。

## Tag/Release 同步（建议的最小可用）

如果开源的目的主要是“展示 + 可用”，建议把发布动作放在 OSS Repo（更符合外部心智）：

- 版本号与变更日志：在 OSS Repo 维护（例如 changeset 或手写 release notes）
- 发布触发：
  - 人工：当 Monorepo 同步完成后，在 OSS Repo 手动打 tag + release
  - 自动（进阶）：Monorepo 合并时如果检测到 `packages/<name>` 的 `version` 变更，则在 OSS Repo 自动创建 tag（需要额外脚本与权限）

## 落地步骤（一次性 setup，按清单执行）

> 下述步骤以 `packages/auth-server` 为例；其他包替换路径与仓库名即可。

### 1) 让 Package 具备“可独立开源”的形态

- 把对外仓库需要的文件放在 Package 根目录（拆分后会成为 OSS Repo 根）：
  - `packages/auth-server/README.md`
  - `packages/auth-server/LICENSE`（或 `LICENSE.md`）
  - `packages/auth-server/CONTRIBUTING.md`（可选）
  - `packages/auth-server/SECURITY.md`（可选）
- 确保 `packages/auth-server/package.json` 的 scripts 在 OSS 环境可直接跑：
  - `lint` / `typecheck` / `test`
- 如果你决定采用“策略 1（独立 lockfile）”，在 `packages/auth-server` 放置 `pnpm-lock.yaml`。

### 2) 新建 OSS Repo（空仓库）

- 初始化时不要添加 README/LICENSE（避免第一次 push 冲突）
- 设置分支保护（见上文）
- 添加 Secrets：
  - `MONOREPO_SYNC_PR_TOKEN`（OSS->Monorepo PR）

### 3) 从 Monorepo 拆分并推送历史（只做一次）

在 Monorepo 根目录执行：

```bash
git subtree split --prefix=packages/auth-server -b oss/auth-server-main
git remote add auth-server-oss git@github.com:<org>/auth-server.git
git push auth-server-oss oss/auth-server-main:main
```

### 4) 配置 Monorepo 的同步（Monorepo->OSS）

- 在 Monorepo 添加 Secret：`OSS_AUTH_SERVER_PUSH_TOKEN`
- 添加 workflow：`.github/workflows/sync-auth-server-to-oss.yml`（模板见上文）

### 5) 配置 OSS Repo 的回流（OSS->Monorepo PR）

- 在 OSS Repo 添加 workflow：`.github/workflows/sync-to-monorepo-pr.yml`（模板见上文）
- 给 Monorepo 设置 label（可选）：`sync:auth-server`

### 6) 进行一次“空风险”验收

- 在 Monorepo 改一行 `packages/auth-server/README.md` → merge → 检查 OSS Repo `main` 是否出现对应变更
- 在 OSS Repo 开一个 PR 改 `README.md` → merge → 检查 Monorepo 是否自动出现 `chore(auth-server): sync from OSS` PR

## 运行手册（出问题时怎么处理）

### 场景 A：Monorepo->OSS push 失败（non-fast-forward）

含义：OSS Repo 已经有新提交，但还没通过“OSS->Monorepo PR”回流并合入 Monorepo。

处理：

1. 去 Monorepo 看是否存在 `chore(auth-server): sync from OSS` 的同步 PR；如果有，先合它
2. 重新运行 Monorepo 的 `sync(auth-server): monorepo -> oss` workflow

### 场景 B：OSS->Monorepo PR workflow 失败（subtree pull 冲突）

含义：外部改动与 Monorepo 当前状态在同一文件/区域冲突，需要人工合并。

处理（推荐在本地操作，仍然以 PR 形式合入 Monorepo）：

```bash
# 在 Monorepo 本地
git remote add auth-server-oss https://github.com/<org>/auth-server.git
git fetch auth-server-oss main

git checkout -b sync/auth-server-from-oss-manual
git subtree pull --prefix=packages/auth-server auth-server-oss main

# 解决冲突后
git push origin sync/auth-server-from-oss-manual
```

然后在 Monorepo 创建 PR，标题建议仍为 `chore(auth-server): sync from OSS`。

## OSS Repo 的自测 CI（推荐最小集合）

除了“回流 PR”这个同步 workflow，OSS Repo 自己也应当有一个普通 CI（外部 PR 会触发）：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

> 具体命令以该包的 `package.json` 为准；如果你采用“策略 1（独立 lockfile）”，则 CI 用 `pnpm i --frozen-lockfile` 更稳定。

## 自动化落地建议（模板化，便于复用到其他包）

建议在 Monorepo 内抽象出“可复用”的同步配置（不要求现在实现）：

- 约定一个配置对象（YAML/JSON 均可），描述：
  - `packagePrefix`: `packages/auth-server`
  - `ossRepo`: `org/auth-server`
  - `ossBranch`: `main`
  - `syncLabels`: `sync:auth-server`
- 将同步脚本做成参数化（一个脚本支持多个包），避免未来每个包复制一套 Action。

## 开源前检查清单（建议）

- 代码与依赖：
  - 是否有任何私有依赖、内部域名、硬编码 token、测试账号？
  - 是否依赖 Monorepo 根级别配置（tsconfig、eslint、scripts）？是否能在 OSS Repo 内自洽？
- 文档与合规：
  - `README.md`（放在 Package 根目录）
  - `LICENSE`（放在 Package 根目录）
  - `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md`（可选）
  - 安全披露入口（`SECURITY.md` 可选）
- CI：
  - OSS Repo 能独立跑 `lint/typecheck/test`
  - Monorepo 与 OSS Repo 的同步 Action 均使用最小权限 token
