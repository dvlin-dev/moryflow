# /agents-sandbox

> 桌面端命令沙盒：命令过滤、外部路径授权与平台适配（macOS 沙盒 / 软隔离）

## 职责范围

- 命令执行统一入口：`SandboxManager`
- 命令过滤：危险命令拦截 + 白名单确认
- 路径检测：识别命令中的外部路径并请求授权
- 平台适配：macOS 沙盒与 Linux/Windows 软隔离

## 入口与关键文件

- `src/sandbox-manager.ts`：统一入口
- `src/command/command-filter.ts`：命令拦截规则
- `src/command/path-detector.ts`：命令路径解析
- `src/authorization/path-authorization.ts`：授权管理
- `src/platform/`：平台差异实现

## 约束与约定

- 路径判断必须基于 `path.relative`，避免前缀穿越
- 授权路径需标准化存储（跨平台一致）
- 非白名单命令必须经用户确认
- macOS 沙盒仅在 `darwin` 生效，其他平台使用软隔离降级

## 测试

- `pnpm --filter @anyhunt/agents-sandbox test:unit`

## 变更同步

- 修改安全规则或路径检测后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- 路径检测与授权统一做跨平台归一化

---

_版本: 1.0 | 更新日期: 2026-01-24_
