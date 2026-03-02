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
- 外部路径授权仅支持 `deny | allow_always`（不再支持一次性授权）
- macOS 沙盒仅在 `darwin` 生效，其他平台使用软隔离降级

## 测试

- `pnpm --filter @moryflow/agents-sandbox test:unit`

## 变更同步

- 修改安全规则或路径检测后，更新本文件的“近期变更”
- 如影响跨包依赖，更新根 `CLAUDE.md`

## 近期变更

- 授权路径单一事实源重构（2026-03-02）：新增 `src/path-utils.ts` 统一路径标准化与父子路径判定；`PathAuthorization` 改为复用该模块并增加未知授权选项 fail-safe 拒绝；测试同步删除 `allow_once/clearTemp` 旧语义。
- 临时授权语义清理（2026-03-02）：`PathAuthorization` 与 `SandboxManager` 删除 `tempPaths/clearTemp` 分支，授权模型彻底收敛为仅持久授权（`deny | allow_always`）。
- 沙盒模式语义移除（2026-03-02）：删除 `normal/unrestricted` 类型与分支；沙盒仅保留“危险命令硬拦截 + 外部路径授权”模型，不再存在第二套模式开关。
- 外部路径授权模型收敛（2026-03-02）：移除 `allow_once`，仅保留持久授权；新增 `addPersistent`/`addAuthorizedPath` 入口，支持设置页手动添加授权目录。
- 沙盒 bash 工具移除本地输出截断，统一交由 runtime 后处理
- 路径检测与授权统一做跨平台归一化

---

_版本: 1.0 | 更新日期: 2026-03-02_
