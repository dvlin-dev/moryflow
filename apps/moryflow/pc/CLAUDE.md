# PC App

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow 桌面端应用，基于 Electron + React 构建。

## 职责

- 提供桌面端用户界面
- 本地笔记编辑与管理
- AI 对话交互（支持本地 Ollama）
- 本地文件系统访问
- 云同步客户端
- Agent task snapshot 面板（checklist）

## 约束

- 主进程与渲染进程严格分离，通过 IPC 通信
- 渲染进程使用 TailwindCSS
- 主进程处理文件系统、网络、Agent 运行时等重操作
- 敏感操作（文件访问、网络请求）必须在主进程执行
- Providers 设置页的“测试连接”必须基于用户已启用模型的第一个（不允许写死默认模型做 fallback）
- 当用户填写 API Key 或开启任意模型时，UI 应自动开启对应服务商，避免“已配置但忘记启用”
- Custom Provider 必须支持模型列表管理（添加/启用/禁用/删除），否则无法测试与选择模型
- Providers 左侧列表仅保留“会员模型 + Providers”两类；Providers 内部排序为启用在上、未启用在下，并在切换 active provider 时才刷新顺序（避免编辑时跳动）
- 全局样式引入 `/ui/styles`，Electron 专属样式保留在 `src/renderer/global.css`
- `electron.vite.config.ts` 需为 `/ui/styles` 设置别名，避免解析到 `packages/ui/src`
- 外链打开与窗口导航必须走主进程 allowlist 校验（`MORYFLOW_EXTERNAL_HOST_ALLOWLIST` 可扩展）
- 图标库统一 Lucide（`lucide-react`，直接组件调用）
- Renderer 使用 Vitest + RTL 补齐核心 hooks 单测
- Vitest 配置需确保 React 单实例（alias/dedupe），hooks 单测可 mock i18n
- E2E 基线使用 Playwright（Electron），核心流程需覆盖创建 Vault/笔记与入口页
- E2E 运行可使用 `MORYFLOW_E2E_USER_DATA`/`MORYFLOW_E2E_RESET` 隔离与重置数据
- preload 构建需输出 CJS（sandbox 下 ESM preload 会报错）
- `postinstall` 会执行 `electron-rebuild`，确保 `better-sqlite3`/`keytar` 与 Electron ABI 匹配

## 技术栈

| 技术        | 用途        |
| ----------- | ----------- |
| Electron    | 桌面框架    |
| React       | 渲染进程 UI |
| TailwindCSS | 样式系统    |
| Vite        | 构建工具    |

## 成员清单

| 文件/目录                      | 类型 | 说明                    |
| ------------------------------ | ---- | ----------------------- |
| `src/main/`                    | 目录 | 主进程代码              |
| `src/main/index.ts`            | 入口 | 主进程入口              |
| `src/main/agent-runtime/`      | 目录 | Agent 运行时            |
| `src/main/agent-settings/`     | 目录 | Agent 设置管理          |
| `src/main/chat/`               | 目录 | 聊天服务                |
| `src/main/chat-session-store/` | 目录 | 聊天会话存储            |
| `src/main/cloud-sync/`         | 目录 | 云同步服务              |
| `src/main/vault/`              | 目录 | 知识库服务              |
| `src/main/vault-watcher/`      | 目录 | 文件监听服务            |
| `src/main/ollama-service/`     | 目录 | 本地 Ollama 服务        |
| `src/renderer/`                | 目录 | 渲染进程代码            |
| `src/renderer/App.tsx`         | 入口 | 渲染进程入口            |
| `src/renderer/components/`     | 目录 | UI 组件                 |
| `src/renderer/workspace/`      | 目录 | 工作区布局              |
| `src/renderer/hooks/`          | 目录 | 自定义 Hooks            |
| `src/renderer/lib/`            | 目录 | 工具库                  |
| `src/preload/`                 | 目录 | 预加载脚本（IPC 桥接）  |
| `src/shared/`                  | 目录 | 主进程/渲染进程共享代码 |
| `src/shared/ipc/`              | 目录 | IPC 通道定义            |
| `tests/`                       | 目录 | Playwright E2E 测试     |
| `playwright.config.ts`         | 配置 | Playwright 配置         |

## 常见修改场景

| 场景           | 涉及文件                          | 注意事项                                         |
| -------------- | --------------------------------- | ------------------------------------------------ |
| 新增 UI 组件   | `src/renderer/components/`        | 使用 TailwindCSS + shadcn                        |
| 修改工作区布局 | `src/renderer/workspace/`         | 参考现有 render 函数模式                         |
| 新增 IPC 通道  | `src/shared/ipc/`, `src/preload/` | 双向定义，类型安全                               |
| 修改聊天功能   | `src/main/chat/`, `src/renderer/` | 注意 IPC 通信                                    |
| 修改文件操作   | `src/main/vault/`                 | 在主进程执行                                     |
| 修改云同步     | `src/main/cloud-sync/`            | 参考 docs/products/moryflow/features/cloud-sync/ |

## 近期变更

- 2026-03-07：Agent task 轻量化落地：任务状态统一并入 `ChatSessionSummary.taskState`，PC 端只保留 session-backed `task` 工具与 snapshot-only 任务面板；`tasks:list/get` IPC、独立 store 与详情面板链路已删除。
- 2026-03-06：`src/test/setup.ts` 统一为 renderer 单测环境补齐内存 `localStorage`，并将 `chat-thinking-overrides.test.ts` 清理逻辑改为按 key 隔离，根治 Vitest/JSDOM 下 `window.localStorage` 实现不完整导致的历史红灯；全仓 `pnpm test:unit` 已恢复通过。
- 2026-03-05：Telegram Agent 配置新增“进入页面自动代理探测”能力：主进程 `telegram:detectProxySuggestion` 打通 `shared-ipc -> preload -> ipc-handlers -> settings-application-service` 全链路；探测策略为“先测直连，再测系统/环境代理候选”，Renderer 仅在未保存代理且用户未编辑时自动回填建议（不自动保存）。
- 2026-03-04：Telegram C+ 会话路由重构完成：共享包 `channels-core` 删除 `ThreadResolution.sessionKey`，`channels-telegram` 新增命令解析器（`/start`、`/new`）；PC 主进程新增 `conversation-service` 与 `channel_conversation_bindings` 持久化映射，入站消息改为先解析真实 `conversationId` 再执行 `runChatTurn`，根治“未找到对应的对话”。
- 2026-03-04：Telegram settings 回显行为补齐：重启后 `Bot Token` 回填到 password 输入（主进程密文 echo，renderer 不接触明文），`Proxy URL` 回填到 text 输入（明文显示）。主进程 `getSettings` 快照改为 `botTokenEcho/proxyUrl`，renderer `telegram-section` 改为优先消费回填值；对应行为测试与 settings application service 测试已补齐。
- 2026-03-04：Telegram 设置 Proxy 闭环补完：`workspace/components/agent-module/telegram-section.tsx` 的 `Enable Proxy`/`Proxy URL`/`Test Proxy` 改为主表单默认可见（不再依赖展开 Advanced），且 `Proxy URL` 输入框改为明文显示；保存后新增 runtime 失败复核，若出现 `enabled + hasBotToken + !running + lastError` 则视为失败并保留 `botToken` 输入值，避免失败后被清空；并在“无已存 proxy”场景默认预填 `http://127.0.0.1:6152`。保存语义收敛为“仅显式修改才写/删 secret”（未修改字段不提交 `null`，手动清空才提交 `null`）；`/new` 指令新增同 update 重试幂等保护。主进程 `telegram:testProxyConnection` IPC、keytar 托管与 `proxy-agent` 三协议链路保持不变并通过回归测试。
- 2026-03-03：Telegram 二轮 review 闭环完成：主进程 `channels/telegram` 拆分为 runtime/reply/settings/pairing 四个子服务，`webhook` 本地监听默认收敛到 `127.0.0.1:8787` 并与公网 URL 解耦；Settings Telegram 分区补齐 webhook 前置校验与 Pairing 审批失败态交互，新增对应回归测试（validation + ingress 413）。
- 2026-03-03：Telegram Bot API 渠道接入落地：新增 `@moryflow/channels-core` / `@moryflow/channels-telegram` 依赖；主进程接入 `src/main/channels/telegram` runtime 装配（keytar 凭据托管 + sqlite 持久化 + IPC 桥接 + pairing 审批中心）；Settings 新增 Telegram 分区（单账号主路径 + 高级折叠）；pairing pending 请求新增按 TTL 自动过期收敛。
- 2026-03-03：Workspace review 闭环：`useWorkspaceVault` 的无 workspace 提示改为状态派生（避免 open/create 取消后提示消失）；`useDocumentState` 在 active workspace 变空时立即清空编辑器/Tab 并加入异步恢复版本保护，防止旧 workspace 文档残留可编辑。
- 2026-03-03：新增 Playwright E2E `tests/chat-chips.spec.ts`，回归覆盖“输入区当前文件+选区双胶囊提交后：选区胶囊立即清空、当前文件胶囊保留、用户消息下回显双胶囊”链路（含自定义 provider 配置注入与真实提交路径校验）。
- 2026-03-03：Skills 升级迁移与并发同步回归修复：`src/main/skills/state` 读取旧 `curatedPreinstalled` 时自动迁移 `skippedPreinstall`（保留历史卸载偏好）；`src/main/skills/installer` 原子覆盖新增 `requireExistingTarget`，后台远端同步仅在目标目录仍存在时覆盖，避免用户卸载后被静默装回。
- 2026-03-03：Skills review 闭环：移除兼容目录自动导入（收敛零兼容）；`src/main/skills/remote.ts` 增加 GitHub 下载域名白名单与鉴权头隔离（文件下载不透传 token），补齐对应单元测试；`agent-browser` 模板示例中移除疑似明文口令写法，并将旧口令环境变量收敛为 `APP_LOGIN_SECRET`，持续规避安全扫描误报。
- 2026-03-03：Skills 远端同步补强：`src/main/skills/remote.ts` 改为通过 Git tree 元数据保留远端文件可执行权限（`100755`），并在下载前/下载中按剩余预算执行文件体积限制，避免超大文件先读入内存造成主进程高内存风险。
- 2026-03-03：Skills 内置与同步机制重构：`src/main/skills` 新增 `catalog/remote/installer/state/file-utils` 分层，内置 baseline 扩展为 16 个（14 自动预装 + 2 推荐，新增 `macos-automation`）；每次冷启动对 curated 列表逐项请求 GitHub revision，命中更新后原子覆盖本地版本并回滚保护；`tsconfig.node.json` 新增 `src/main/skills/builtin/**/*` 排除，避免第三方 skill 内示例 `.tsx` 干扰主进程 typecheck。
- 2026-03-03：Skills Review 闭环加固：状态持久化新增串行写入与 `mutateState` 原子更新，修复远端同步覆盖用户启停状态；新增 `skippedPreinstall` 持久化，显式卸载的预装 skill 不再被 `refresh()` 自动装回；skill 解析统一以目录名为 canonical name，修复上游 frontmatter 命名漂移导致的初始化失败。
- 2026-03-03：Workspace 启动流程收口：Renderer 删除 `VaultOnboarding` 启动页分支，冷启动统一走 hydration skeleton；无活动 workspace 时主界面顶部显示提示条并自动切到 Home 侧栏，避免首次打开闪烁与页面跳变。
- 权限模型重写（2026-03-02）：输入框权限收敛为 `Ask | Full access`（`agent` 语义删除）；`full_access` 仅在 Vault 内覆盖 deny；Vault 外统一走 External Paths 授权清单（未授权先审批授权，拒绝则阻断）；Settings 删除 sandbox mode 与 MCP `autoApprove`，仅保留外部路径授权管理。
- 2026-03-02：PC 构建/测试类型解析补齐 `@moryflow/agents-runtime/*` 源码 alias（`electron.vite.config.ts`、`vitest.config.ts`、`tsconfig.json`），确保 Chat Tool/Reasoning 共享可见性策略在 renderer 与测试环境一致生效。
- 2026-03-02：Vitest 解析别名与 renderer 构建对齐，补充 `@moryflow/ui/*` / `@moryflow/tiptap/*` 源码 alias，避免单测环境下 `@moryflow/ui/ai/prompt-input` 目录导入解析失败。
- Sidebar/TopBar 信息架构重构（2026-02-28）：侧栏模式语义统一为 `SidebarMode(Home/Chat)`；顶部新增 `Home|Chat + Search icon`；Chat 侧栏仅保留 Threads；底部固定 `New chat`；设置入口迁移到 `UnifiedTopBar` 右上角；旧 `agent-sub-switcher/search-dialog` 相关实现已删除。
- Thinking 日志体系补强（2026-02-27）：`thinking-debug.log` 改为异步写盘并增加启动失败降级（console-only，不阻断启动）；模型解析日志改为白名单脱敏输出，避免写入不必要的 provider 配置细节。
- Thinking 链路重构（2026-02-27）：PC 主进程思考渲染改为 Raw-only（仅展示 provider 原始 reasoning 流），删除“未返回 reasoning”UI 补充文案；新增全环境默认开启的 thinking JSONL 文件日志，并在每次应用启动时自动清空。
- Providers 模型编辑弹窗稳定性修复：`EditModelDialog` 的 thinking levels 改为 `useMemo` 稳定依赖，避免 effect 重复触发导致 `Maximum update depth exceeded`；同时为 Add/Edit Model Dialog 补齐 `DialogDescription`，消除 Radix a11y 警告（2026-02-27）
- Thinking 默认映射收敛：Chat 模型列表与 Providers 设置页统一改为消费 `@moryflow/api` 的共享 defaults（levels/visibleParams/labels），移除本地重复硬编码映射，避免跨端等级参数漂移（2026-02-27）
- Renderer 组件优化专项（模块 D）完成一次性修复：`vault-files` 共享状态迁移到 store-first（移除 Context），`cloud-sync-section` 拆成容器 + ready 内容层，`site-list/publish-dialog` 拆分并统一状态分发 `switch`（2026-02-26）
- Chat 模型思考重构落地：Settings 删除 `enabledLevels/levelPatches` 配置，用户仅设置默认等级；Membership 云端 `thinking_profile` 解析对齐 `visibleParams`；输入框 Thinking 下拉展示“模型原生等级 + 默认参数”（2026-02-26）
- Renderer 组件优化专项（模块 A）完成代码改造：Settings Dialog（Providers/MCP/Cloud Sync/Account）与 Payment Dialog 的状态编排和组件分层已收敛，等待依赖安装后补跑模块级验证
- `electron.vite.config.ts` 的 renderer alias 全量切换到 `@moryflow/*`（含 `@moryflow/tiptap/styles/*` 正则映射），避免样式导入错误落到 `packages/tiptap/src/styles/*` 不存在路径（2026-02-25）
- `test:unit` 脚本改为 ABI 双态：`pretest:unit` 先执行 `pnpm rebuild better-sqlite3` 切换 Node ABI，`posttest:unit` 再执行 `electron-rebuild -f -w better-sqlite3,keytar` 恢复 Electron ABI，避免单测与桌面运行互相污染（2026-02-24）
- `electron.vite` 主进程构建新增 `copy-builtin-skills`：将 `src/main/skills/builtin` 复制到 `dist/main/builtin`，确保打包后预设 skills 可被主进程文件扫描链路读取。
- 启动性能：移除 `preload:*` IPC/预加载落盘缓存，预热回退为 Renderer 侧轻量 warmup（仅 idle `import()` ChatPane/Shiki）；AgentSettings 读取收敛单飞资源，修复设置弹窗偶发一直 Loading
- Vault：新增 `vault:ensureDefaultWorkspace`，首次启动自动创建默认 workspace（`~/Documents/Moryflow/workspace`），并由 Renderer 统一在主壳层内完成 hydration 展示（不再渲染独立 onboarding 页面）
- workspace-settings：`lastMode`/`lastAgentSub` 全量替换为 `lastSidebarMode`；IPC 统一为 `workspace:getLastSidebarMode/setLastSidebarMode`（全局记忆 Home/Chat）
- ChatPaneHeader 高度写入 CSS 变量，消息列表顶部 padding 动态对齐
- 移除 assistant-ui 直连依赖与 adapter，滚动交互继续在 `@moryflow/ui` 内复刻
- Chat 主进程持久化切换到 UIMessageStream onFinish，并补齐 start/finish chunk
- Chat IPC 移除 `chat:sessions:syncMessages`，避免 Renderer 覆盖会话持久化
- 消息列表自动滚动回归经典 chat（Viewport Following）：发送一次 smooth 到底部；流式输出 instant 追随；上滑暂停
- PC 端图标回退到 Lucide，移除 Hugeicons 依赖并更新组件调用方式
- Providers 设置页补齐 Base URL 默认值与覆盖测试
- useWorkspaceFiles 增加请求过期保护并补充测试，避免工作区切换时展示错误文件
- PC Chat 输入框改为左右分区（Mode/Model/MCP + Attach/@/Primary），语音/发送合并并隐藏上下文进度
- @ 引用改为 MRU 3 个 + 全量搜索，引用/上传文件统一胶囊样式且 Full Access 切换无确认
- Agent Runtime 增加用户级 JSONC 配置、Agent Markdown 与 Hook；桌面端可按开关加载外部工具
- Chat 会话模式切换补齐审计与 mode 归一化，避免缺失字段导致异常
- Chat 全局权限模式切换：IPC/存储/渲染联动，全权限模式自动放行且保留审计
- Chat 会话压缩新增发送前预处理与 IPC 同步，避免 UI/历史错位
- Chat 工具审批链路贯通：IPC `chat:approve-tool` + 审批卡交互
- Agent 工具输出统一截断，聊天内支持打开完整输出文件
- 补齐 keytar 类型声明，修复 typecheck 缺失模块
- System Prompt 设置页：高级参数可选覆盖（默认使用模型默认值 + Use model default）
- Agent Runtime 切换为 `@openai/agents-core`，移除本地 Agents SDK 依赖
- 会员常量导出收敛，移除未使用的等级比较/优先级常量
- Auth：access/refresh token 统一使用 keytar 系统凭据存储（仅主进程）
- Auth：access token 持久化（Zustand + IPC），支持预刷新/Resume 校验与网络失败不清理
- 统一登录/注册为 email + OTP 验证流程，移除 pre-register
- 主窗口安全收敛：启用 sandbox + 外链 allowlist + 导航拦截
- Renderer 文案英文化与 Lucide 替换；补充 hooks 单测
- 补齐 Playwright E2E 基线与核心流程覆盖
- Vitest 单测对齐 React 19.2.3，并移除 i18n 依赖避免重复 React
- Playwright E2E 适配 ESM（使用 import.meta.url 获取路径）
- Playwright E2E 增加 userData/重置开关，保证首次启动场景可稳定复现（含默认 workspace 自动创建链路）
- preload 产物改为 CJS 输出，Playwright E2E 可正常挂载 desktopAPI
- Playwright E2E 增加失败诊断输出（stdout/stderr/页面 URL）并启用失败截图
- external-links 安全校验补齐路径边界与单测
- 站点发布模板新增 `lang`/`description` 占位符，构建链路默认 `en`

## 依赖关系

```
apps/moryflow/pc/
├── 依赖 → packages/api（API 客户端）
├── 依赖 → packages/agents-* + @openai/agents-core（Agent 框架）
├── 依赖 → packages/types（共享类型）
└── 功能文档 → docs/products/moryflow/features/cloud-sync/
```

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│                    Renderer Process                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Workspace  │  │  Components │  │    Hooks    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Preload Script                   │
└─────────────────────────┬───────────────────────────┘
                          │ IPC
┌─────────────────────────┴───────────────────────────┐
│                     Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    Chat     │  │    Vault    │  │  CloudSync  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │AgentRuntime │  │   Ollama    │                   │
│  └─────────────┘  └─────────────┘                   │
└─────────────────────────────────────────────────────┘
```
