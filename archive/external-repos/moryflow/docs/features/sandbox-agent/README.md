# 本地沙盒 Agent

## 需求

构建类 Manus 的通用 Agent 能力：
- 本地沙盒执行命令
- 零成本、低延迟、隐私优先
- 跨平台支持（macOS/Linux/Windows）

## 技术方案

### 平台策略

| 平台 | 实现方式 |
|------|---------|
| macOS | OS 沙盒（Seatbelt） |
| Linux/Windows | 软隔离（命令检测） |

### 沙盒模式

| 模式 | Vault 内 | Vault 外 |
|------|---------|---------|
| 普通模式 | 读写（保护敏感文件） | Session 授权 |
| 完全放开模式 | 完全自由 | Session 授权 |

### 架构

```
packages/agents-sandbox/
├── sandbox-manager.ts     # 入口
├── platform/
│   ├── detector.ts        # 平台检测
│   ├── macos-sandbox.ts   # macOS 实现
│   └── soft-isolation.ts  # 软隔离实现
├── command/
│   ├── analyzer.ts        # 命令分析
│   ├── path-detector.ts   # 路径检测
│   └── executor.ts        # 命令执行
└── authorization/
    └── path-authorization.ts  # 授权管理
```

### 核心流程（伪代码）

```
execute(command, cwd, onAuthRequest):
  # 1. 检测外部路径
  externalPaths = pathDetector.detect(command, cwd)

  # 2. 检查授权
  for path in externalPaths:
    if not isAuthorized(path):
      choice = await onAuthRequest(path)
      if choice == 'deny':
        throw ACCESS_DENIED
      handleChoice(path, choice)

  # 3. 执行命令
  wrappedCommand = platform.wrapCommand(command)
  result = spawn(wrappedCommand, { cwd, timeout: 120s })

  # 4. 清除临时授权
  pathAuth.clearTemp()
  return result
```

### 授权选项

| 选项 | 行为 |
|------|------|
| 拒绝 | 拒绝访问 |
| 仅本次 | 允许本次，下次仍询问 |
| 始终允许 | 永久允许，保存到配置 |

### 危险命令拦截

- `rm -rf /` / `rm -rf ~`
- `curl url | sh`
- fork bomb

## 代码索引

| 模块 | 路径 |
|------|------|
| 沙盒包 | `packages/agents-sandbox/` |
| 平台适配 | `packages/agents-sandbox/src/platform/` |
| 命令执行 | `packages/agents-sandbox/src/command/` |
| 授权管理 | `packages/agents-sandbox/src/authorization/` |
