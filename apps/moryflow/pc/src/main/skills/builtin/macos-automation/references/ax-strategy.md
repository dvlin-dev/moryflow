# AX 执行策略

## 目标

- 保持零配置可运行。
- 避免安装阶段引入额外网络下载。
- 在运行阶段提供预热与兜底。

## 执行链路

1. 可选预热：

```bash
python scripts/check_env.py --prewarm-ax
```

2. 单独检查/下载：

```bash
python scripts/ensure_ax.py
```

3. 真实调用：

```bash
python scripts/accessibility_query.py --payload-json '{"command":"query"}'
```

## 自动下载配置

```bash
export MACOS_KIT_AX_AUTO_INSTALL=true
export MACOS_KIT_AX_DOWNLOAD_URL='https://example.com/ax/{platform}/{arch}/ax'
export MACOS_KIT_AX_DOWNLOAD_SHA256='<expected_sha256>'
export MACOS_KIT_AX_CACHE_DIR='~/.cache/macos-automation-skill/bin'
```

## 失败处理

- 返回 `DEPENDENCY_MISSING`：未找到二进制，检查下载地址与网络。
- 返回 `INVALID_INPUT`：`MACOS_KIT_AX_DOWNLOAD_SHA256` 非法。
- 返回 `FEATURE_DISABLED`：`MACOS_KIT_ENABLE_AX_QUERY` 被关闭。
- 返回 `EXECUTION_TIMEOUT`：提高超时或缩小查询范围。
