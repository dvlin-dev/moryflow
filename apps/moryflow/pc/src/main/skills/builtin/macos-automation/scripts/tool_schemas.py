#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from template_tool import get_kb_root, load_templates

TEMPLATE_TOOL_MAP: dict[str, str] = {
    "calendar_add_event": "calendar_calendar_add_event",
    "calendar_list_today": "calendar_calendar_list_today",
    "get_clipboard": "clipboard_get_clipboard",
    "set_clipboard": "clipboard_set_clipboard",
    "clear_clipboard": "clipboard_clear_clipboard",
    "get_selected_files": "finder_get_selected_files",
    "search_files": "finder_search_files",
    "quick_look_file": "finder_quick_look_file",
    "iterm_run": "iterm_iterm_run",
    "iterm_paste_clipboard": "iterm_iterm_paste_clipboard",
    "mail_create_email": "mail_mail_create_email",
    "mail_list_emails": "mail_mail_list_emails",
    "mail_get_email": "mail_mail_get_email",
    "messages_list_chats": "messages_messages_list_chats",
    "messages_get_messages": "messages_messages_get_messages",
    "messages_search_messages": "messages_messages_search_messages",
    "messages_compose_message": "messages_messages_compose_message",
    "notes_create": "notes_notes_create",
    "notes_create_raw_html": "notes_notes_create_raw_html",
    "notes_list": "notes_notes_list",
    "notes_get": "notes_notes_get",
    "notes_search": "notes_notes_search",
    "send_notification": "notifications_send_notification",
    "toggle_do_not_disturb": "notifications_toggle_do_not_disturb",
    "create_pages_document": "pages_create_pages_document",
    "run_shortcut": "shortcuts_run_shortcut",
    "list_shortcuts": "shortcuts_list_shortcuts",
    "get_frontmost_app": "system_get_frontmost_app",
    "launch_app": "system_launch_app",
    "quit_app": "system_quit_app",
    "set_system_volume": "system_set_system_volume",
    "toggle_dark_mode": "system_toggle_dark_mode",
    "get_battery_status": "system_get_battery_status",
}

CORE_TOOL_DEFINITIONS: dict[str, dict[str, Any]] = {
    "list_macos_automation_categories": {
        "title": "列出自动化分类",
        "description": "列出知识库中的所有自动化分类与模板数量。",
        "input_schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {},
        },
    },
    "search_macos_automation_tips": {
        "title": "搜索自动化模板",
        "description": "按关键词、分类搜索模板，支持 limit。",
        "input_schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "category": {"type": "string", "description": "分类过滤"},
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 50,
                    "description": "返回数量，默认 10",
                },
            },
        },
    },
    "run_macos_template": {
        "title": "执行模板",
        "description": "按 template_id 渲染并执行模板。",
        "input_schema": {
            "type": "object",
            "required": ["template_id"],
            "additionalProperties": True,
            "properties": {
                "template_id": {"type": "string", "description": "模板 ID"},
                "input_data": {"type": "object", "description": "命名输入参数"},
                "arguments": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "位置参数（--MCP_ARG_1 等）",
                },
                "args": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "arguments 的别名",
                },
                "timeout_seconds": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "执行超时（秒）",
                },
                "safe_mode": {
                    "type": "string",
                    "enum": ["strict", "balanced", "off"],
                },
                "include_shared_handlers": {
                    "type": "boolean",
                    "description": "是否拼接共享 handlers",
                },
            },
        },
    },
    "run_macos_script": {
        "title": "执行原始脚本",
        "description": "直接执行 AppleScript/JXA，支持 script_content 或 script_path。",
        "input_schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "script_content": {"type": "string"},
                "script_path": {"type": "string"},
                "language": {
                    "type": "string",
                    "enum": ["applescript", "javascript"],
                },
                "arguments": {"type": "array", "items": {"type": "string"}},
                "args": {"type": "array", "items": {"type": "string"}},
                "timeout_seconds": {"type": "integer", "minimum": 1},
                "safe_mode": {
                    "type": "string",
                    "enum": ["strict", "balanced", "off"],
                },
                "allowed_script_roots": {"type": "string"},
                "enable_raw_script": {
                    "anyOf": [{"type": "boolean"}, {"type": "string"}],
                },
            },
            "oneOf": [
                {"required": ["script_content"], "not": {"required": ["script_path"]}},
                {"required": ["script_path"], "not": {"required": ["script_content"]}},
            ],
        },
    },
    "check_macos_permissions": {
        "title": "检查 macOS 权限",
        "description": "探测 osascript、自动化权限，并可选预热 AX。",
        "input_schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "prewarm_ax": {"type": "boolean"},
                "ax_binary_path": {"type": "string"},
            },
        },
    },
    "accessibility_query": {
        "title": "执行 AX 查询",
        "description": "通过 AX 二进制执行 query/perform 请求。",
        "input_schema": {
            "type": "object",
            "additionalProperties": True,
            "properties": {
                "payload": {"type": "object", "description": "AX payload，可选"},
                "timeout_seconds": {"type": "integer", "minimum": 1},
                "enable_ax_query": {
                    "anyOf": [{"type": "boolean"}, {"type": "string"}],
                },
                "ax_binary_path": {"type": "string"},
            },
        },
    },
}

GENERIC_TEMPLATE_CONTROL_PROPERTIES = {
    "input_data": {"type": "object", "description": "命名输入参数"},
    "arguments": {
        "type": "array",
        "items": {"type": "string"},
        "description": "位置参数（--MCP_ARG_1 等）",
    },
    "args": {
        "type": "array",
        "items": {"type": "string"},
        "description": "arguments 的别名",
    },
    "timeout_seconds": {"type": "integer", "minimum": 1},
    "safe_mode": {
        "type": "string",
        "enum": ["strict", "balanced", "off"],
    },
    "include_shared_handlers": {"type": "boolean"},
}


def _load_template_index(kb_root: Path) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in load_templates(kb_root)}


def _extract_input_keys(script: str) -> list[str]:
    keys = set(re.findall(r"--MCP_INPUT:(\w+)", script))
    keys.update(re.findall(r"\$\{inputData\.(\w+)\}", script))
    return sorted(keys)


def _extract_arg_indices(script: str) -> list[int]:
    indices = {int(value) for value in re.findall(r"--MCP_ARG_(\d+)", script)}
    indices.update(int(value) + 1 for value in re.findall(r"\$\{arguments\[(\d+)\]\}", script))
    return sorted(indices)


def _template_input_property() -> dict[str, Any]:
    return {
        "anyOf": [
            {"type": "string"},
            {"type": "number"},
            {"type": "boolean"},
            {"type": "array"},
            {"type": "object"},
            {"type": "null"},
        ]
    }


def _build_template_tool_definition(
    *,
    tool_name: str,
    template_id: str,
    template_index: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    template = template_index.get(template_id)

    if not template:
        return {
            "name": tool_name,
            "type": "template",
            "template_id": template_id,
            "title": tool_name,
            "description": f"模板 {template_id}（未在知识库中找到）",
            "input_schema": {
                "type": "object",
                "additionalProperties": True,
                "properties": dict(GENERIC_TEMPLATE_CONTROL_PROPERTIES),
            },
        }

    input_keys = _extract_input_keys(template["script"])
    arg_indices = _extract_arg_indices(template["script"])

    properties: dict[str, Any] = {}
    for key in input_keys:
        properties[key] = {
            **_template_input_property(),
            "description": f"模板参数: {key}",
        }

    if arg_indices:
        properties["arguments"] = {
            "type": "array",
            "items": {"type": "string"},
            "description": f"模板位置参数，支持索引: {', '.join(str(i) for i in arg_indices)}",
        }

    properties.update(GENERIC_TEMPLATE_CONTROL_PROPERTIES)

    return {
        "name": tool_name,
        "type": "template",
        "template_id": template_id,
        "title": template["title"],
        "description": template.get("description") or template["title"],
        "category": template["category"],
        "language": template["language"],
        "input_schema": {
            "type": "object",
            "additionalProperties": True,
            "properties": properties,
        },
    }


def build_tool_catalog(kb_path: str | None = None) -> dict[str, dict[str, Any]]:
    kb_root = get_kb_root(kb_path)
    template_index = _load_template_index(kb_root)

    catalog: dict[str, dict[str, Any]] = {}

    for name, definition in CORE_TOOL_DEFINITIONS.items():
        catalog[name] = {
            "name": name,
            "type": "core",
            "title": definition["title"],
            "description": definition["description"],
            "input_schema": definition["input_schema"],
        }

    for tool_name, template_id in TEMPLATE_TOOL_MAP.items():
        catalog[tool_name] = _build_template_tool_definition(
            tool_name=tool_name,
            template_id=template_id,
            template_index=template_index,
        )

    return catalog


def get_tool_schema(tool_name: str, kb_path: str | None = None) -> dict[str, Any] | None:
    catalog = build_tool_catalog(kb_path)
    return catalog.get(tool_name)


def export_tool_schemas(
    *,
    kb_path: str | None = None,
    output_path: str | None = None,
) -> dict[str, Any]:
    catalog = build_tool_catalog(kb_path)
    payload = {
        "schema_version": "1.0.0",
        "tool_count": len(catalog),
        "tools": [catalog[name] for name in sorted(catalog.keys())],
    }

    if output_path:
        path = Path(output_path).expanduser().resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return payload
