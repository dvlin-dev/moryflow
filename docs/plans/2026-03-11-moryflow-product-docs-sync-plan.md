# Moryflow Product Docs Sync Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 一次性把 `apps/moryflow/docs` 这个产品文档站同步到当前 Moryflow 产品事实，修正旧版 IA、旧版设置说明、旧版同步口径和失真的入门内容。

**Architecture:** 这次不是给根目录 `docs/` 补设计文档，而是更新 `docs.moryflow.com` 的对外产品文档。执行顺序固定为：先冻结文档站 IA，再同步下载与更新，再重写 Settings / Features / Sync / FAQ，最后补齐英中双语和导航结构。所有改动都以当前 PC、WWW 和已冻结的根文档事实源为准，不再延续旧版“云盘同步 = 产品同步”“Settings 只有旧四项”这类心智。

**Tech Stack:** TanStack Start, Fumadocs, MDX, content-collections, root docs facts, Electron/React code reading

---

## 1. 冻结范围

本次目标是把 `apps/moryflow/docs` 从“还能看”改到“能继续维护”，不是零散修文案。

本次必须完成：

1. 修正文档站首页和侧边导航的信息架构。
2. 同步下载、安装、更新三条公开口径。
3. 重写 Settings 总览，改成当前 PC 设置体系。
4. 调整 Settings 子页面结构，使其和当前产品能力对齐。
5. 重写 Features 总览和 AI/Tools/MCP 相关页面的主叙事。
6. 重写 `advanced/sync`，明确云同步和外部云盘的边界。
7. 回收 FAQ 里已经失真的旧问答。
8. 保证英中双语目录、导航和页面成对同步。

本次明确不做：

1. 不顺手改 `apps/moryflow/docs` 的视觉主题和站点框架。
2. 不补“未来功能预告”页。
3. 不为了保持历史兼容保留已经失真的旧章节结构。
4. 不把根目录 `docs/` 的设计过程原样搬进产品文档站。

## 2. 冻结判断

下面这些判断在执行时直接采用，不再来回试探。

1. 产品文档站现在最失真的不是排版，而是内容模型。
2. `Settings` 不能再继续维持“AI Models / Ollama / Custom Provider / Theme”四页就是完整设置体系的写法。
3. `advanced/sync` 不能继续把外部云盘同步写成产品主同步方案；当前必须引入产品内 Cloud Sync 的真实边界。
4. `features.mdx` 不能继续用“Vault / Editor / Mory 三件套 + 10+ built-in tools”概括当前产品。
5. 下载、更新、FAQ 的公开口径必须和 `apps/moryflow/shared/public-download.ts`、当前 WWW 下载页、PC release runbook 对齐。
6. 中文页不是翻译收尾项，而是和英文页同步推进的正式交付。

## 3. 已确认的失真点

基于当前代码和内容，已经确认这些页面优先级最高：

1. `content/docs/settings.mdx`
   当前还在写 gear icon、language、theme、update channel 等旧入口，和当前 PC 设置体系不一致。
2. `content/docs/advanced/sync.mdx`
   当前主叙事仍是 iCloud / OneDrive / Dropbox 同步本地文件夹，没有把产品内 Cloud Sync 说清楚。
3. `content/docs/features.mdx`
   当前总览还是旧版三段式，且 `10+ built-in tools` 这种表述已经不稳。
4. `content/docs/getting-started/installation.mdx`
   还保留 Windows 恢复后回切公开下载的旧时描述，需要和当前下载口径重新对齐。
5. `content/docs/getting-started/updates.mdx`
   还在写旧的 update channel 心智，需要和当前应用内更新路径重新核对。
6. `content/docs/faq.mdx`
   FAQ 里有不少答案仍建立在旧的设置结构和旧同步方式上。

## 4. 执行纪律

1. 每一步先读内容页、再读产品事实源，不凭记忆改。
2. 每一步同时改英文和中文，不留“最后再翻译”。
3. 每一步改完都回写本文件的进度表和对应 task 完成记录。
4. 先修 IA 和总览页，再动细页，不从细页开始补丁式修改。
5. 不手改 `routeTree.gen.ts` 之类 generated 文件。

## 5. 执行进度

| Task                                | 状态 | 结果摘要                                                                             |
| ----------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| 0. 前置阅读与站点盘点               | DONE | 已确认文档站导航结构、实现入口，以及 Settings / Features / Sync / FAQ 的主要失真点。 |
| 1. 冻结产品文档站目标 IA            | DONE | 已冻结 Settings / Features 目标导航，把当前主路径和旧专题参考页分开。                |
| 2. 同步下载 / 安装 / 更新口径       | DONE | 已统一 installation / updates 的公开平台、GitHub Releases 和应用内更新口径。         |
| 3. 重写 Settings 总览与导航         | DONE | 已把 Settings 总览改成当前 PC 设置结构，并去掉旧四页心智。                           |
| 4. 补齐 Settings 子页面             | DONE | 已新增 Account / Providers & Models / MCP / Cloud Sync 四个主路径页。                |
| 5. 重写 Features 总览与 AI 主线     | DONE | 已重写 Features 总览、AI Assistant 主线，并把 ai-tools 降成高层运行时说明。          |
| 6. 重写 Cloud Sync / 多设备同步文档 | DONE | 已把内置 Cloud Sync 和外部文件夹同步改成两条明确路径。                               |
| 7. 清理 FAQ 与旧问答                | DONE | 已重写 FAQ，高频问题改成当前下载、同步、账号和设置结构。                             |
| 8. 双语一致性与导航复核             | DONE | 已确认英中页面成对、导航一致，旧入口词检索无输出。                                   |
| 9. 构建校验与交付收口               | DONE | 已补装工作区依赖并完成文档站 typecheck / build、关键页回读和旧口径终检。             |

状态只允许使用：`TODO` / `DOING` / `DONE` / `BLOCKED`

## 6. 前置阅读顺序

### 6.1 先读文档站本身

1. `apps/moryflow/docs/CLAUDE.md`
2. `apps/moryflow/docs/content/docs/meta.json`
3. `apps/moryflow/docs/content/docs/meta.zh.json`
4. `apps/moryflow/docs/content/docs/getting-started.mdx`
5. `apps/moryflow/docs/content/docs/features.mdx`
6. `apps/moryflow/docs/content/docs/settings.mdx`
7. `apps/moryflow/docs/content/docs/advanced/sync.mdx`
8. `apps/moryflow/docs/content/docs/faq.mdx`

### 6.2 再读文档站实现层

1. `apps/moryflow/docs/src/lib/source.ts`
2. `apps/moryflow/docs/src/lib/layout.shared.tsx`
3. `apps/moryflow/docs/src/lib/i18n.ts`
4. `apps/moryflow/docs/src/components/download-buttons.tsx`
5. `apps/moryflow/docs/src/routes/docs/$.tsx`
6. `apps/moryflow/docs/src/routes/$lang/docs/$.tsx`

### 6.3 最后读当前产品事实源

1. `docs/design/moryflow/features/pc-account-and-membership.md`
2. `docs/design/moryflow/features/pc-settings-information-architecture.md`
3. `docs/design/moryflow/features/chat-input-and-chat-pane.md`
4. `docs/design/moryflow/features/moryflow-www-agent-first-site-architecture.md`
5. `docs/design/moryflow/runbooks/www-and-docs-download-alignment.md`
6. `docs/design/moryflow/runbooks/pc-release-and-auto-update.md`
7. `apps/moryflow/shared/public-download.ts`
8. `apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts`
9. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/account-section.tsx`
10. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/providers-section.tsx`
11. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/mcp-section.tsx`
12. `apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx`

## 7. 目标信息架构

本次执行按下面这版目标 IA 收口。

### 7.1 顶层分组

1. Getting Started
2. Features
3. Guides
4. Settings
5. Advanced
6. FAQ

顶层分组名称不一定改，但每组里的页面职责要重排。

### 7.2 Settings 目标结构

当前建议冻结为：

1. `settings` 总览页
2. `settings/account-and-membership`
3. `settings/providers-and-models`
4. `settings/mcp`
5. `settings/cloud-sync`
6. `settings/theme`

处理规则：

- `settings/ollama` 不再作为一级主入口，收进 providers-and-models 或降级为专题页。
- `settings/custom-provider` 不再单独扛住一整个设置分类。
- 如果保留 `settings/ai-models`，它必须作为 providers-and-models 的一部分重写，而不是维持旧结构。

### 7.3 Features 目标结构

当前建议冻结为：

1. `features` 总览页
2. `features/vault`
3. `features/editor`
4. `features/ai-assistant`
5. `features/mcp`

处理规则：

- `features/ai-tools` 是否保留，先看是否还能作为稳定用户心智页成立。
- 如果当前内容只是旧工具清单，就并入 `ai-assistant`，不再单列。

## 8. 执行步骤

### Task 0: 前置阅读与站点盘点

**Files:**

- Read: `apps/moryflow/docs/CLAUDE.md`
- Read: `apps/moryflow/docs/content/docs/meta.json`
- Read: `apps/moryflow/docs/content/docs/meta.zh.json`
- Read: `apps/moryflow/docs/content/docs/settings.mdx`
- Read: `apps/moryflow/docs/content/docs/features.mdx`
- Read: `apps/moryflow/docs/content/docs/advanced/sync.mdx`
- Read: `apps/moryflow/docs/src/lib/source.ts`
- Read: `apps/moryflow/docs/src/components/download-buttons.tsx`

**Step 1: 读内容与导航骨架**

Run:

```bash
sed -n '1,240p' apps/moryflow/docs/CLAUDE.md
sed -n '1,200p' apps/moryflow/docs/content/docs/meta.json
sed -n '1,200p' apps/moryflow/docs/content/docs/meta.zh.json
```

**Step 2: 读高风险页面**

Run:

```bash
sed -n '1,240p' apps/moryflow/docs/content/docs/settings.mdx
sed -n '1,240p' apps/moryflow/docs/content/docs/features.mdx
sed -n '1,240p' apps/moryflow/docs/content/docs/advanced/sync.mdx
```

**Step 3: 回写进度**

把 `Task 0` 改为 `DONE`。

**完成标准**

- 已确认当前导航结构、内容分组和高风险失真页。

**完成记录**

- 状态：DONE
- 完成内容：已完成文档站导航、实现入口和高风险页面盘点，并确认 `settings`、`features`、`advanced/sync`、`faq` 是本轮优先处理对象。
- 偏差：无

### Task 1: 冻结产品文档站目标 IA

**Files:**

- Modify: `apps/moryflow/docs/content/docs/meta.json`
- Modify: `apps/moryflow/docs/content/docs/meta.zh.json`
- Review: `apps/moryflow/docs/content/docs/settings/meta.json`
- Review: `apps/moryflow/docs/content/docs/settings/meta.zh.json`
- Review: `apps/moryflow/docs/content/docs/features/meta.json`
- Review: `apps/moryflow/docs/content/docs/features/meta.zh.json`

**Step 1: 根据目标 IA 调整顶层与子组导航**

明确：

1. 哪些页面保留
2. 哪些页面需要改名
3. 哪些页面需要降级
4. 哪些新页面要补

**Step 2: 先改 meta，再改正文**

不要先改正文后忘了改导航。

**Step 3: 回写进度**

把 `Task 1` 改为 `DONE`。

**完成标准**

- 英中导航结构一致。
- Settings / Features 的目标页已经冻结。

**完成记录**

- 状态：DONE
- 完成内容：已重排 `settings` 和 `features` 子组导航，新增当前主路径页位，并把旧模型专题降级到 Reference 区。
- 偏差：无

### Task 2: 同步下载 / 安装 / 更新口径

**Files:**

- Modify: `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- Modify: `apps/moryflow/docs/content/docs/getting-started/installation.zh.mdx`
- Modify: `apps/moryflow/docs/content/docs/getting-started/updates.mdx`
- Modify: `apps/moryflow/docs/content/docs/getting-started/updates.zh.mdx`
- Review: `apps/moryflow/docs/src/components/download-buttons.tsx`

**Step 1: 读取事实源**

Run:

```bash
sed -n '1,240p' apps/moryflow/shared/public-download.ts
sed -n '1,260p' docs/design/moryflow/runbooks/www-and-docs-download-alignment.md
sed -n '1,260p' docs/design/moryflow/runbooks/pc-release-and-auto-update.md
sed -n '1,240p' apps/moryflow/docs/src/components/download-buttons.tsx
```

**Step 2: 重写公开下载现状**

必须写清：

1. 当前公开平台
2. 手动下载与 release notes 的入口
3. `download.moryflow.com` 只用于应用内自动更新
4. 不写会“恢复”什么，除非代码和发布流程已经恢复

**Step 3: 核对更新流程表述**

不能继续沿用已经失真的 update channel 和设置入口描述。

**Step 4: 回写进度**

把 `Task 2` 改为 `DONE`。

**完成标准**

- 安装页、更新页、下载按钮三者口径一致。

**完成记录**

- 状态：DONE
- 完成内容：已重写 installation / updates 英中页面，统一公开平台、GitHub Releases、应用内更新和首次打开后的 vault 说明口径。
- 偏差：无

### Task 3: 重写 Settings 总览与导航

**Files:**

- Modify: `apps/moryflow/docs/content/docs/settings.mdx`
- Modify: `apps/moryflow/docs/content/docs/settings.zh.mdx`
- Modify: `apps/moryflow/docs/content/docs/settings/meta.json`
- Modify: `apps/moryflow/docs/content/docs/settings/meta.zh.json`

**Step 1: 读取当前产品设置事实**

Run:

```bash
sed -n '1,240p' docs/design/moryflow/features/pc-settings-information-architecture.md
sed -n '1,220p' apps/moryflow/pc/src/renderer/components/settings-dialog/const.ts
```

**Step 2: 把总览页改成当前 section 结构**

总览页必须至少覆盖：

1. Account
2. General
3. Personalization
4. Providers
5. MCP
6. Cloud Sync
7. About

**Step 3: 去掉旧入口描述**

包括但不限于：

1. gear icon top right
2. 旧的 language/update channel 组织方式
3. “Settings 只有四大项”心智

**Step 4: 回写进度**

把 `Task 3` 改为 `DONE`。

**完成标准**

- Settings 总览已经能作为当前产品文档入口页。

**完成记录**

- 状态：DONE
- 完成内容：已重写 Settings 总览英中页，改为当前 Account / General / Personalization / Providers / MCP / Cloud Sync / About 的真实结构。
- 偏差：无

### Task 4: 补齐 Settings 子页面

**Files:**

- Create: `apps/moryflow/docs/content/docs/settings/account-and-membership.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/account-and-membership.zh.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/providers-and-models.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/providers-and-models.zh.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/mcp.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/mcp.zh.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/cloud-sync.mdx`
- Create: `apps/moryflow/docs/content/docs/settings/cloud-sync.zh.mdx`
- Modify: `apps/moryflow/docs/content/docs/settings/meta.json`
- Modify: `apps/moryflow/docs/content/docs/settings/meta.zh.json`
- Review: `apps/moryflow/docs/content/docs/settings/ai-models.mdx`
- Review: `apps/moryflow/docs/content/docs/settings/custom-provider.mdx`
- Review: `apps/moryflow/docs/content/docs/settings/ollama.mdx`
- Review: `apps/moryflow/docs/content/docs/settings/theme.mdx`

**Step 1: 先补当前主路径页**

优先补：

1. Account and Membership
2. Providers and Models
3. MCP
4. Cloud Sync

**Step 2: 再处理旧专题页**

决定：

1. `ai-models` 保留并降级
2. `custom-provider` 并入 providers-and-models 或改成附属专题
3. `ollama` 保留为模型专题，但不再代表整个设置主路径
4. `theme` 继续保留

**Step 3: 所有新页都要有中文页**

不要先只建英文。

**Step 4: 回写进度**

把 `Task 4` 改为 `DONE`。

**完成标准**

- Settings 分组已经和当前产品结构对齐。

**完成记录**

- 状态：DONE
- 完成内容：已新增 Account and Membership、Providers and Models、MCP、Cloud Sync 四组英中页面，并把旧模型专题降级为参考页。
- 偏差：无

### Task 5: 重写 Features 总览与 AI 主线

**Files:**

- Modify: `apps/moryflow/docs/content/docs/features.mdx`
- Modify: `apps/moryflow/docs/content/docs/features.zh.mdx`
- Modify: `apps/moryflow/docs/content/docs/features/ai-assistant.mdx`
- Modify: `apps/moryflow/docs/content/docs/features/ai-assistant.zh.mdx`
- Review: `apps/moryflow/docs/content/docs/features/ai-tools.mdx`
- Review: `apps/moryflow/docs/content/docs/features/ai-tools.zh.mdx`
- Modify: `apps/moryflow/docs/content/docs/features/meta.json`
- Modify: `apps/moryflow/docs/content/docs/features/meta.zh.json`

**Step 1: 读取事实源**

Run:

```bash
sed -n '1,260p' docs/design/moryflow/features/chat-input-and-chat-pane.md
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-view.tsx
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/chat-pane/components/pre-thread-explore-panel/const.ts
```

**Step 2: 改总览页主叙事**

总览页不能再只写“Vault / Editor / Mory”。

至少要把这几件事说清：

1. local-first notes
2. Chat / pre-thread / task flow
3. AI assistant 的工作方式
4. MCP 扩展边界

**Step 3: 判断 `ai-tools` 是否独立保留**

如果当前内容只是旧清单，直接并入 `ai-assistant`，不再让用户维护两套理解路径。

**Step 4: 回写进度**

把 `Task 5` 改为 `DONE`。

**完成标准**

- Features 已能反映当前产品主路径，而不是旧版概览。

**完成记录**

- 状态：DONE
- 完成内容：已重写 Features 总览、AI Assistant 英中页，并把 ai-tools 改成高层运行时能力说明，退出主导航。
- 偏差：无

### Task 6: 重写 Cloud Sync / 多设备同步文档

**Files:**

- Modify: `apps/moryflow/docs/content/docs/advanced/sync.mdx`
- Modify: `apps/moryflow/docs/content/docs/advanced/sync.zh.mdx`
- Review: `apps/moryflow/docs/content/docs/getting-started/installation.mdx`
- Review: `apps/moryflow/docs/content/docs/faq.mdx`

**Step 1: 读取事实源**

Run:

```bash
sed -n '1,260p' docs/design/moryflow/features/pc-settings-information-architecture.md
sed -n '1,260p' apps/moryflow/pc/src/renderer/components/settings-dialog/components/cloud-sync-section.tsx
sed -n '1,260p' docs/reference/cloud-sync-and-memox-production-validation-playbook.md
```

**Step 2: 重写同步边界**

必须分清：

1. 产品内 Cloud Sync
2. 把本地 vault 放进外部云盘
3. 各自适用场景
4. 冲突、副本、恢复、离线等真实状态

**Step 3: 删除“云盘同步就是官方方案”的主叙事**

外部云盘可以保留为补充方案，但不能继续当成主路径。

**Step 4: 回写进度**

把 `Task 6` 改为 `DONE`。

**完成标准**

- `advanced/sync` 已与当前 Cloud Sync 事实对齐。

**完成记录**

- 状态：DONE
- 完成内容：已重写 `advanced/sync` 英中页，明确区分内置 Cloud Sync 和外部文件夹同步两条路径。
- 偏差：无

### Task 7: 清理 FAQ 与旧问答

**Files:**

- Modify: `apps/moryflow/docs/content/docs/faq.mdx`
- Modify: `apps/moryflow/docs/content/docs/faq.zh.mdx`

**Step 1: 逐条核对 FAQ**

重点清理：

1. Windows 恢复时间式表述
2. 旧同步方式
3. 旧设置入口
4. 旧模型配置方式

**Step 2: 补当前高频问题**

优先补：

1. 下载和更新去哪里看
2. Cloud Sync 和云盘同步有什么区别
3. 账号、会员、积分在设置里怎么看
4. MCP / Providers 怎么理解

**Step 3: 回写进度**

把 `Task 7` 改为 `DONE`。

**完成标准**

- FAQ 不再重复旧 IA 和旧能力边界。

**完成记录**

- 状态：DONE
- 完成内容：已重写 FAQ 英中页，统一为当前下载、更新、同步、账号、Providers、MCP 和离线路径的高频问题集。
- 偏差：无

### Task 8: 双语一致性与导航复核

**Files:**

- Review: `apps/moryflow/docs/content/docs/**/*.mdx`
- Modify: `apps/moryflow/docs/content/docs/meta.json`
- Modify: `apps/moryflow/docs/content/docs/meta.zh.json`

**Step 1: 核对英中页面配对**

检查：

1. 新增英文页是否有中文页
2. 导航顺序是否一致
3. 交叉链接是否成对

**Step 2: 统一内部链接**

避免：

1. 英文链到中文
2. 中文链到英文
3. 旧路径残留

**Step 3: 回写进度**

把 `Task 8` 改为 `DONE`。

**完成标准**

- 英中双语结构和导航一致。

**完成记录**

- 状态：DONE
- 完成内容：已核对英中页面配对、Settings / Features 导航一致性，并清理旧的 gear icon、Model Management、cloud drive 等入口口径。
- 偏差：无

### Task 9: 构建校验与交付收口

**Files:**

- Read: `apps/moryflow/docs/content/docs/meta.json`
- Read: `apps/moryflow/docs/content/docs/meta.zh.json`
- Read: `apps/moryflow/docs/content/docs/settings.mdx`
- Read: `apps/moryflow/docs/content/docs/features.mdx`
- Read: `apps/moryflow/docs/content/docs/advanced/sync.mdx`

**Step 1: 跑最小校验**

Run:

```bash
pnpm --filter @moryflow/docs typecheck
pnpm --filter @moryflow/docs build
```

**Step 2: 复核关键页面**

Run:

```bash
sed -n '1,240p' apps/moryflow/docs/content/docs/meta.json
sed -n '1,240p' apps/moryflow/docs/content/docs/meta.zh.json
sed -n '1,240p' apps/moryflow/docs/content/docs/getting-started/installation.mdx
sed -n '1,240p' apps/moryflow/docs/content/docs/settings.mdx
sed -n '1,240p' apps/moryflow/docs/content/docs/features.mdx
sed -n '1,260p' apps/moryflow/docs/content/docs/advanced/sync.mdx
sed -n '1,240p' apps/moryflow/docs/content/docs/faq.mdx
```

**Step 3: 做一次旧口径终检**

Run:

```bash
rg -n "gear icon|top right|OneDrive|Dropbox|会恢复|will restore|cloud drive|10\\+ built-in tools" apps/moryflow/docs/content/docs -g '*.mdx'
```

**Step 4: 回写进度**

把 `Task 9` 改为 `DONE`。

**完成标准**

- 文档站 build 通过。
- 高风险旧口径已清掉。
- 所有任务均为 `DONE`。

**完成记录**

- 状态：DONE
- 完成内容：已补装工作区依赖，完成 `@moryflow/docs` 的 `typecheck` / `build`，并复核站点导航、关键页面、旧口径终检和截图词清理结果。
- 偏差：为完成构建校验，额外执行了一次根目录 `pnpm install --frozen-lockfile`

## 9. 每步完成后的回写方式

每个 Task 完成后，必须同时做两件事：

1. 更新第 5 节“执行进度”表。
2. 在对应 Task 下面补一段 `完成记录`。

格式固定如下：

```md
**完成记录**

- 状态：DONE
- 完成内容：一句话说明这一步真正落了什么
- 偏差：没有则写“无”
```

## 10. 验证命令

执行完成后至少跑一次：

```bash
pnpm --filter @moryflow/docs typecheck
pnpm --filter @moryflow/docs build
rg -n "gear icon|top right|OneDrive|Dropbox|会恢复|will restore|cloud drive|10\\+ built-in tools" apps/moryflow/docs/content/docs -g '*.mdx'
find apps/moryflow/docs/content/docs -maxdepth 2 -type f | sort
sed -n '1,240p' apps/moryflow/docs/content/docs/meta.json
sed -n '1,240p' apps/moryflow/docs/content/docs/meta.zh.json
```

## 11. 交付标准

交付完成时，应满足：

1. `apps/moryflow/docs` 的导航结构已经按当前产品心智重排。
2. 下载、安装、更新口径与当前公开发布事实一致。
3. Settings 已经反映当前 PC 设置体系，而不是旧四页结构。
4. Features 和 Chat/AI 主线已经同步到当前产品。
5. `advanced/sync` 已经讲清 Cloud Sync 和外部云盘的边界。
6. 英中双语页面和导航已经同步。
7. 本计划文档本身已经可作为冻结执行稿直接落地。
