# 工具能力面

统一入口：`scripts/macos_automation.py`

## 核心工具

- `list_macos_automation_categories`
- `search_macos_automation_tips`
- `run_macos_template`
- `run_macos_script`
- `check_macos_permissions`
- `accessibility_query`

## 语义工具（模板映射）

- system：`get_frontmost_app`、`launch_app`、`quit_app`、`set_system_volume`、`toggle_dark_mode`、`get_battery_status`
- clipboard：`get_clipboard`、`set_clipboard`、`clear_clipboard`
- finder：`get_selected_files`、`search_files`、`quick_look_file`
- shortcuts：`list_shortcuts`、`run_shortcut`
- calendar：`calendar_add_event`、`calendar_list_today`
- notifications：`send_notification`、`toggle_do_not_disturb`
- iterm：`iterm_run`、`iterm_paste_clipboard`
- notes：`notes_create`、`notes_create_raw_html`、`notes_list`、`notes_get`、`notes_search`
- mail：`mail_create_email`、`mail_list_emails`、`mail_get_email`
- messages：`messages_list_chats`、`messages_get_messages`、`messages_search_messages`、`messages_compose_message`
- pages：`create_pages_document`

## 调用示例

```bash
python scripts/macos_automation.py list-tools
python scripts/macos_automation.py list-tools --with-schema
python scripts/macos_automation.py describe-tool --tool run_macos_script
python scripts/macos_automation.py export-tool-schemas

python scripts/macos_automation.py call \
  --tool launch_app \
  --input-json '{"name":"Reminders"}'

python scripts/macos_automation.py call \
  --tool run_macos_template \
  --input-json '{"template_id":"shortcuts_run_shortcut","input_data":{"name":"启动闪念"}}'

python scripts/macos_automation.py call \
  --tool run_macos_script \
  --input-json '{"script_content":"tell application \"Finder\" to get name of startup disk"}'

python scripts/macos_automation.py call \
  --tool accessibility_query \
  --input-json '{"command":"query","locator":{"role":"AXWindow"}}'
```
