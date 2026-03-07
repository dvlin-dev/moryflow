# i18n

> ⚠️ 本目录结构或导出入口变更时，必须同步更新本文件

## 定位

Anyhunt/Moryflow 共享多语言资源与 i18n 工具包。

## 职责

- 维护跨产品的翻译资源与类型定义
- 提供 i18n 初始化、hooks 与工具方法
- 统一语言枚举与日期/格式化逻辑

## 约束

- 默认使用 TypeScript + i18next
- 翻译资源与类型保持同层级结构
- 不保留空测试脚本；仅在存在实际测试时启用 test

## 近期变更

- cloud-sync 低打扰状态文案补齐（2026-03-08）：`settings` / `workspace` 命名空间新增 `cloudSyncRecoveryDescription/cloudSyncOfflineDescription/cloudSyncConflictCopyDescription/cloudSyncResumeRecovery/cloudSyncTryAgain/cloudSyncOpenConflictCopy` 以及 `syncRecoveryDescription/syncOfflineDescription/syncConflictCopyDescription/resumeRecovery/tryAgain/openConflictCopy/openFirstConflictCopy` 等键（EN/ZH-CN/JA/DE/AR 同步），支撑 PC/Mobile 的恢复与冲突提示收口。
- chat 命名空间新增 AI 轮次折叠摘要文案（2026-03-06）：补齐 `assistantRoundProcessed/assistantRoundProcessedWithDuration/assistantRoundExpand/assistantRoundCollapse`（EN/ZH-CN/JA/DE/AR 同步），用于“结束后折叠过程消息”的摘要触发器。
- settings 命名空间补齐运行时设置多语言（2026-03-05）：`de/ja/ar` 新增本地化翻译并替换英文占位（`closeBehavior*`、`launchAtLogin*`、`runtimeSettingsLoadFailed`），与 `en/zh-CN` 保持键级一致，避免非英文语言环境回落到英文文案。
- chat 命名空间思考触发文案收敛（2026-03-05）：`thinkingProcess` 从“思考过程/Thought process”统一改为“正在思考/Thinking”语义（EN/ZH-CN/JA/DE/AR 同步），用于 Reasoning Trigger 头部文案。
- chat 命名空间新增 Tool 外层摘要 fallback 模板（2026-03-05）：补齐 `toolSummaryRunning/toolSummarySuccess/toolSummaryError/toolSummarySkipped`（EN/ZH-CN/JA/DE/AR 同步），用于 Tool 无 `input.summary` 时的自然句式标题兜底。
- chat 命名空间全局模式提示落地（2026-03-05）：新增 `accessModeAppliesGlobal`（EN/ZH-CN/JA/DE/AR 同步），用于输入区明确“权限模式切换对所有对话生效”。
- chat 命名空间审批文案收口（2026-03-05）：新增 `denyOnce`、`approvalHowToApplyTitle`、`approvalAlwaysAllowHint`，并将审批按钮统一为 `Approve once / Always allow / Deny`（EN/ZH-CN/JA/DE/AR 同步）。
- settings 命名空间新增 Telegram 导航键（2026-03-03）：补齐 `telegram` / `telegramDescription`（EN/ZH-CN/JA/DE/AR），用于 PC Settings 新增 Telegram 分区导航与描述文案。
- workspace 命名空间新增顶栏账号入口文案键（2026-03-03）：补齐 `topbarAccountAction` 与 `topbarAccountSettingsLabel`，并同步 EN/ZH-CN/JA/DE/AR。
- chat 命名空间新增审批幂等结果态文案（2026-03-03）：新增 `approvalAlreadyHandled`（EN/ZH-CN/JA/DE/AR），用于“授权已被系统处理”结果态展示，避免并发场景误判为失败。
- chat 命名空间新增首次权限升级提示文案（2026-03-03）：补齐 `fullAccessUpgradePrompt*`（title/description/risk/enable/keepAsk）并同步 EN/ZH-CN/JA/DE/AR。
- settings 命名空间重构（2026-03-02）：删除 `systemPrompt*` 与模型参数覆盖文案，新增 `personalization` / `personalizationDescription` / `customInstructions*` 多语言键（EN/ZH-CN/JA/DE/AR）。
- settings 命名空间补齐 External Paths 校验文案（2026-03-02）：新增 `sandboxPathMustBeAbsolute` 并同步 EN/ZH-CN/JA/DE/AR，支持设置页前置绝对路径校验可见反馈。
- chat/settings 权限文案重构（2026-03-02）：`agent` 全量语义替换为 `ask`；Settings 新增 External Paths 管理文案（路径输入、添加、授权说明），并同步 EN/ZH-CN/JA/DE/AR。
- chat 命名空间新增并落地对话链路剩余键：`searchFilesPlaceholder/noMatchingFiles/noWorkspaceFiles/moreFilesHint/taskStatus*/commandLabel/cwdLabel/exitLabel/durationLabel/stdoutLabel/stderrLabel/selectedSkillUnavailable`，并统一修复多语言 `transcribing` 资源（EN/ZH-CN/JA/DE/AR）。
- chat 命名空间补齐对话链路文案键（Reasoning 标题、skills 面板、thinking selector、mobile tasks/model/session sheet、初始化占位与附件标签），并同步 EN/ZH-CN/JA/DE/AR 资源，确保 PC/Mobile `useTranslation('chat')` 类型键完整可用
- chat 命名空间完成访问权限入口语义键迁移：新增 `accessModeDefaultPermission` / `accessModeFullAccess`（EN/ZH-CN/JA/DE/AR 同步），并删除旧的 `agentModeMenu` / `agentModeFullAccess` 复用语义
- chat 命名空间更新输入框占位文案（包含 @ 引用提示）并新增 + 菜单相关文案
- chat 命名空间新增任务加载失败提示文案
- chat 命名空间新增任务悬浮面板 Idle/All completed/Show more/Show less 文案
- chat 命名空间新增 Recent/All files/Remove file 等输入框重构文案
- chat 命名空间新增会话模式切换与确认文案
- chat 命名空间新增工具审批卡相关文案
- chat 命名空间新增工具输出截断相关文案
- settings 文案更新 System Prompt 高级可选参数与默认覆盖提示
- 清理未使用常量（cookie/header/日期模板等）并统一 storage key 使用
- 补齐核心入口/Hook/Utils 的文件头注释
- 移除 `test` 脚本（无测试时不触发空运行）
- 移除未使用的 `react-native` 依赖与 peer 声明
- 增加 Cloud Sync「Needs attention」相关文案（workspace/settings 多语言）
