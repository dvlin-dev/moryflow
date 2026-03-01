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

- chat 命名空间更新 PC 访问模式入口文案：`agentModeMenu` 改为 Default Permission/默认权限，`agentModeFullAccess` 改为 Full Access/完全访问
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
