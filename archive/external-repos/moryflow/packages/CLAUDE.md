# Packages

> ⚠️ 本文件夹结构变更时，必须同步更新此文档

## 定位

Moryflow Monorepo 共享包，提供跨端复用的核心能力。

## 职责

- Agent 框架（多模型支持、工具调用、实时语音）
- 共享 API 客户端
- 国际化资源

## 约束

- 包之间通过 pnpm workspace 引用
- 公共类型定义放在 shared-api
- Agent 相关包遵循分层架构

## 成员清单

### Agent 框架

| 包名 | 说明 | 依赖关系 |
|------|------|----------|
| `agents/` | Agent 顶层封装，统一导出 | 依赖所有 agents-* |
| `agents-core/` | 核心抽象与基础设施 | 被其他 agents-* 依赖 |
| `agents-adapter/` | 模型适配器（统一不同模型接口） | 依赖 agents-core |
| `agents-model-registry/` | 模型注册中心 | 依赖 agents-core |
| `agents-openai/` | OpenAI 适配器 | 依赖 agents-adapter |
| `agents-runtime/` | Agent 运行时 | 依赖 agents-core |
| `agents-realtime/` | 实时语音 Agent | 依赖 agents-core, agents-openai |
| `agents-extensions/` | Agent 扩展（插件机制） | 依赖 agents-core |
| `agents-tools/` | Agent 工具集 | 依赖 agents-core |
| `agents-mcp/` | MCP 协议支持 | 依赖 agents-core |

### 共享包

| 包名 | 说明 | 使用方 |
|------|------|--------|
| `shared-api/` | 共享 API 客户端与类型定义 | pc, mobile, server |
| `shared-i18n/` | 国际化资源 | pc, mobile |

## Agent 架构

```
┌─────────────────────────────────────────────────────┐
│                     agents/                          │
│                  (顶层统一导出)                       │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│  agents-runtime  │  agents-realtime  │  agents-mcp  │
│    (运行时)      │    (实时语音)      │   (MCP)     │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│  agents-openai  │  agents-adapter  │  agents-tools  │
│  (OpenAI适配)   │   (模型适配器)    │   (工具集)    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│                   agents-core/                       │
│         (核心抽象：Agent、Tool、Message 等)          │
└─────────────────────────────────────────────────────┘
```

## 常见修改场景

| 场景 | 涉及文件 | 注意事项 |
|------|----------|----------|
| 新增模型支持 | `agents-adapter/`, `agents-model-registry/` | 实现统一接口 |
| 新增工具 | `agents-tools/` | 遵循 Tool 接口规范 |
| 修改 API 类型 | `shared-api/` | 同步更新 server 端 |
| 新增翻译 | `shared-i18n/` | 所有语言都要添加 |
| 修改 Agent 核心 | `agents-core/` | 影响所有 agents-* 包 |

## 依赖关系

```
packages/
├── agents-core（被所有 agents-* 依赖）
├── agents-adapter → agents-core
├── agents-openai → agents-adapter
├── agents-runtime → agents-core
├── agents-realtime → agents-core, agents-openai
├── agents-tools → agents-core
├── agents-mcp → agents-core
├── agents-extensions → agents-core
├── agents-model-registry → agents-core
├── agents → 导出所有 agents-*
├── shared-api（被 pc, mobile, server 使用）
└── shared-i18n（被 pc, mobile 使用）
```

## 构建顺序

由于包之间有依赖关系，构建顺序为：

1. `agents-core`
2. `agents-adapter`, `agents-tools`, `agents-extensions`
3. `agents-openai`, `agents-runtime`, `agents-mcp`, `agents-model-registry`
4. `agents-realtime`
5. `agents`
6. `shared-api`, `shared-i18n`
