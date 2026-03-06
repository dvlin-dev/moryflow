---
name: macos-automation
description: 在 macOS 上执行端到端自动化任务：应用控制、系统设置、Finder/剪贴板、Shortcuts、Calendar、Notes、Mail、Messages、通知、Pages，以及基于 AX 的 UI 查询与动作。遇到 AppleScript/JXA、快捷指令编排、UI 自动化、模板执行、权限诊断、脚本安全控制、或需要把自然语言动作转为可执行自动化时，使用此 skill。
---

# macOS Automation

优先用统一入口完成任务，同时保留自由脚本模式，确保“能快速落地 + 能深度定制”。

## 执行规则

1. 先跑环境预检。
2. 优先走模板或语义工具。
3. 需要灵活性时退回原始脚本。
4. 涉及 UI 层时走 AX 查询并自动兜底依赖。
5. 命中安全策略时先改写脚本，再决定是否降级策略。

## 快速开始

```bash
python scripts/check_env.py --prewarm-ax
python scripts/macos_automation.py list-tools
python scripts/macos_automation.py describe-tool --tool run_macos_script
python scripts/macos_automation.py call --tool get_frontmost_app --input-json '{}'
```

## 三种调用模式

### 1) 语义工具模式（推荐）

直接调用工具名，让 skill 自行完成“模板选择 + 占位符替换 + 执行”。

```bash
python scripts/macos_automation.py call \
  --tool run_shortcut \
  --input-json '{"name":"启动闪念"}'
```

### 2) 模板编排模式（中等自由度）

当你知道模板 ID，直接调用 `run_macos_template`，可控性更高。

```bash
python scripts/macos_automation.py call \
  --tool run_macos_template \
  --input-json '{"template_id":"system_launch_app","input_data":{"name":"Reminders"}}'
```

### 3) 原始脚本模式（最高自由度）

当模板不覆盖需求时，直接运行 AppleScript/JXA。

```bash
python scripts/macos_automation.py call \
  --tool run_macos_script \
  --input-json '{"script_content":"tell application \"Finder\" to get name of startup disk"}'
```

## AX 自动化

先确保 AX 依赖可用，再执行查询或动作。

```bash
python scripts/accessibility_query.py \
  --payload-json '{"command":"query","locator":{"role":"AXWindow"}}'
```

若启用自动下载，优先配置 `MACOS_KIT_AX_DOWNLOAD_SHA256` 做完整性校验。

## 安全策略

- `balanced`（默认）：阻断关键危险命令。
- `strict`：额外阻断 `curl | sh` 与二进制脚本文件。
- `off`：关闭风险扫描，仅在用户明确授权后使用。

执行被阻断时，先解释风险并给出等价安全替代方案。

## 资源导航

- 工具能力面：`references/tool-surface.md`
- 能力覆盖矩阵：`references/coverage-matrix.md`
- 工具输入 schema：`references/tool-schemas.md`
- 配置矩阵：`references/config-matrix.md`
- 模板目录：`references/template-catalog.md`
- AX 策略：`references/ax-strategy.md`
- 内置知识库：`assets/knowledge-base/`
- 机器可读 schema 清单：`assets/tool-schemas.json`
