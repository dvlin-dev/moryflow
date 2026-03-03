# 模板目录

该 skill 内置知识库路径：`assets/knowledge-base/`。

## system

- `system_get_frontmost_app`
- `system_launch_app`
- `system_quit_app`
- `system_set_system_volume`
- `system_toggle_dark_mode`
- `system_get_battery_status`

## clipboard

- `clipboard_get_clipboard`
- `clipboard_set_clipboard`
- `clipboard_clear_clipboard`

## finder

- `finder_get_selected_files`
- `finder_search_files`
- `finder_quick_look_file`

## shortcuts

- `shortcuts_list_shortcuts`
- `shortcuts_run_shortcut`

## calendar

- `calendar_calendar_add_event`
- `calendar_calendar_list_today`

## notifications

- `notifications_send_notification`
- `notifications_toggle_do_not_disturb`

## iterm

- `iterm_iterm_run`
- `iterm_iterm_paste_clipboard`

## notes

- `notes_notes_create`
- `notes_notes_create_raw_html`
- `notes_notes_list`
- `notes_notes_get`
- `notes_notes_search`

## mail

- `mail_mail_create_email`
- `mail_mail_list_emails`
- `mail_mail_get_email`

## messages

- `messages_messages_list_chats`
- `messages_messages_get_messages`
- `messages_messages_search_messages`
- `messages_messages_compose_message`

## pages

- `pages_create_pages_document`

## accessibility

- `accessibility_accessibility_note`

## 实时查看

```bash
python scripts/template_tool.py categories
python scripts/template_tool.py list
python scripts/template_tool.py search --query "message"
```
