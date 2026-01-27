# /agents-model-registry

> 预设服务商与模型注册表（跨端共享）

## 职责范围

- 维护服务商清单与模型列表
- 统一模型 ID 规范化与 API 映射
- 为 runtime/model-factory 提供预设配置

## 入口与关键文件

- `src/index.ts`：对外导出
- `src/providers.ts`：服务商注册表
- `src/models.ts`：模型注册表

## 约束与约定

- 仅做静态数据与映射逻辑，不引入运行时依赖
- 模型列表变更需同步更新 `packages/model-registry-data`

## 变更同步

- 修改模型/服务商清单后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- 补齐 Anthropic/Google/xAI 默认 Base URL
- 模型/服务商注册表基线整理

---

_版本: 1.0 | 更新日期: 2026-01-24_
