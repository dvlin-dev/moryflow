# 本地模型支持设计方案

> 基于 2025 年 11 月现状，结合 Moryflow 现有架构的本地模型集成方案。

## 核心思路

**不另起炉灶，复用现有体系**：

- 把 Ollama 作为一个**预设服务商**融入现有 Provider 体系
- 使用 `openai-compatible` SDK 类型对接 Ollama 的 OpenAI 兼容 API
- 在设置页面扩展 Ollama 特有功能（模型搜索、下载、状态检测）

---

## 1. 技术背景

### 1.1 Ollama 简介

[Ollama](https://ollama.com) 是目前最流行的本地 LLM 运行工具（GitHub 157k+ stars），提供：

- **模型管理**：一键下载、运行各类开源模型（Llama、Qwen、DeepSeek、Gemma 等）
- **OpenAI 兼容 API**：`/v1/chat/completions`、`/v1/embeddings`
- **原生 API**：模型下载（`/api/pull`）、列表（`/api/tags`）、删除（`/api/delete`）

### 1.2 与现有架构的契合点

| Moryflow 现有能力                 | Ollama 对接方式                  |
| --------------------------------- | -------------------------------- |
| `openai-compatible` SDK 类型      | 连接 `http://localhost:11434/v1` |
| Provider 配置（baseUrl、enabled） | Ollama 地址配置                  |
| 设置页面模型列表                  | 动态获取本地已安装模型           |
| 模型能力标签                      | 从 Ollama 模型信息推断           |

---

## 2. 架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        设置页面 (渲染层)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────────────────────────────┐  │
│  │ 服务商列表     │  │ Ollama 详情面板                        │  │
│  │               │  │ ┌─────────────────────────────────┐   │  │
│  │ ● OpenAI      │  │ │ 连接状态: 🟢 已连接               │   │  │
│  │ ● Anthropic   │  │ │ 地址: http://localhost:11434    │   │  │
│  │ ● ...         │  │ └─────────────────────────────────┘   │  │
│  │ ──────────    │  │ ┌─────────────────────────────────┐   │  │
│  │ 🏠 Ollama ←   │  │ │ 本地模型                         │   │  │
│  │               │  │ │ ✓ qwen2.5:7b     [推理][工具]    │   │  │
│  │               │  │ │ ✓ llama3.2:3b    [工具]          │   │  │
│  │               │  │ │ ○ llava:13b      [多模态]        │   │  │
│  └───────────────┘  │ └─────────────────────────────────┘   │  │
│                      │ ┌─────────────────────────────────┐   │  │
│                      │ │ [🔍 搜索模型库] [+ 手动添加]     │   │  │
│                      │ └─────────────────────────────────┘   │  │
│                      └───────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ IPC
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         主进程                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐     │
│  │ Model Factory   │    │ Ollama Service (新增)            │     │
│  │                 │    │                                 │     │
│  │ SDK 类型路由:    │    │ • checkConnection()            │     │
│  │ openai-compatible│   │ • getLocalModels()             │     │
│  │     ↓           │    │ • pullModel(name, onProgress)  │     │
│  │ createOpenAICompatible│ • deleteModel(name)           │     │
│  │ (baseUrl=ollama)│    │                                 │     │
│  └─────────────────┘    └─────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ollama 服务 (用户本机)                        │
│                                                                 │
│   /v1/chat/completions  ← OpenAI 兼容 (推理)                    │
│   /v1/embeddings        ← OpenAI 兼容 (嵌入)                    │
│   /api/tags             ← 列出本地模型                          │
│   /api/pull             ← 下载模型 (流式进度)                    │
│   /api/delete           ← 删除模型                              │
│   /api/show             ← 模型详情                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

```
src/main/
├── ollama-service/           # 新增：Ollama 服务模块
│   ├── index.ts              # 入口，暴露 IPC handlers
│   ├── client.ts             # Ollama API 客户端
│   ├── types.ts              # 类型定义
│   └── model-capabilities.ts # 模型能力推断逻辑

src/shared/model-registry/
├── providers.ts              # 修改：添加 ollama 预设服务商
└── types.ts                  # 修改：添加 localBackend 字段

src/renderer/components/settings-dialog/
└── components/providers/
    ├── provider-details.tsx  # 修改：Ollama 特殊处理
    ├── ollama-panel.tsx      # 新增：Ollama 专属面板
    └── model-library-dialog.tsx # 新增：模型库搜索对话框
```

---

## 3. 数据结构

### 3.1 Provider 配置扩展

在 `PresetProvider` 中新增字段：

```typescript
interface PresetProvider {
  // ... 现有字段

  /** 本地后端类型（仅本地服务商） */
  localBackend?: 'ollama' | 'llama.cpp'

  /** 原生 API 地址（用于模型管理等非推理功能） */
  nativeApiBaseUrl?: string
}
```

Ollama 预设配置：

```typescript
{
  id: 'ollama',
  name: 'Ollama',
  icon: 'ollama',
  docUrl: 'https://ollama.com/docs',
  defaultBaseUrl: 'http://localhost:11434/v1',  // OpenAI 兼容端点
  authType: 'none',
  sdkType: 'openai-compatible',
  modelIds: [],  // 动态获取，不预设
  allowCustomModels: true,
  sortOrder: 78,
  localBackend: 'ollama',
  nativeApiBaseUrl: 'http://localhost:11434',
}
```

### 3.2 Ollama API 数据结构

**本地模型信息**（来自 `/api/tags`）：

```typescript
interface OllamaModel {
  name: string // "qwen2.5:7b"
  model: string // 完整模型标识
  modified_at: string // ISO 时间
  size: number // 字节数
  digest: string // SHA256
  details: {
    parent_model?: string
    format: string
    family: string // "qwen2.5"
    families?: string[]
    parameter_size: string // "7B"
    quantization_level: string // "Q4_K_M"
  }
}
```

**下载进度**（来自 `/api/pull` 流式响应）：

```typescript
interface OllamaPullProgress {
  status: string // "pulling manifest" | "downloading" | "verifying" | "success"
  digest?: string
  total?: number // 总字节数
  completed?: number // 已完成字节数
}
```

### 3.3 转换后的模型信息

Ollama 模型转换为 Moryflow 内部格式：

```typescript
interface OllamaLocalModel {
  id: string // "qwen2.5:7b"
  name: string // "Qwen 2.5 7B"（格式化显示名）
  size: number
  modifiedAt: string
  capabilities: ModelCapabilities // 推断的能力
  modalities: ModelModalities // 推断的模态
  limits: ModelLimits // 推断的限制
  details: OllamaModel['details']
}
```

---

## 4. 核心逻辑

### 4.1 Ollama Service 职责

| 方法                          | 功能                 | 对应 Ollama API      |
| ----------------------------- | -------------------- | -------------------- |
| `checkConnection()`           | 检测 Ollama 是否运行 | `GET /api/version`   |
| `getLocalModels()`            | 获取本地已安装模型   | `GET /api/tags`      |
| `pullModel(name, onProgress)` | 下载模型（流式进度） | `POST /api/pull`     |
| `deleteModel(name)`           | 删除本地模型         | `DELETE /api/delete` |
| `showModel(name)`             | 获取模型详情         | `POST /api/show`     |

> 📖 API 详情参考：[Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)

### 4.2 模型能力推断

根据 Ollama 返回的 `family` 和 `families` 字段推断模型能力：

| 能力         | 推断规则                                                        |
| ------------ | --------------------------------------------------------------- |
| **多模态**   | family 包含 `llava`、`bakllava`、`llama3.2-vision`、`minicpm-v` |
| **推理模式** | name 包含 `deepseek-r1`、`qwq`、`marco-o1`                      |
| **工具调用** | family 以 `llama3`、`qwen2`、`mistral`、`command-r` 开头        |
| **温度调节** | 所有模型都支持                                                  |
| **开源权重** | 所有 Ollama 模型都是开源的                                      |

**上下文窗口推断**（基于已知模型）：

| 模型家族            | 上下文窗口 |
| ------------------- | ---------- |
| qwen2.5 / qwen2     | 128K       |
| llama3.2 / llama3.1 | 128K       |
| llama3              | 8K         |
| mistral             | 32K        |
| gemma2              | 8K         |
| phi3                | 128K       |
| deepseek-r1         | 64K        |
| 其他                | 4K（默认） |

### 4.3 IPC 通信

**主进程注册的 handlers**：

```typescript
ipcMain.handle('ollama:check-connection', async (_, baseUrl?) => {...})
ipcMain.handle('ollama:get-local-models', async (_, baseUrl?) => {...})
ipcMain.handle('ollama:pull-model', async (event, name, baseUrl?) => {...})
ipcMain.handle('ollama:delete-model', async (_, name, baseUrl?) => {...})
ipcMain.handle('ollama:show-model', async (_, name, baseUrl?) => {...})
```

**下载进度事件**（主进程 → 渲染层）：

```typescript
webContents.send('ollama:pull-progress', { name, progress: OllamaPullProgress })
```

### 4.4 Model Factory 集成

Ollama 模型走现有 `openai-compatible` 路径，无需修改核心逻辑：

```
用户选择模型 "ollama/qwen2.5:7b"
    ↓
Model Factory 识别 providerId = "ollama"
    ↓
获取 sdkType = "openai-compatible"
    ↓
createOpenAICompatible({ baseURL: "http://localhost:11434/v1" })
    ↓
.chat("qwen2.5:7b")
```

---

## 5. 设置页面 UI 设计

### 5.1 Ollama 面板布局

```
┌─────────────────────────────────────────────────────────────┐
│ Ollama 服务                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 已连接  http://localhost:11434        [刷新]         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 服务地址                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ http://localhost:11434                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 留空使用默认地址                                             │
│                                                             │
│ 本地模型                    [🔍 搜索模型库] [刷新]           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ qwen2.5:7b        [推理][工具]    4.4GB  Q4_K_M    [○]  │ │
│ │ llama3.2:3b       [工具]          2.0GB  Q4_0     [●]  │ │
│ │ llava:13b         [多模态]        8.0GB  Q4_K_M   [○]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 模型库搜索对话框

```
┌─────────────────────────────────────────────────────────────┐
│ 模型库                                                  [×] │
├─────────────────────────────────────────────────────────────┤
│ 🔍 搜索模型...                                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ qwen2.5                                                 │ │
│ │ 通义千问 2.5，支持工具调用                                │ │
│ │ [0.5b] [1.5b] [3b] [7b↓] [14b] [32b] [72b]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ deepseek-r1                                             │ │
│ │ DeepSeek 推理模型                                        │ │
│ │ [1.5b] [7b] [8b] [14b] [32b] [70b]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│ 或手动输入：[________________] [下载]                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 交互流程

1. **打开设置** → 选择 Ollama 服务商
2. **检测连接** → 自动检测 Ollama 是否运行，显示状态
3. **查看本地模型** → 从 `/api/tags` 获取，显示能力标签
4. **搜索模型库** → 显示热门模型列表，点击 tag 触发下载
5. **下载模型** → 调用 `/api/pull`，实时显示进度
6. **启用/禁用模型** → 更新用户配置，控制是否在模型选择器中显示

---

## 6. 实施计划

### Phase 1：基础集成

- [ ] 添加 `ollama` 预设服务商到 `providers.ts`
- [ ] 实现 `ollama-service` 模块
- [ ] 注册 IPC handlers
- [ ] 扩展 `desktopAPI` 类型定义

### Phase 2：设置页面 UI

- [ ] 实现 Ollama 专属面板组件
- [ ] 实现本地模型列表组件
- [ ] 实现模型库搜索对话框
- [ ] 处理下载进度显示

### Phase 3：优化与测试

- [ ] 完善模型能力推断逻辑
- [ ] 优化错误处理和用户提示
- [ ] 端到端测试

---

## 7. 后续扩展

### 7.1 Embedding 支持

- 在模型能力中添加 `embedding` 类型检测
- 用于 Vault 语义搜索（RAG）

### 7.2 本地语音转文字

- 独立设计 Whisper 集成方案（`whisper.cpp` 或 `WhisperLiveKit`）
- 作为独立的本地服务配置，不与 LLM Provider 混合

### 7.3 其他本地后端

如需支持 `llama.cpp server`、`vLLM` 等：

- 添加新的 `localBackend` 类型
- 实现对应的 service 模块
- 复用 `openai-compatible` SDK 类型

---

## 8. 参考资料

| 资料                            | 链接                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| Ollama 官方文档                 | https://ollama.com/docs                                               |
| Ollama API 参考                 | https://github.com/ollama/ollama/blob/main/docs/api.md                |
| Ollama 模型库                   | https://ollama.com/library                                            |
| Vercel AI SDK OpenAI Compatible | https://sdk.vercel.ai/providers/community-providers/openai-compatible |
| 现有 Provider 实现              | `src/shared/model-registry/providers.ts`                              |
| 现有设置页面实现                | `src/renderer/components/settings-dialog/`                            |

TODO:

1. 实时语音转文字，gpt 里面有技术方案
2. qwen3-embedding
