# 配置矩阵

## 核心能力开关

| 变量                             | 默认值     | 说明                                        |
| -------------------------------- | ---------- | ------------------------------------------- |
| `MACOS_KIT_ENABLE_RAW_SCRIPT`    | `true`     | 是否允许 `run_macos_script`                 |
| `MACOS_KIT_ENABLE_AX_QUERY`      | `true`     | 是否允许 `accessibility_query`              |
| `MACOS_KIT_SAFE_MODE`            | `balanced` | 风险策略档位：`strict` / `balanced` / `off` |
| `MACOS_KIT_ALLOWED_SCRIPT_ROOTS` | 空         | 脚本路径白名单；不配置即不限制              |

## 超时控制

| 变量                                | 默认值 | 说明           |
| ----------------------------------- | ------ | -------------- |
| `MACOS_KIT_DEFAULT_TIMEOUT_SECONDS` | `30`   | 默认执行超时   |
| `MACOS_KIT_MAX_TIMEOUT_SECONDS`     | `120`  | 允许的最大超时 |

## AX 依赖

| 变量                           | 默认值                                | 说明                                      |
| ------------------------------ | ------------------------------------- | ----------------------------------------- |
| `MACOS_KIT_AX_BINARY_PATH`     | `ax`                                  | AX 可执行文件命令或路径                   |
| `MACOS_KIT_AX_AUTO_INSTALL`    | `true`                                | 未命中本地 ax 时是否自动下载              |
| `MACOS_KIT_AX_DOWNLOAD_URL`    | 空                                    | 下载地址模板，支持 `{platform}`、`{arch}` |
| `MACOS_KIT_AX_DOWNLOAD_SHA256` | 空                                    | AX 下载内容 SHA256 校验值（推荐配置）     |
| `MACOS_KIT_AX_CACHE_DIR`       | `~/.cache/macos-automation-skill/bin` | AX 缓存目录                               |

## 推荐策略

- 默认使用 `balanced`，兼顾可用性与安全性。
- 高安全场景使用 `strict` + `MACOS_KIT_ALLOWED_SCRIPT_ROOTS`。
- `off` 仅在用户明确授权后短时使用。
