#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from _shared import build_failure, build_success, parse_bool, print_json
from accessibility_query import execute_accessibility_query
from check_env import check_environment
from run_macos_script import execute_script
from template_tool import (
    execute_template_data,
    get_kb_root,
    list_categories_data,
    search_templates_data,
)
from tool_schemas import TEMPLATE_TOOL_MAP, build_tool_catalog, export_tool_schemas


def all_tool_names() -> list[str]:
    return sorted(build_tool_catalog().keys())


def parse_json_payload(raw: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as error:
        return None, build_failure("INVALID_INPUT", f"input_json 不是合法 JSON: {error}")
    if not isinstance(parsed, dict):
        return None, build_failure("INVALID_INPUT", "input_json 必须是 JSON 对象")
    return parsed, None


def parse_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return []


def pick_template_input(payload: dict[str, Any], template_only: bool) -> tuple[dict[str, Any], list[str]]:
    if isinstance(payload.get("input_data"), dict):
        input_data = dict(payload["input_data"])
    else:
        excluded = {
            "template_id",
            "input_data",
            "arguments",
            "args",
            "timeout_seconds",
            "safe_mode",
            "include_shared_handlers",
        }
        if template_only:
            input_data = {k: v for k, v in payload.items() if k not in excluded}
        else:
            input_data = dict(payload)

    arguments = parse_string_list(payload.get("arguments"))
    if not arguments:
        arguments = parse_string_list(payload.get("args"))

    return input_data, arguments


def call_template_tool(
    *,
    template_id: str,
    payload: dict[str, Any],
    kb_path: str | None,
    include_shared_handlers: bool | None,
) -> dict[str, Any]:
    kb_root = get_kb_root(kb_path)
    if not kb_root.exists() or not kb_root.is_dir():
        return build_failure("INVALID_INPUT", f"知识库目录不存在: {kb_root}")

    input_data, arguments = pick_template_input(payload, template_only=True)
    timeout_seconds = payload.get("timeout_seconds")

    return execute_template_data(
        kb_root,
        template_id=template_id,
        input_data=input_data,
        args=arguments,
        include_shared_handlers=(
            bool(include_shared_handlers)
            if include_shared_handlers is not None
            else bool(payload.get("include_shared_handlers", True))
        ),
        timeout_seconds=timeout_seconds if isinstance(timeout_seconds, int) else None,
        safe_mode=str(payload.get("safe_mode") or os.getenv("MACOS_KIT_SAFE_MODE", "balanced")),
        default_timeout_seconds=int(os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")),
        max_timeout_seconds=int(os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")),
    )


def execute_tool(
    *,
    tool_name: str,
    payload: dict[str, Any],
    kb_path: str | None,
    include_shared_handlers: bool | None,
) -> dict[str, Any]:
    if tool_name == "list_macos_automation_categories":
        kb_root = get_kb_root(kb_path)
        if not kb_root.exists() or not kb_root.is_dir():
            return build_failure("INVALID_INPUT", f"知识库目录不存在: {kb_root}")
        return list_categories_data(kb_root)

    if tool_name == "search_macos_automation_tips":
        kb_root = get_kb_root(kb_path)
        if not kb_root.exists() or not kb_root.is_dir():
            return build_failure("INVALID_INPUT", f"知识库目录不存在: {kb_root}")
        limit = payload.get("limit")
        resolved_limit = limit if isinstance(limit, int) and limit > 0 else 10
        return search_templates_data(
            kb_root,
            query=str(payload.get("query") or "") or None,
            category=str(payload.get("category") or "") or None,
            limit=min(resolved_limit, 50),
        )

    if tool_name == "run_macos_template":
        template_id = payload.get("template_id")
        if not isinstance(template_id, str) or not template_id.strip():
            return build_failure("INVALID_INPUT", "run_macos_template 需要 template_id")
        return call_template_tool(
            template_id=template_id.strip(),
            payload=payload,
            kb_path=kb_path,
            include_shared_handlers=include_shared_handlers,
        )

    if tool_name == "run_macos_script":
        result, ok = execute_script(
            script_content=payload.get("script_content")
            if isinstance(payload.get("script_content"), str)
            else None,
            script_file=payload.get("script_path") if isinstance(payload.get("script_path"), str) else None,
            language=str(payload.get("language") or "applescript"),
            script_args=parse_string_list(payload.get("arguments") or payload.get("args")),
            timeout_seconds=payload.get("timeout_seconds") if isinstance(payload.get("timeout_seconds"), int) else None,
            safe_mode=str(payload.get("safe_mode") or os.getenv("MACOS_KIT_SAFE_MODE", "balanced")),
            allowed_script_roots=payload.get("allowed_script_roots")
            if isinstance(payload.get("allowed_script_roots"), str)
            else os.getenv("MACOS_KIT_ALLOWED_SCRIPT_ROOTS", ""),
            enable_raw_script=payload.get("enable_raw_script")
            if payload.get("enable_raw_script") is not None
            else os.getenv("MACOS_KIT_ENABLE_RAW_SCRIPT", "true"),
            default_timeout_seconds=int(os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")),
            max_timeout_seconds=int(os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")),
        )
        return result if ok else result

    if tool_name == "check_macos_permissions":
        return check_environment(
            prewarm_ax=parse_bool(payload.get("prewarm_ax"), default=False),
            ax_binary_path=str(payload.get("ax_binary_path") or os.getenv("MACOS_KIT_AX_BINARY_PATH", "ax")),
            ax_auto_install=os.getenv("MACOS_KIT_AX_AUTO_INSTALL", "true"),
            ax_download_url=os.getenv("MACOS_KIT_AX_DOWNLOAD_URL", ""),
            ax_download_sha256=os.getenv("MACOS_KIT_AX_DOWNLOAD_SHA256", ""),
            ax_cache_dir=os.getenv("MACOS_KIT_AX_CACHE_DIR", "~/.cache/macos-automation-skill/bin"),
        )

    if tool_name == "accessibility_query":
        query_payload = payload.get("payload") if isinstance(payload.get("payload"), dict) else payload
        result, _ = execute_accessibility_query(
            payload=query_payload,
            timeout_seconds=payload.get("timeout_seconds") if isinstance(payload.get("timeout_seconds"), int) else None,
            enable_ax_query=payload.get("enable_ax_query")
            if payload.get("enable_ax_query") is not None
            else os.getenv("MACOS_KIT_ENABLE_AX_QUERY", "true"),
            ax_binary_path=str(payload.get("ax_binary_path") or os.getenv("MACOS_KIT_AX_BINARY_PATH", "ax")),
            ax_auto_install=os.getenv("MACOS_KIT_AX_AUTO_INSTALL", "true"),
            ax_download_url=os.getenv("MACOS_KIT_AX_DOWNLOAD_URL", ""),
            ax_download_sha256=os.getenv("MACOS_KIT_AX_DOWNLOAD_SHA256", ""),
            ax_cache_dir=os.getenv("MACOS_KIT_AX_CACHE_DIR", "~/.cache/macos-automation-skill/bin"),
            default_timeout_seconds=int(os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")),
            max_timeout_seconds=int(os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")),
        )
        return result

    if tool_name in TEMPLATE_TOOL_MAP:
        return call_template_tool(
            template_id=TEMPLATE_TOOL_MAP[tool_name],
            payload=payload,
            kb_path=kb_path,
            include_shared_handlers=include_shared_handlers,
        )

    return build_failure("NOT_FOUND", f"未知工具: {tool_name}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="macOS 自动化统一工具入口")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list-tools", help="列出可调用工具")
    list_parser.add_argument("--kb-path", default=None, help="知识库目录（用于推断模板参数）")
    list_parser.add_argument(
        "--with-schema",
        action="store_true",
        help="包含 input_schema 字段",
    )

    describe_parser = subparsers.add_parser("describe-tool", help="查看单个工具的输入 schema")
    describe_parser.add_argument("--tool", required=True, help="工具名")
    describe_parser.add_argument("--kb-path", default=None, help="知识库目录（用于推断模板参数）")

    export_parser = subparsers.add_parser("export-tool-schemas", help="导出机器可读工具 schema 清单")
    export_parser.add_argument("--kb-path", default=None, help="知识库目录（用于推断模板参数）")
    export_parser.add_argument(
        "--output-file",
        default=str(Path(__file__).resolve().parent.parent / "assets" / "tool-schemas.json"),
        help="输出 JSON 文件路径",
    )

    call_parser = subparsers.add_parser("call", help="按工具名调用")
    call_parser.add_argument("--tool", required=True, help="工具名")
    call_parser.add_argument("--input-json", default="{}", help="工具输入（JSON 对象）")
    call_parser.add_argument("--kb-path", default=None, help="知识库目录（默认使用 skill 内置知识库）")
    call_parser.add_argument(
        "--include-shared-handlers",
        choices=["true", "false"],
        default=None,
        help="是否拼接共享 handlers，默认 true",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "list-tools":
        catalog = build_tool_catalog(args.kb_path)
        tools: list[dict[str, Any]] = []
        for name in sorted(catalog.keys()):
            item = catalog[name]
            output_item = {
                "name": item["name"],
                "type": item["type"],
                "title": item["title"],
                "description": item["description"],
            }
            if item.get("template_id"):
                output_item["template_id"] = item["template_id"]
            if args.with_schema:
                output_item["input_schema"] = item["input_schema"]
            tools.append(output_item)
        print_json(build_success({"count": len(tools), "tools": tools}))
        return 0

    if args.command == "describe-tool":
        catalog = build_tool_catalog(args.kb_path)
        tool = catalog.get(args.tool)
        if not tool:
            print_json(build_failure("NOT_FOUND", f"未知工具: {args.tool}"))
            return 1
        print_json(build_success({"tool": tool}))
        return 0

    if args.command == "export-tool-schemas":
        payload = export_tool_schemas(kb_path=args.kb_path, output_path=args.output_file)
        print_json(build_success({"output_file": str(Path(args.output_file).expanduser().resolve()), **payload}))
        return 0

    payload, error = parse_json_payload(args.input_json)
    if error:
        print_json(error)
        return 1

    include_shared_handlers: bool | None = None
    if args.include_shared_handlers is not None:
        include_shared_handlers = args.include_shared_handlers == "true"

    result = execute_tool(
        tool_name=args.tool,
        payload=payload or {},
        kb_path=args.kb_path,
        include_shared_handlers=include_shared_handlers,
    )

    print_json(result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
