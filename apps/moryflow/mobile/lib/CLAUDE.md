# Lib

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Mobile 端业务逻辑层，提供状态管理、数据处理、API 调用等核心能力。

## 职责

- 状态管理（Zustand stores）
- 业务逻辑处理
- Agent 运行时
- 自定义 Hooks
- 工具函数

## 约束

- 状态管理使用 Zustand
- 保持与 UI 层（components/）的分离
- 复杂逻辑优先实现为纯函数

## 成员清单

| 文件/目录        | 类型 | 说明               |
| ---------------- | ---- | ------------------ |
| `stores/`        | 目录 | Zustand 状态管理   |
| `hooks/`         | 目录 | 自定义 React Hooks |
| `chat/`          | 目录 | 聊天业务逻辑       |
| `vault/`         | 目录 | 知识库业务逻辑     |
| `editor/`        | 目录 | 编辑器业务逻辑     |
| `agent-runtime/` | 目录 | Agent 运行时       |
| `membership/`    | 目录 | 会员与订阅逻辑     |
| `models/`        | 目录 | 数据模型           |
| `contexts/`      | 目录 | React Context      |
| `constants/`     | 目录 | 常量定义           |
| `tokens/`        | 目录 | Token 管理         |
| `i18n/`          | 目录 | 国际化配置         |
| `utils/`         | 目录 | 工具函数集         |
| `utils.ts`       | 文件 | 通用工具函数       |
| `theme.ts`       | 文件 | 主题配置           |

## 常见修改场景

| 场景           | 涉及文件      | 注意事项                                             |
| -------------- | ------------- | ---------------------------------------------------- |
| 新增状态       | `stores/`     | 遵循 Zustand 模式                                    |
| 新增 Hook      | `hooks/`      | use-xxx 命名规范                                     |
| 修改聊天逻辑   | `chat/`       | 注意与 Agent 运行时的交互                            |
| 修改知识库逻辑 | `vault/`      | 注意文件系统权限                                     |
| 修改会员逻辑   | `membership/` | 参考 docs/products/moryflow/features/credits-system/ |

## 近期变更

- Cloud Sync 与 Vault 日志统一通过 `createLogger()` 输出
- i18n Provider 的初始化依赖以实例为准，避免遗漏依赖
- 拆分并收敛全局 UI 状态：新增 `ChatSheetProvider`，移除无用的 TabBar 显隐 Context/Hook

## 依赖关系

```
lib/
├── 依赖 → packages/shared-api（API 客户端）
├── 依赖 → packages/agents-*（Agent 框架）
├── 依赖 → packages/shared-i18n（国际化）
└── 被依赖 ← components/（UI 组件）
└── 被依赖 ← app/（页面组件）
```

## Stores 结构

```
stores/
├── auth-store.ts      # 认证状态
├── chat-store.ts      # 聊天状态
├── vault-store.ts     # 知识库状态
├── settings-store.ts  # 设置状态
└── ...
```
