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
- ask 模式的外部路径授权仅支持 `deny | allow_always`（不再支持一次性授权）；full_access 不走外部路径授权
- macOS 沙盒仅在 `darwin` 生效，其他平台使用软隔离降级

## 测试

- `pnpm --filter @moryflow/agents-sandbox test:unit`

## 变更同步

- 仅在安全边界、入口结构或关键协议失真时更新本文件
- 如影响跨包依赖，更新根 `CLAUDE.md`
