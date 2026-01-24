# /agents-adapter

> 平台能力适配层：统一 PC/Mobile 的文件系统、存储、认证与加密接口

## 职责范围

- 定义平台能力接口（FileSystem/PathUtils/Storage/Auth/Crypto）
- 约束上层 runtime/tools 的平台差异依赖

## 入口与关键文件

- `src/index.ts`：对外导出
- `src/types.ts`：平台能力接口定义

## 约束与约定

- 不引入具体平台实现（仅接口）
- 不包含业务逻辑，保持纯类型与协议定义

## 变更同步

- 修改接口定义后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- 建立平台能力接口基线

---

_版本: 1.0 | 更新日期: 2026-01-24_
