# 工具输入 Schema

本 skill 提供机器可读的工具输入 schema，供客户端自动补全与参数校验。

## 文件位置

- 清单文件：`assets/tool-schemas.json`
- 生成脚本：`scripts/generate_tool_schemas.py`

## 生成命令

```bash
python scripts/generate_tool_schemas.py
python scripts/generate_tool_schemas.py --check
```

可指定输出路径：

```bash
python scripts/generate_tool_schemas.py --output-file /tmp/tool-schemas.json
```

## 通过统一入口使用

```bash
python scripts/macos_automation.py list-tools --with-schema
python scripts/macos_automation.py describe-tool --tool run_macos_script
python scripts/macos_automation.py export-tool-schemas
```

## Schema 结构

顶层字段：

- `schema_version`
- `tool_count`
- `tools[]`

每个工具包含：

- `name`
- `type`（`core` / `template`）
- `title`
- `description`
- `input_schema`（JSON Schema 风格）
- `template_id`（模板工具才有）
