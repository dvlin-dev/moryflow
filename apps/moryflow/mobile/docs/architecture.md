# 技术架构

> 本地 Agent + Vault 文件架构的详细设计

## 设计原则

1. **本地优先** — Agent 运行、文件存储、会话管理全部本地化
2. **与 PC 同构** — 复用 `@moryflow/agents-*` 共享包，保持 API 一致
3. **零历史负担** — 删除旧代码，按新架构重写
4. **简洁实用** — 聚焦核心功能，避免过度设计

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         UI 层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Chat UI    │  │  Vault UI    │  │  Settings    │       │
│  │  useChat()   │  │  FileList    │  │  模型配置     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
├─────────┼─────────────────┼─────────────────┼───────────────┤
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────┐       │
│  │      lib/agent-runtime/ + lib/chat/              │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │       │
│  │  │ runtime.ts  │  │ transport   │  │ adapter  │  │       │
│  │  └─────────────┘  └─────────────┘  └──────────┘  │       │
│  └──────────────────────────┬───────────────────────┘       │
├─────────────────────────────┼───────────────────────────────┤
│                             ▼                                │
│  ┌──────────────────────────────────────────────────┐       │
│  │           共享包 @moryflow/agents-*               │       │
│  │  agents-core │ agents-adapter │ agents-runtime   │       │
│  │  agents-tools │ agents-openai │ agents-model-registry │  │
│  └──────────────────────────┬───────────────────────┘       │
├─────────────────────────────┼───────────────────────────────┤
│                             ▼                                │
│  ┌──────────────────────────────────────────────────┐       │
│  │           平台适配层                              │       │
│  │  expo-file-system │ AsyncStorage │ SecureStore   │       │
│  │  expo-crypto │ react-native-get-random-values    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心模块

### Agent Runtime

位置：`lib/agent-runtime/`

| 文件                | 职责                                     |
| ------------------- | ---------------------------------------- |
| `runtime.ts`        | 初始化 Agent、创建工厂、运行对话         |
| `types.ts`          | 类型定义（RuntimeState、AgentSettings）  |
| `mobile-adapter.ts` | 平台能力适配器（文件系统、存储、加密等） |
| `session-store.ts`  | 会话持久化（AsyncStorage）               |
| `settings-store.ts` | 设置管理（API Key 用 SecureStore）       |

### Chat

位置：`lib/chat/`

| 文件           | 职责                       |
| -------------- | -------------------------- |
| `transport.ts` | Agent 事件流转换为 UI 消息 |

### Vault 服务

位置：`lib/vault/`

| 文件                 | 职责                                                |
| -------------------- | --------------------------------------------------- |
| `vault-service.ts`   | 文件 CRUD、树形结构读取                             |
| `use-vault.ts`       | React Hooks（useVault、useVaultTree、useVaultFile） |
| `recently-opened.ts` | 最近打开文件管理                                    |
| `types.ts`           | 类型定义（VaultTreeNode、VaultInfo）                |

### 编辑器

位置：`lib/editor/` + `components/editor/`

基于 WebView + TipTap 的富文本编辑器，支持：

- Markdown 编辑和预览
- 所见即所得模式
- 工具栏（格式化、插入图片等）
- 键盘适配

---

## 数据流

```
用户输入
    │
    ▼
┌─────────────────────────────────────┐
│  useChat Hook                        │
│  • 管理消息列表                       │
│  • 调用 Agent Runtime                │
│  • 流式更新 UI                        │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Agent Runtime                       │
│  • 创建 Agent 实例                   │
│  • 执行工具调用                       │
│  • 返回流式事件                       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  工具执行                            │
│  • 文件读写（Vault）                  │
│  • 搜索、grep 等                     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Vault 服务                          │
│  • expo-file-system 操作             │
│  • 变更通知                          │
└─────────────────────────────────────┘
```

---

## 与 PC 端的差异

| 能力             |    PC     |   Mobile   | 原因              |
| ---------------- | :-------: | :--------: | ----------------- |
| Agent + 工具调用 |    ✅     |     ✅     | 共享 agents-\* 包 |
| 本地文件操作     |    ✅     |     ✅     | expo-file-system  |
| Bash 工具        |    ✅     |     ❌     | 移动端无 shell    |
| Task 子代理      |    ✅     |     ❌     | 复杂度考虑        |
| MCP 扩展         |    ✅     |     ❌     | SDK 不支持 RN     |
| 模型来源         | 本地/云端 | 仅本地 Key | 简化实现          |

---

## 平台适配

### Polyfills

```typescript
// app/_layout.tsx
import '@/polyfills'; // structuredClone, TextEncoderStream, TextDecoderStream
import 'react-native-get-random-values'; // crypto.getRandomValues
```

### Metro 配置

```javascript
// metro.config.js
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'require', 'import'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main', 'module'];

// 自定义 resolveRequest 处理 _shims 子路径和 React 单例问题
```

### 条件导出

共享包使用 `package.json` 条件导出区分平台：

```json
{
  "exports": {
    ".": {
      "react-native": "./dist/index.react-native.js",
      "import": "./dist/index.mjs",
      "default": "./dist/index.js"
    }
  }
}
```

---

## 安全性

| 数据       | 存储方式            |
| ---------- | ------------------- |
| API Key    | SecureStore（加密） |
| 会话历史   | AsyncStorage        |
| 文件内容   | expo-file-system    |
| Vault 配置 | AsyncStorage        |
