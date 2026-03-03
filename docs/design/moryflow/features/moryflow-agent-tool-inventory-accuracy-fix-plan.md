---
title: Moryflow Agent Prompt 工具清单准确性修复方案
date: 2026-03-03
scope: docs/design/moryflow/features
status: completed
---

# Moryflow Agent Prompt 工具清单准确性修复方案

## 1. 问题定义

当前 `packages/agents-runtime/src/prompt.ts` 在 `Tool Strategy` 段落内写死了固定工具清单。该写法与实际运行时能力存在偏差：

1. 漏报：`generate_image`、`bash`（PC）、`skill`（PC）与动态注入工具（MCP/external）。
2. 跨端不一致：同一基线 prompt 被 Mobile 复用，但 Mobile 不支持 `subagent` 子代理。
3. 可维护性不足：工具能力由运行时装配，写死清单会持续漂移并制造误导。

## 2. 目标与非目标

### 2.1 目标

1. 将 Prompt 工具说明改为“运行时实际注入优先”的动态口径，去除固定承诺。
2. 保留常见工具类别，补齐可选工具形态说明（含跨端差异）。
3. 增加回归测试，防止未来再次回退到硬编码清单。

### 2.2 非目标

1. 不改动具体工具注入逻辑（PC/Mobile runtime 装配链路保持不变）。
2. 不引入新的工具协议字段或 IPC。

## 3. 事实依据

1. 旧清单定义：`packages/agents-runtime/src/prompt.ts`。
2. PC 基础工具装配：`packages/agents-tools/src/create-tools.ts`。
3. PC 运行时额外注入：`apps/moryflow/pc/src/main/agent-runtime/index.ts`（`skill` 与沙盒 `bash`，并支持 MCP/external）。
4. Mobile 装配：`apps/moryflow/mobile/lib/agent-runtime/runtime.ts` + `packages/agents-tools/src/create-tools-mobile.ts`（无 `subagent` 子代理）。

## 4. 修复规划

### 步骤 1：修正文案边界（Prompt 主干）

将 `Tool Strategy` 中“固定完整清单”替换为：

1. 工具清单以当前运行时实际注入为准；
2. 常见类别工具（文件/搜索/任务/网络）作为参考；
3. 可选工具（`subagent`、`generate_image`、`bash`、`skill`、MCP/external）明确为“按环境可能提供”。

### 步骤 2：补充回归测试

在 `packages/agents-runtime/src/__tests__` 新增 prompt 测试，校验：

1. Prompt 包含“运行时实际注入为准”语义；
2. Prompt 不再包含旧的固定工具句子。

### 步骤 3：文档同步

1. 更新 `docs/design/moryflow/features/index.md` 收录本方案；
2. 更新 `docs/index.md` 增加本次修复入口；
3. 更新相关 `CLAUDE.md` 记录变更事实。

## 5. 风险分级与验证

- 风险等级：L1（文案策略 + 单测，未改工具执行链路）。
- 验证命令：

```bash
pnpm --filter @moryflow/agents-runtime test:unit
```

## 6. 完成标准

1. Prompt 不再声称固定完整工具集合。
2. Prompt 对跨端与动态注入工具的描述准确且可维护。
3. 单测覆盖新策略并通过。
