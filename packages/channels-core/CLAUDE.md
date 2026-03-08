# channels-core

> 注意：本目录（含子目录）职责或契约变更时，必须同步更新本文件

## 定位

`@moryflow/channels-core` 是渠道抽象层的协议与策略核心，负责统一入站/出站 envelope、鉴权策略、线程键与重试语义。

## 职责

- 定义跨渠道共享类型（`InboundEnvelope`、`OutboundEnvelope`、`ThreadResolution`）
- 提供策略判定（DM/群组 allowlist、mention 策略、pairing gate）
- 提供线程解析与标准化工具（`resolveThread`）
- 提供发送重试行为抽象（可恢复错误分类）
- 定义渠道 runtime 所需持久化端口接口（offset/sent/pairing）

## 约束

- 本包禁止依赖具体渠道 SDK（例如 grammY）
- 仅表达协议与纯业务规则，不承载应用层会话 ID（chat session）
- 线程语义与会话语义必须分层：线程定位在本包，会话绑定在应用装配层

## 验证

```bash
pnpm --filter @moryflow/channels-core test:unit
```
