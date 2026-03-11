# PC 零 Keychain 存储改造设计

**目标**

移除 Moryflow Desktop 中所有会触发 macOS Keychain 的存储路径，确保安装后和运行时都不会再出现系统凭据弹窗。

**背景**

桌面端此前存在 3 条依赖系统安全存储的路径：

- Telegram secrets 使用 `keytar`
- Membership auth tokens 使用 `keytar`
- Agent runtime secure storage 使用 Electron `safeStorage`

这 3 条路径都会触达 macOS Keychain，因此无法满足“绝不弹窗”的产品要求。当前阶段没有真实用户，所以本次改造不考虑迁移旧数据，也不做向后兼容。

**决策**

桌面端所有敏感信息统一改为本地文件持久化：

- 保留 Telegram、membership、agent-runtime 现有的存储边界和主要调用接口
- 移除所有 `keytar` / `safeStorage` 路径
- 使用独立的 `electron-store` 文件作为新的事实源
- 不读取旧 Keychain 数据，也不做自动迁移

**为什么这样做**

- 这是唯一能稳定满足“零 Keychain 弹窗”的方案
- 避免把 token 混进普通设置快照或无关配置文件
- 调用方 API 基本不变，改动主要收敛在存储层
- 同时移除了直接 Keychain 依赖和间接 Keychain 依赖

**范围**

1. Telegram 主进程 secret store
2. Membership 主进程 token store
3. Agent runtime secure storage 适配器
4. 桌面端依赖、构建契约与相关文档

**非目标**

- 迁移旧 Keychain 条目
- 兼容旧的本地 secret 格式
- 提升本地静态加密强度

**存储布局**

- Telegram secrets 继续保留独立主进程模块，但落到独立 `electron-store` 文件
- Membership tokens 继续保留独立主进程模块，但落到独立 `electron-store` 文件
- Agent runtime secure storage 继续保留 `SecureStorage` 接口，但底层改成普通本地 store

**行为变化**

- Telegram 启动不再访问 macOS Keychain，因为相关路径已被完全移除
- Telegram 和 membership 的 `isSecureStorageAvailable()` 仍保留 IPC 契约，但语义变为“本地凭据存储可用”，当前实现恒为 `true`
- Renderer 侧不再主动做“安全存储可用性检查”或展示相关告警
- 新安装和升级安装都不会再自动读取旧 Keychain 数据，因此 Telegram 凭据和 membership 登录态需要按新本地存储重新建立一次

**验证要求**

- 单测证明 3 条存储实现都不再依赖 `keytar` / `safeStorage`
- 单测证明 Telegram、membership、secureStorage 都能本地 round-trip
- 单测证明模块重载后仍能从磁盘回读本地持久化数据
- Release/build 契约测试证明 `@moryflow/pc` 已不再依赖 `keytar`
- 构建验证证明桌面端在移除 `keytar` rebuild hook 后仍可正常 build
