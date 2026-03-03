# 能力覆盖矩阵

## 覆盖目标

把整个工具面收敛为 skill 可调用能力，覆盖以下四层：

1. 发现层：分类与模板检索
2. 执行层：模板执行与原始脚本执行
3. 语义层：系统/Finder/剪贴板/邮件等语义工具
4. UI 层：AX 查询与动作

## 工具名覆盖

- 发现层：`list_macos_automation_categories`、`search_macos_automation_tips`
- 执行层：`run_macos_template`、`run_macos_script`
- 诊断层：`check_macos_permissions`
- UI 层：`accessibility_query`
- 语义层：33 个模板工具（见 `references/tool-surface.md`）

## 实现入口

- 统一入口：`scripts/macos_automation.py`
- schema 能力：`scripts/tool_schemas.py`、`scripts/generate_tool_schemas.py`、`assets/tool-schemas.json`
- 细粒度脚本：
  - `scripts/template_tool.py`
  - `scripts/run_macos_script.py`
  - `scripts/accessibility_query.py`
  - `scripts/check_env.py`
  - `scripts/ensure_ax.py`

## 灵活性设计

- 高自由度：`run_macos_script` / `run_macos_template`
- 中自由度：语义工具 + 可覆盖 `input_json`
- 低自由度：`check_macos_permissions` 等固定诊断流程

## 内置资源

- 知识库模板：`assets/knowledge-base/`
- 共享脚本处理器：`assets/knowledge-base/_shared_handlers/`
