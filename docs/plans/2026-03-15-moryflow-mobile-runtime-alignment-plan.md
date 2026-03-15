---
title: Moryflow Mobile 端运行时重构与 PC 对齐方案
date: 2026-03-15
scope: apps/moryflow/mobile + apps/moryflow/server + packages/agents-runtime + packages/agents-tools
status: draft
---

# Moryflow Mobile 端运行时重构与 PC 对齐方案

## 1. 目标

这份方案解决两个已经被仓库事实源确认的问题：

1. Mobile 端当前能力面与 PC 不对齐，用户心智已经偏向“本地 Agent + 可操作环境”，但 Mobile 实际只有文件/搜索工具。
2. Mobile 端旧 Cloud Sync/binding 模型已经与 `Workspace Profile` 基线不兼容，导致 Memory/Sync/身份边界都无法与 PC 共线。

目标不是“做一个 Moryflow 版 iSH”，而是把 Mobile 端重构为：

1. 与 PC 共用同一套 `Workspace Profile + documentId + workspaceId` 主链。
2. 与 PC 共用同一套 Agent 控制面、权限语义、消息协议与工具展示协议。
3. 在 iOS 上补齐真正需要的本地执行能力：浏览器、设备能力桥、自动化入口，以及可选的本地 shell lane。

## 2. 当前判定

结合仓库当前实现，Mobile 的根因不是“少一个按钮”，而是底层合同不对：

1. Mobile runtime 当前只注入 `createMobileFileToolsToolset`，能力面只有文件/搜索/web/image/task，缺失 bash、browser、device bridge、subagent、MCP 这类 PC 用户实际感知到的能力。
2. Mobile 平台提示词明确声明“不提供 bash、subagent、skill、MCP 工具”，这与 PC 的产品心智已经分叉。
3. Mobile `Cloud Sync` 已被显式关闭，原因不是 UI 未完成，而是旧 binding 模型已经与 `Workspace Profile` 架构失配。
4. Mobile 侧目前没有 `clientWorkspaceId / workspaceId / profileKey / Document Registry / Memory Indexing Engine`，因此即使前端交互接近 PC，底层身份和数据链路仍然不一致。
5. Mobile UI 仍保留 `ask/full_access`、tool card、approval、task snapshot 等 PC 风格壳层，这会进一步放大“看起来像 PC，实际上能力不一致”的落差。

## 3. 外部实现调研

### 3.1 Minis

公开可验证信息来自 NodeSeek 帖子与 TestFlight 公链页面。

可确认的外显特征：

1. 它把自己描述为本地运行的 AI agent，不依赖自建中转服务，网络请求主要只到用户选择的模型提供商。
2. 它公开强调内建 `shell` 与 `browser tools`，并且支持多步自动执行。
3. 帖子作者说明它通过“魔改 iSH”拿到本地 Linux 类运行环境，并通过命令行工具桥接 iOS 设备能力，例如地图、照片、日程、闹钟。
4. 帖子展示了 Shortcuts/Action Button 触发，这说明它不只是一个聊天页，而是已经把系统级触发入口打通。

能推断但无法仅靠公开页面完全证实的部分：

1. Minis 很可能采用了“本地 Unix 运行时 + 原生能力桥 + 内嵌浏览器执行器”的三层结构。
2. 其中 shell lane 很可能借了 iSH 的用户态 Linux/终端经验，但浏览器与 iOS 设备能力桥不太可能直接来自 iSH，而是额外原生实现。

结论：

1. Minis 的可借鉴点不是“iOS 上一定要塞完整 Linux”。
2. 真正关键是它把“本地 Agent 控制面”和“iOS 原生能力”接到了同一条工具链里。

### 3.2 iSH

iSH 的一手公开实现里，最值得借鉴的是底层模式，不是整个代码库本身。

它的关键做法：

1. 用 x86 user-mode emulation + syscall translation 在 iOS 内跑 Linux shell。
2. 用 `fakefs` 挂一个 Linux rootfs，真实文件落在宿主目录，inode/metadata 用 sqlite 维护。
3. 用 PTY + terminal view 跑出真正的 shell session。
4. 通过 `LinuxInterop` 在 iOS 主线程与 Linux workqueue 之间双向桥接。
5. 在启动时创建 `/dev/clipboard`、`/dev/location` 之类的设备节点，把原生能力暴露给 Linux 侧进程。
6. 用 `FileProviderExtension` 把内部文件系统暴露给 iOS Files。

这说明 iSH 真正有价值的不是“终端 UI”，而是三件事：

1. 它证明了 iOS 内可以稳定维护一个类 Unix 运行时。
2. 它证明了原生能力可以被包装成 shell/文件系统可消费的接口。
3. 它证明了 Files、App Group、PTY、native bridge 这几层可以共存。

但 iSH 也明确给出两个重要限制：

1. 它不是安全边界，项目目标是兼容性，不是容器隔离。
2. 这套实现维护成本很高，性能、可读性、调试难度都不适合作为业务产品的默认主链。

因此，iSH 更适合作为“可选 Unix lane”的技术来源，而不适合作为 Moryflow Mobile 的第一主链。

### 3.3 a-Shell

a-Shell 提供了另一条很重要的对照线：

1. 它不是完整 Linux 仿真，而是 `ios_system + Python/Lua/WASM` 的类 Unix 工具集合。
2. 它把外部目录访问做成 bookmarks，而不是假装自己拥有桌面级文件系统。
3. 它把 Shortcuts 做成正式入口，并区分 “In Extension” 轻量执行 与 “In App” 完整执行。

这对 Moryflow 的启发是：

1. 自动化入口、Action Button、Shortcuts 这些能力不依赖完整 Linux VM 也能成立。
2. “先做正式的系统入口与轻量执行 lane”，比“先做完整 shell”更符合产品收益。

## 4. 方案比较

### 4.1 方案 A：原地补 UI，不动运行时

做法：

1. 保留当前 Mobile 文件工具 runtime。
2. 只在 UI 上继续补齐外观和交互。

优点：

1. 改动小。
2. 风险低。

缺点：

1. 根因不变。
2. 与 PC 的能力合同继续分叉。
3. 未来每补一个 Mobile 能力都要继续打补丁。

结论：不采用。

### 4.2 方案 B：直接把 Mobile 做成 iSH 类完整本地 Linux runtime

做法：

1. 直接引入或 fork 一条 iSH 类 Linux shell/runtime。
2. 把 Agent 能力统一收敛到 shell 与 CLI 工具。

优点：

1. shell 能力最强。
2. 与“本地 agent”宣传最容易讲故事。

缺点：

1. 与当前 Expo/RN 架构距离太远。
2. 维护成本、包体积、性能成本和 App Review 风险都高。
3. 很多真正需要的 iOS 能力仍然必须自己做 native bridge。
4. 不能直接解决 `Workspace Profile + documentId + workspaceId` 主链问题。

结论：不作为主方案，只保留为后续实验 lane。

### 4.3 方案 C：Hybrid，先统一控制面与身份主链，再补 Browser/Device，本地 shell 作为可选 lane

做法：

1. 先把 Mobile 的身份、文件、Memory、对话、工具合同拉回到和 PC 同一条主链。
2. 把缺失的 Mobile 关键能力拆成两个正式 runtime：`browser runtime` 与 `device capability runtime`。
3. 把 shell 能力降级为后续独立实验 lane，不阻塞主线交付。

优点：

1. 直接解决当前与 PC 不对齐的根因。
2. 复用现有 `@moryflow/agents-runtime`、`@moryflow/agents-tools`、`Workspace Profile` 设计。
3. 浏览器和 iOS 设备能力都能用正式原生桥实现，不必绕道完整 Linux。
4. 后续如果仍然需要 shell，再挂接到统一控制面即可。

缺点：

1. 初期能力宣传没有“完整 Linux Shell”那么激进。
2. 需要同时改 runtime、workspace profile、memory indexing、browser runtime、device bridge。

结论：推荐采用。

## 5. 推荐架构

### 5.1 三层模型

Mobile 端改造后应固定为三层：

1. Shared Control Plane
2. Native Capability Runtime
3. Optional Unix Lane

### Shared Control Plane

保持与 PC 共线的部分：

1. `Workspace Profile`
2. `documentId / workspaceId / profileKey`
3. `@moryflow/agents-runtime` 的消息协议、tool/reasoning 展示、approval 语义、task snapshot
4. `ask / full_access` 的产品心智，但其含义固定为“对当前注入能力的权限策略”，不是系统级 root

### Native Capability Runtime

这是 Mobile 主线能力层，负责：

1. 文件系统与文档身份
2. Browser runtime
3. iOS 设备能力桥
4. Shortcuts / App Intents / Action Button

### Optional Unix Lane

这是独立实验层：

1. 只在后续确实有 shell/pipeline/package manager 场景无法被高阶工具覆盖时再引入
2. 可以参考 iSH 的 PTY、fakefs、App Group、device bridge 模式
3. 不进入第一阶段正式主链

### 5.2 先统一“能力合同”，不要先统一“宿主实现”

PC 与 Mobile 不需要共享同一份宿主执行器，但必须共享同一份能力合同。

建议新增统一能力清单与注入清单：

1. `workspace`：resolve current workspace/profile/document scope
2. `file`：read/write/edit/delete/move/ls/glob/grep/search
3. `memory`：index/search/overview 依赖 `workspaceId`
4. `browser`：navigate/extract/click/type/evaluate/snapshot
5. `device`：location/photos/calendar/reminders/notifications/share/maps
6. `automation`：Shortcuts/App Intents 触发与后台轻量执行
7. `shell`：可选，不默认承诺

这里的关键是：

1. Agent prompt 不再写死“移动端只有文件工具”。
2. 运行时应从真实注入的工具生成 capability manifest，再反向生成 prompt 与 UI 表述。
3. 这样 PC/Mobile 共享的是“工具语义”，不是“必须都有 bash”。

### 5.3 先修 `Workspace Profile`，再谈 Cloud Sync

Mobile 当前最大的问题不是 sync toggle 被隐藏，而是还没迁到 `Workspace Profile` 主链。

推荐顺序：

1. Mobile 工作区先生成稳定 `clientWorkspaceId`
2. 登录后先走 `workspaces/resolve`
3. 本地文件身份先通过 `Document Registry` 生成稳定 `documentId`
4. `Memory Indexing Engine` 直接按 `workspaceId + documentId` 走 `workspace-content batch-upsert/delete`
5. Cloud Sync transport 在 Mobile 上继续保持 second phase，不再用旧 binding 模型续命

这样做的结果：

1. 不开 sync，Memory 也能和 PC 共线
2. rename/move 不再丢身份
3. 后续 sync 只是 transport，而不是 Memory 主链

### 5.4 Browser Runtime 走原生 `WKWebView` 主线

Minis 的“browser tool”是必须补齐的，因为它是 PC 端 Playwright/Browser 能力在 Mobile 上最明显的缺口。

推荐做法：

1. 新建单独 `browser-runtime` 模块，内部维护隐藏 `WKWebView` 池与每会话浏览上下文
2. 对外只暴露窄接口工具：
   - `browser_open`
   - `browser_snapshot`
   - `browser_click`
   - `browser_type`
   - `browser_eval`
   - `browser_close`
3. 不追求完整 Playwright 兼容层，避免在 iOS 上重造一个不稳定的浏览器自动化 DSL
4. 工具输出继续复用现有 tool card / output truncation / approval 协议

这是 Moryflow Mobile 与 PC 重新对齐的关键，因为用户感知上的“Agent 能不能真正做事”，浏览器执行比本地 shell 更重要。

### 5.5 设备能力桥走“高阶工具优先，CLI shim 次之”

对照片、地图、提醒事项、日历、定位、分享、通知等能力，推荐优先暴露高阶原生工具，而不是先暴露成 shell。

推荐结构：

1. JS/TS 层：`device-tools/*`
2. Native module 层：封装 iOS framework 权限与调用
3. Agent tool 层：暴露结构化输入/输出

例如：

1. `device_get_location`
2. `device_list_photos`
3. `device_import_photo_to_workspace`
4. `calendar_list_events`
5. `calendar_create_event`
6. `reminders_create`
7. `maps_open_route`
8. `notification_schedule`

如果后续真的要补 shell lane，再提供 CLI shim：

1. `mf-location get`
2. `mf-photo import`
3. `mf-calendar list`

这个模式借鉴 iSH 的 `/dev/location` 思路，但更适合 Moryflow 当前的共享工具栈。

### 5.6 `full_access` 在 Mobile 上重新定义

Mobile UI 已经有 `ask/full_access`，但当前底层没有足够多的能力，导致这个开关的实际意义偏空。

改造后应冻结为：

1. `ask`：命中敏感工具或敏感资源时请求确认
2. `full_access`：对当前已注入的 browser/device/file 能力自动放行
3. 仍然不宣称获得 iOS 宿主级 unrestricted shell

也就是说，Mobile 的 `full_access` 是“产品能力全集的自动审批”，不是“桌面 root”。

### 5.7 Optional Unix Lane 只做 Beta/实验

如果后续评估确认 shell 是必须能力，建议单独做 `moryflow-runtime` 实验 target，而不是污染主线。

参考 iSH 的部分：

1. PTY session
2. fakefs/rootfs
3. native bridge
4. File Provider/App Group

但边界必须明确：

1. 不把它当安全容器卖点
2. 默认不开启
3. 只服务于少数确实必须 shell pipeline 的场景

## 6. 实施分期

### Phase 0：冻结主合同

目标：先把 PC/Mobile 共享事实源补齐，避免边做边漂。

建议修改/新增：

1. `docs/plans/2026-03-15-moryflow-mobile-runtime-alignment-plan.md`
2. 后续被采纳后回写：
   - `docs/design/moryflow/core/workspace-profile-and-memory-architecture.md`
   - `docs/design/moryflow/core/ui-conversation-and-streaming.md`
   - `docs/design/moryflow/core/pc-permission-architecture.md`
   - 新增 Mobile runtime 正式 design 文档

产出：

1. Mobile/PC capability matrix
2. Mobile 不再沿用旧 binding/sync 心智
3. shell 变成可选 lane，而不是前置依赖

### Phase 1：能力合同与工具装配重构

目标：先让 runtime 真正按“已注入能力”说话。

建议修改/新增：

1. `packages/agents-runtime/src/prompt/build.ts`
2. `packages/agents-runtime/src/prompt/platform/*`
3. 新增 `packages/agents-runtime/src/capability-manifest/*`
4. `packages/agents-tools/src/toolset/mobile-file-tools.ts`
5. 新增 `packages/agents-tools/src/toolset/mobile-hybrid-tools.ts`
6. `apps/moryflow/mobile/lib/agent-runtime/runtime.ts`

关键动作：

1. 用 capability manifest 生成 prompt 与 UI 说明
2. 把 Mobile 当前“文件工具集”升级为“Hybrid 工具集”
3. 允许 runtime 分阶段注入 browser/device 工具，而不是把“无 bash”写死成平台定义

### Phase 2：Mobile `Workspace Profile` / `Document Registry` / Memory Indexing

目标：先把身份和数据主链拉齐到 PC。

建议新增：

1. `apps/moryflow/mobile/lib/workspace-profile/*`
2. `apps/moryflow/mobile/lib/document-registry/*`
3. `apps/moryflow/mobile/lib/memory-indexing/*`

建议修改：

1. `apps/moryflow/mobile/lib/vault/vault-manager.ts`
2. `apps/moryflow/mobile/lib/vault/vault-service.ts`
3. `apps/moryflow/mobile/lib/cloud-sync/*`
4. `apps/moryflow/mobile/app/(settings)/cloud-sync.tsx`

关键动作：

1. Mobile 本地 Vault identity 改成 `clientWorkspaceId`
2. 登录后 resolve `workspaceId`
3. Markdown 文档获得稳定 `documentId`
4. 本地文件变更直接驱动 `workspace-content batch-upsert/delete`
5. `Cloud Sync` 页面保留信息面，但不再承接旧 binding 自动修补逻辑

### Phase 3：Browser Runtime

目标：补齐 Mobile 最重要的“可执行环境”缺口。

建议新增：

1. `apps/moryflow/mobile/lib/browser-runtime/*`
2. `apps/moryflow/mobile/components/browser-runtime/*`
3. `packages/agents-tools/src/browser/mobile-*`

建议修改：

1. `apps/moryflow/mobile/lib/chat/transport.ts`
2. `apps/moryflow/mobile/components/ai-elements/tool/*`
3. `apps/moryflow/mobile/app/(tabs)/index.tsx`

关键动作：

1. 建立隐藏/复用式 `WKWebView` runtime
2. 工具调用结果继续用 shared tool card 协议输出
3. 浏览器上下文与 chat session 绑定

### Phase 4：Device Capability Runtime + Shortcuts

目标：把 Minis 这类产品最有差异化的“手机可反向被 Agent 使用”能力补齐。

建议新增：

1. `apps/moryflow/mobile/lib/device-tools/*`
2. `apps/moryflow/mobile/ios/*` 对应原生模块
3. `apps/moryflow/mobile/app-intents/*` 或同等 target

关键动作：

1. 先做 location/photos/calendar/reminders/notifications 这批高价值能力
2. 正式支持 Shortcuts/App Intents
3. 将轻量任务支持后台/扩展执行，复杂任务则显式拉起主 App

这一阶段更适合参考 a-Shell 的 “In Extension / In App” 双 lane，而不是参考 iSH 的完整 shell。

### Phase 5：Cloud Sync Transport Rewrite

目标：在已完成 `Workspace Profile` 主链后，再恢复真正有意义的 Sync。

关键动作：

1. 删除旧 binding 自动修补路线
2. 让 sync 只承担 transport，不再承担 identity 与 memory ingest
3. 对齐 PC 的 `sync_object_ref` / `inline_text` 双模投影

### Phase 6：Optional Unix Lane PoC

目标：验证 shell 是否真的还有不可替代的业务价值。

成功标准：

1. 能跑有限命令集
2. 能通过 CLI shim 调用 device/browser 能力
3. 不破坏主线 runtime
4. 不把产品主能力建立在“不稳定的本地 Linux 仿真”上

## 7. 明确不做

第一阶段明确不做：

1. 不为了追求“完整 Linux”而把 iSH 整体并入主线
2. 不保留旧 mobile cloud binding 兼容层
3. 不把 Mobile `full_access` 解释成桌面级 unrestricted shell
4. 不在 Mobile 第一阶段承诺 MCP/subagent 全量对齐

## 8. 风险与控制

### 8.1 最大技术风险

1. 如果先做 shell，再回头补 `Workspace Profile`，会再次形成第二套主链
2. Browser runtime 如果直接模仿 Playwright，会在 iOS 上维护一套脆弱兼容层
3. Device bridge 如果先做 CLI，再补结构化工具，会把 agent contract 做脏

### 8.2 控制策略

1. 所有能力先纳入 capability manifest
2. 身份主链优先于执行器
3. Browser/device 优先走结构化工具
4. shell 只做可选 lane

## 9. 验收标准

完成主线改造后，至少满足：

1. Mobile 与 PC 共享 `workspaceId + documentId + profileKey` 主链
2. Mobile 不开 sync 也能正常 Memory ingest/search
3. Agent 能在 Mobile 上执行正式 browser tools
4. Agent 能调用至少一批 iOS 原生设备能力
5. `ask/full_access` 在 Mobile 上有真实工具审批意义
6. `Cloud Sync unavailable` 不再是“因为旧架构不兼容”，而是“transport phase 尚未启用”的清晰产品边界

## 10. 推荐结论

推荐执行 `Hybrid` 主方案：

1. 先做 `Workspace Profile + capability manifest + browser/device runtime`
2. 再恢复 `Cloud Sync transport`
3. 最后再决定是否做 `iSH-inspired optional Unix lane`

这条路线能直接解决 Moryflow Mobile 当前的真实问题：

1. 不是“少一个 shell”
2. 而是“身份主链、工具合同、执行环境三者同时和 PC 脱线”

## 11. 采集时间与来源

采集时间：2026-03-15

来源：

1. [NodeSeek 帖子：可能是 ios 端最强 ai agent app：Minis](https://www.nodeseek.com/post-650090-1)
2. [Open Minis TestFlight 公链页面](https://testflight.apple.com/join/3BdkA5c3)
3. [iSH README](https://github.com/ish-app/ish/blob/master/README.md)
4. [iSH SECURITY.md](https://github.com/ish-app/ish/blob/master/SECURITY.md)
5. [iSH app/AppDelegate.m](https://github.com/ish-app/ish/blob/master/app/AppDelegate.m)
6. [iSH app/LinuxInterop.c](https://github.com/ish-app/ish/blob/master/app/LinuxInterop.c)
7. [iSH app/LocationDevice.m](https://github.com/ish-app/ish/blob/master/app/LocationDevice.m)
8. [iSH app/FileProvider/FileProviderExtension.m](https://github.com/ish-app/ish/blob/master/app/FileProvider/FileProviderExtension.m)
9. [a-Shell README](https://github.com/holzschu/a-shell/blob/master/README.md)
10. [a-Shell ExecuteCommandIntentHandler.swift](https://github.com/holzschu/a-shell/blob/master/a-Shell-Intents/ExecuteCommandIntentHandler.swift)

筛选口径：

1. 优先使用一手公开源码、README、TestFlight 公链描述
2. 对 Minis 未公开仓库的部分仅做显式推断，不当作确定事实
3. 对 Moryflow 当前状态只引用仓库内现有事实源与当前实现
