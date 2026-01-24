---
title: packages/agents* Code Review
date: 2026-01-24
scope: packages/agents*
status: done
---

## 范围确认

- 仅 review 迁移后仍保留的 Agent 平台能力包：
  - `packages/agents-adapter/`
  - `packages/agents-runtime/`
  - `packages/agents-tools/`
  - `packages/agents-mcp/`
  - `packages/agents-sandbox/`
  - `packages/agents-model-registry/`
  - `packages/model-registry-data/`
- 已迁移到 `@openai/agents-core` 的旧 packages 不再 review

## 优先级

- P3（平台基建与复用质量）
- 重点：路径安全、跨平台一致性、工具/沙盒边界

## 入口与关键文件

- Runtime：`packages/agents-runtime/src/*`
- Tools：`packages/agents-tools/src/*`
- MCP：`packages/agents-mcp/src/*`
- Sandbox：`packages/agents-sandbox/src/*`
- Model Registry：`packages/agents-model-registry/src/*`

## 问题与修复

### 1) Vault 路径边界校验使用 startsWith，存在前缀穿越风险

- 影响：`/vault` 与 `/vault2` 会被误判为 Vault 内，可能导致越权读取
- 解决方案：改为 `path.relative` 判断是否在根目录内，并规范 `.` 作为根目录相对路径
- 修复文件：`packages/agents-runtime/src/vault-utils.ts`
- 回归测试：`packages/agents-runtime/test/vault-utils.spec.ts`

### 2) normalizeRelativePath 仅做前缀截断，跨平台与前缀穿越不安全

- 影响：`/vault2` 可能被错误归一为 Vault 内相对路径
- 解决方案：统一使用 `path.relative` 与 `isAbsolute` 判断内外路径
- 修复文件：`packages/agents-tools/src/shared.ts`
- 关联修改：`packages/agents-tools/src/file/ls-tool.ts`、`packages/agents-tools/src/file/move-tool.ts`
- 回归测试：`packages/agents-tools/test/normalize-relative-path.spec.ts`

### 3) bash 工具工作目录校验使用 startsWith，存在前缀绕过

- 影响：`/vault2` 可绕过工作目录限制
- 解决方案：使用 `path.relative` 进行边界判断
- 修复文件：`packages/agents-tools/src/platform/bash-tool.ts`

### 4) PathDetector 与 PathAuthorization 仅处理类 Unix 路径，Windows/跨平台不一致

- 影响：Windows 路径未被识别，外部路径授权判断不稳定
- 解决方案：
  - PathDetector 支持 Windows 盘符/UNC 路径解析
  - PathAuthorization 统一做路径规范化与大小写处理
  - 路径边界判断统一用 `path.relative`
- 修复文件：
  - `packages/agents-sandbox/src/command/path-detector.ts`
  - `packages/agents-sandbox/src/authorization/path-authorization.ts`
- 回归测试：`packages/agents-sandbox/test/path-detector.test.ts`

### 5) web_fetch 未做 SSRF 基线校验

- 影响：可访问 localhost/内网/元数据地址
- 解决方案：加入协议与 host 黑名单校验（http/https + 私网 IP）
- 修复文件：`packages/agents-tools/src/web/web-fetch-tool.ts`

### 6) packages/agents\* 缺少 CLAUDE/AGENTS 协议文档

- 影响：变更同步缺失，难以形成模块边界与协作规范
- 解决方案：补齐 `CLAUDE.md` 与 `AGENTS.md` 软链接
- 修复文件：
  - `packages/agents-adapter/CLAUDE.md`
  - `packages/agents-runtime/CLAUDE.md`
  - `packages/agents-tools/CLAUDE.md`
  - `packages/agents-mcp/CLAUDE.md`
  - `packages/agents-sandbox/CLAUDE.md`
  - `packages/agents-model-registry/CLAUDE.md`

## 当前结论

- 核心问题已修复并补齐回归测试
- 验证通过：`pnpm lint` / `pnpm typecheck` / `pnpm test:unit`
