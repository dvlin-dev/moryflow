# PC 零 Keychain 存储改造实施计划

**目标**

移除桌面端全部 Keychain-backed 存储路径，统一改为本地 `electron-store` 持久化，从根上消除 macOS Keychain 弹窗。

**实现原则**

- 保持 Telegram、membership、agent-runtime 现有边界
- 尽量复用现有接口，避免大面积调用方改动
- 不做旧数据迁移，不兼容旧 Keychain 路径
- 先锁测试契约，再做实现，再做构建验证

### 任务 1：锁定“无 Keychain”契约

**涉及文件**

- `apps/moryflow/pc/src/main/app/release-build-contract.test.ts`
- `apps/moryflow/pc/src/main/channels/telegram/secret-store.test.ts`
- `apps/moryflow/pc/src/main/membership-token-store.test.ts`
- `apps/moryflow/pc/src/main/agent-runtime/desktop-adapter.test.ts`

**执行点**

- 增加 `@moryflow/pc` 不再依赖 `keytar` 的契约断言
- 增加 Telegram 本地持久化 round-trip 测试
- 增加 membership token 本地持久化 round-trip 测试
- 增加 agent runtime secure storage 本地持久化 round-trip 测试
- 增加“模块重载后仍可读回”的重启级 smoke

### 任务 2：替换 Telegram secret store

**涉及文件**

- `apps/moryflow/pc/src/main/channels/telegram/secret-store.ts`
- `apps/moryflow/pc/src/main/channels/telegram/secret-store.test.ts`

**执行点**

- 删除 `keytar` 动态加载和读写 helper
- 使用独立 `electron-store` 文件持久化：
  - `botToken`
  - `webhookSecret`
  - `proxyUrl`
- 保持现有导出 API 不变

### 任务 3：替换 membership token store

**涉及文件**

- `apps/moryflow/pc/src/main/membership-token-store.ts`
- `apps/moryflow/pc/src/main/membership-token-store.test.ts`

**执行点**

- 删除 `keytar` 路径
- 使用独立 `electron-store` 文件持久化：
  - `refreshToken`
  - `accessToken`
  - `accessTokenExpiresAt`
- 保持 IPC 和 renderer auth flow 调用接口不变

### 任务 4：替换 agent runtime secure storage

**涉及文件**

- `apps/moryflow/pc/src/main/agent-runtime/desktop-adapter.ts`
- `apps/moryflow/pc/src/main/agent-runtime/desktop-adapter.test.ts`

**执行点**

- 删除 `safeStorage` 依赖与加解密逻辑
- 保留 `SecureStorage` 接口
- 改为普通本地字符串存储

### 任务 5：收口依赖与文档

**涉及文件**

- `apps/moryflow/pc/package.json`
- `pnpm-lock.yaml`
- `apps/moryflow/pc/src/main/CLAUDE.md`
- `apps/moryflow/pc/src/shared/ipc/desktop-api.ts`
- 相关 design/reference/plans 文档

**执行点**

- 删除 `dependencies.keytar`
- 删除 `electron-rebuild` 对 `keytar` 的 rebuild
- 修正文档和注释中的旧事实

### 任务 6：验证

**最小验证**

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/app/release-build-contract.test.ts src/main/channels/telegram/secret-store.test.ts src/main/membership-token-store.test.ts src/main/agent-runtime/desktop-adapter.test.ts
CI=1 pnpm --dir apps/moryflow/pc build
```

**扩展验证**

```bash
pnpm --filter @moryflow/pc exec vitest run src/main/channels/telegram/runtime-orchestrator.test.ts src/main/channels/telegram/settings-application-service.test.ts src/renderer/lib/server/__tests__/auth-methods.spec.ts src/renderer/lib/server/__tests__/auth-methods.google.spec.ts
pnpm --filter @moryflow/pc exec vitest run src/renderer/workspace/components/remote-agents/telegram-section.behavior.test.tsx
```

**最终验收标准**

- 生产代码不再出现 `keytar` / `safeStorage`
- 构建通过
- 本地持久化可写、可读、可删
- 模块重载后仍能从磁盘回读
- 关键 renderer/main 回归测试通过
