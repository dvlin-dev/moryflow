# 桌面端启动与首屏性能优化方案（建议稿）

> 目标：减少“重新打开应用白屏 + 卡顿 3~5 秒”，让首屏尽快可交互，同时保持 Vault/聊天能力完整与一致性。

## 现状与瓶颈

- 启动即全量递归 `readTree`，并立刻 `chokidar.watch` 整个 Vault，导致两次磁盘遍历。
- 树节点默认全部展开且无虚拟滚动，DOM 体量大。
- 渲染入口打包了 NotionEditor 全套扩展 + ChatPane（含 shiki/MCP），单个入口包 >6 MB，`loadFile` 后白屏时间长。
- Watcher 在启动期占用 I/O，且无差异缓存，重启命中率低。

## 优化目标

1. 冷启动 ≤1 s 出现可交互骨架 UI，避免纯白。
2. 首屏 DOM 节点量 < 1k，React 首次渲染轻量。
3. 启动期磁盘遍历次数 ≤1 次，避免重复扫描。
4. 关键链路可量化：首屏可见时间、编辑器可用、聊天可用、Watcher 就绪。

## 方案概述

### 1) Vault 树懒加载 + 虚拟滚动

- API 拆分：`readTreeRoot`（仅 1 级） + `readTreeChildren(path)`（按需）。
- UI 默认折叠，记忆上次展开状态（`electron-store`/`localStorage`），展开才拉子节点。
- 渲染时先把「可见展开节点」扁平化，交给虚拟列表（`@tanstack/react-virtual` 或轻量实现），保证 DOM 只保留可视范围。

### 2) Watcher 延迟 + 范围控制

- 启动时只对 Vault 根做浅层 watcher 或快速校验，用于捕获未展开路径的外部改动；展开的路径再递归追加 watcher。
- 延后启动 chokidar（如首个文件打开后或 `requestIdleCallback`），既减压 I/O，又不丢外部变更。
- 失活/关闭时清理 watcher，防止残留。

### 3) Editor/Chat 后台预加载与拆包

- 首屏先渲染轻量占位；在 `requestIdleCallback` 或 `postMessage` 中 `import()` Editor/Chat chunk 并缓存模块引用（渲染进程单例）。
- NotionEditor 拆分为「核心 + 扩展懒加载」（图片/表格/数学/AI 工具条按首次使用再拉取）。
- Chat 同理：基础会话 UI 预取，shiki 语言包、MCP 设置等按需加载。
- 依赖 Electron 自带缓存或 IndexedDB 记录预热结果，重启命中，避免重复下载。

### 4) 首屏 Skeleton 与渐进填充

- 左/中/右三栏骨架：Vault 树「加载中/切换 Vault」按钮、编辑区灰块 + 保存状态占位、Chat「正在预热助手」提示。
- `readTree` 未返回前也渲染 Skeleton；数据到达后逐步替换。
- 全链路埋点：窗口创建 → Skeleton 渲染 → 首个交互可用 → Editor 渲染完成 → Chat 渲染完成 → Watcher 就绪。

### 5) 遍历减半与缓存

- 启动优先尝试「缓存树 + mtime」渲染骨架；后台校验差异再修正 UI，避免双重扫描。
- chokidar `ready` 事件后与缓存树对比，必要时增量刷新。

## 风险与对策

- Watcher 范围收缩可能漏外部改动：通过根浅层 watcher 或周期性差异校验兜底。
- 动态导入 hash 变化导致缓存失效：缓存 key 包含 chunk 路径 + mtime，失配时回退在线加载。
- 虚拟滚动与键盘导航/选中状态兼容性：采用「扁平化后虚拟化」策略，选中状态在扁平列表层维护。

## 第 3 周拆包与预取设计（部分落地）

- **拆包**：DesktopWorkspace 中 Editor/Chat 已改为 `React.lazy` + `Suspense`，重组件不在入口直接 import；后续可继续拆 Editor 扩展/Chat 重块（shiki/设置）。
- **预取**：Skeleton 渲染后 idle 阶段触发 `Promise.all([import(EditorChunk), import(ChatChunk)])` 预热，结果写入渲染进程 `preloadRegistry`，元数据落盘（electron-store，key+loadedAt+hash+appVersion），TTL 判定跳过重复预热；hash 变更或 appVersion 变更则强制重预热。完成时打点 `editor:chunk-loaded`、`chat:chunk-loaded`（start/end mark + measure）；shiki、Editor 扩展块、AI 工具栏、设置弹窗均纳入预取并缓存 hash。
- **渲染切换**：Editor/Chat 区域用 `Suspense` 包裹，fallback 复用 Skeleton；预取后首次挂载不再阻塞。
- **待补充**：缓存元数据（chunk 路径 + mtime）写入 IndexedDB/electron-store，跨重启命中预热；进一步拆 Editor 扩展与 Chat 重依赖。

## 推进顺序（按周可执行计划）

1. 第 1 周：实现 `readTreeRoot/Children`、默认折叠 + 展开记忆、骨架 UI，上线埋点（首屏可见、首次交互）。
2. 第 2 周：接入虚拟滚动（扁平化 → 虚拟列表），延后启动 chokidar，并加根浅层 watcher 兜底。
3. 第 3 周：Editor/Chat 动态拆包 + idle 预取，模块缓存单例；验证首次使用不卡顿。
4. 第 4 周：缓存树 + mtime 启动渲染、chokidar ready 增量校验；完善 shiki/Tiptap 重依赖懒加载。
5. 持续：监控埋点数据（首屏可见/可用、Watcher 就绪），根据回归数据迭代参数（延时、预取策略、缓存淘汰）。

## 第 1 周设计要点（供落地）

- **IPC/类型**：在 `DesktopApi` 增加 `readTreeRoot(vaultPath)` 与 `readTreeChildren(folderPath)`；`VaultTreeNode` 增加 `hasChildren?: boolean`（仅文件夹返回），`children` 在懒加载模式下可为空。保持原 `readTree` 兼容期内可指向 `readTreeRoot`。
- **主进程**：`readTreeRoot` 只返回 depth=1 列表；`readTreeChildren` 校验相对 Vault 的目录路径再递归获取；`startVaultWatcher` 默认浅层 watch Vault 根（捕获未展开目录的改动），展开节点时按需追加深度 watcher，关闭/折叠时卸载。
- **预加载/状态**：展开记忆存 `electron-store`（键如 `workspace.expandedNodes`，按 Vault 路径分桶）；渲染初始化时读取记忆决定哪些节点自动展开并触发 children 请求。
- **渲染层树数据流**：首次加载调用 `readTreeRoot` → 扁平化可见节点 → 虚拟列表渲染；展开节点时调用 `readTreeChildren` 并合并到树状态；`VaultTreeNode` 中无 children 的文件夹视作未加载。
- **骨架与埋点**：DesktopWorkspace 加入 Skeleton；在窗口创建后、Skeleton 渲染、首个交互可用、Editor render ready、Chat render ready、Watcher ready 处做 `performance.mark/measure`，埋点名建议 `startup:skeleton-visible`、`startup:first-interaction`、`editor:ready`、`chat:ready`、`watcher:ready`，并上报。

## 执行进度与下一步

- [完成] 第 1 周：`readTreeRoot/Children` 拆分、默认折叠与展开记忆、骨架 UI。渲染层默认折叠 + 懒加载（受控展开、按需 `readTreeChildren`、展开路径存 electron-store），首屏 Skeleton 已接入。
- [完成] 第 2 周：树扁平化 + 虚拟滚动；Watcher 深度 2、延迟 800ms 启动，展开目录白名单监听，兜底定时提醒已移除。
- [完成] 第 3 周：Editor/Chat/shiki/编辑器扩展/AI 工具栏/设置弹窗全部 lazy + idle 预取，预取元数据（key+hash+appVersion+时间）落盘；hash 或 app 版本变更强制重预热；支持 `localStorage` 开关 `preload:disable` 跳过预取。
- [进行中/收尾] 第 4 周：缓存树 + mtime 启动渲染已接入（缓存渲染 → 后台刷新 → 写回缓存）；Watcher ready 时对比缓存快照发现差异则触发刷新并更新缓存。后续可补：缓存树 mtime 细粒度增量、重依赖懒加载补完（如特定语言包/Math 渲染器）。
- [待滚动推进] 持续调优 watcher 与预取参数（延时、TTL、白名单），按需扩展预取表。

## 第 4 周方案（分三个阶段）

1) 缓存树 + mtime 启动渲染  
   - 缓存结构：{ nodes: VaultTreeNode[], capturedAt, mtimeSnapshot: Record<path, mtime> }，按 Vault 路径分桶存 electron-store。  
   - 启动：若有缓存，先用缓存树 + 展开状态渲染；后台并行 readTreeRoot/Children 拉最新，比对 mtimeSnapshot 有差异才局部 refresh；无缓存则正常全量。  
   - 更新：拉新成功后重写缓存（nodes + mtimeSnapshot）；失败回退缓存并提示刷新。

2) chokidar ready 增量校验  
   - watcher ready 后做一次增量对比（利用 chokidar 收集路径或自维护根快照 vs 缓存 mtimeSnapshot），差异路径触发小范围 readTreeChildren 更新。  
   - 文件 CRUD 成功后同步更新快照；增量失败则回退一次性 readTreeRoot/Children 全量更新并重建快照。

3) 重依赖懒加载/延迟加载补全  
   - 列出剩余重块（如 shiki 语言包子集、Math 渲染器、AI 提示重模块等），导出 hash 并注册到 preloadChunks 或保留按需 lazy。  
   - 预取元数据继续落盘（key+hash+appVersion+时间），hash/app 变更强制预热；遵循 `preload:disable` 开关。  
   - 验证：首次使用相关功能无明显卡顿，预取/懒加载行为一致。
