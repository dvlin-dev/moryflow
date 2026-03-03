#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

from _shared import build_failure, build_success, print_json, substitute_placeholders
from run_macos_script import execute_script

try:
    import yaml
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    yaml = None

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_KB_ROOT = SCRIPT_DIR.parent / "assets" / "knowledge-base"

CODE_BLOCK_PATTERN = re.compile(r"```(applescript|javascript)\s*\n([\s\S]*?)\n```", re.IGNORECASE)
FRONTMATTER_PATTERN = re.compile(r"^---\n([\s\S]*?)\n---\n", re.MULTILINE)


def parse_frontmatter_fallback(frontmatter_text: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    lines = frontmatter_text.splitlines()
    block_key: str | None = None
    block_lines: list[str] = []

    def flush_block() -> None:
        nonlocal block_key, block_lines
        if block_key is not None:
            result[block_key] = "\n".join(block_lines).strip()
        block_key = None
        block_lines = []

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if block_key is not None:
            if line.startswith(" ") or line.startswith("\t") or not stripped:
                block_lines.append(stripped)
                continue
            flush_block()

        if not stripped or stripped.startswith("#"):
            continue
        if line.startswith(" ") or line.startswith("\t"):
            continue
        if ":" not in line:
            continue

        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()

        if value in {"|", ">", "|-", ">-", "|+", ">+"}:
            block_key = key
            block_lines = []
            continue

        if value.startswith("[") and value.endswith("]"):
            items = [item.strip().strip('"\'') for item in value[1:-1].split(",")]
            result[key] = [item for item in items if item]
        else:
            result[key] = value.strip('"\'')

    flush_block()
    return result


def parse_frontmatter(raw: str) -> dict[str, Any]:
    match = FRONTMATTER_PATTERN.match(raw)
    if not match:
        return {}

    frontmatter_text = match.group(1)
    if yaml is None:
        return parse_frontmatter_fallback(frontmatter_text)

    try:
        parsed = yaml.safe_load(frontmatter_text)
    except yaml.YAMLError:
        return parse_frontmatter_fallback(frontmatter_text)

    if not isinstance(parsed, dict):
        return {}

    return parsed


def parse_template_file(path: Path) -> dict[str, Any] | None:
    raw = path.read_text(encoding="utf-8")
    code_match = CODE_BLOCK_PATTERN.search(raw)
    if not code_match:
        return None

    frontmatter = parse_frontmatter(raw)
    script_language = code_match.group(1).strip().lower()
    script_content = code_match.group(2).strip()

    template_id = frontmatter.get("id")
    if not template_id:
        template_id = f"{path.parent.name}_{path.stem}".lower().replace("-", "_")

    return {
        "id": template_id,
        "title": frontmatter.get("title", template_id),
        "description": frontmatter.get("description", ""),
        "keywords": frontmatter.get("keywords", []),
        "arguments_prompt": frontmatter.get("argumentsPrompt", ""),
        "notes": frontmatter.get("notes", ""),
        "category": path.parent.name,
        "source_path": str(path),
        "language": script_language,
        "script": script_content,
    }


def parse_category_info(category_path: Path) -> str:
    info_file = category_path / "_category_info.md"
    if not info_file.exists():
        return f"{category_path.name} 自动化脚本模板"

    raw = info_file.read_text(encoding="utf-8")
    frontmatter = parse_frontmatter(raw)
    description = frontmatter.get("description")
    if isinstance(description, str) and description.strip():
        return description.strip()
    return f"{category_path.name} 自动化脚本模板"


def load_shared_handlers(kb_root: Path, language: str) -> list[str]:
    handler_dir = kb_root / "_shared_handlers"
    if not handler_dir.exists() or not handler_dir.is_dir():
        return []

    extension_map = {"applescript": ".applescript", "javascript": ".js"}
    target_ext = extension_map[language]

    handlers: list[str] = []
    for path in sorted(handler_dir.iterdir()):
        if not path.is_file() or path.suffix != target_ext:
            continue
        handlers.append(path.read_text(encoding="utf-8").strip())
    return handlers


def load_templates(kb_root: Path) -> list[dict[str, Any]]:
    templates: list[dict[str, Any]] = []
    for category_dir in sorted(kb_root.iterdir()):
        if not category_dir.is_dir() or category_dir.name.startswith("_"):
            continue
        for path in sorted(category_dir.glob("*.md")):
            if path.name.startswith("_"):
                continue
            parsed = parse_template_file(path)
            if parsed:
                templates.append(parsed)
    return templates


def load_categories(kb_root: Path, templates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    categories: list[dict[str, Any]] = []
    for category_dir in sorted(kb_root.iterdir()):
        if not category_dir.is_dir() or category_dir.name.startswith("_"):
            continue
        category_id = category_dir.name
        categories.append(
            {
                "id": category_id,
                "description": parse_category_info(category_dir),
                "count": len([item for item in templates if item["category"] == category_id]),
            }
        )
    return categories


def summarize_template(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "title": item["title"],
        "category": item["category"],
        "description": item["description"],
        "language": item["language"],
        "keywords": item["keywords"],
        "argumentsPrompt": item["arguments_prompt"],
    }


def get_kb_root(path_text: str | None) -> Path:
    if path_text:
        return Path(path_text).expanduser().resolve()
    return DEFAULT_KB_ROOT


def parse_json_object(raw_json: str, field_name: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as error:
        return None, build_failure("INVALID_INPUT", f"{field_name} 不是合法 JSON: {error}")

    if not isinstance(parsed, dict):
        return None, build_failure("INVALID_INPUT", f"{field_name} 必须是 JSON 对象")

    return parsed, None


def list_categories_data(kb_root: Path) -> dict[str, Any]:
    templates = load_templates(kb_root)
    categories = load_categories(kb_root, templates)
    return build_success({"kb_path": str(kb_root), "categories": categories})


def list_templates_data(
    kb_root: Path,
    *,
    category: str | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    templates = load_templates(kb_root)
    if category:
        templates = [item for item in templates if item["category"] == category]
    if limit is not None and limit > 0:
        templates = templates[:limit]

    summaries = [summarize_template(item) for item in templates]
    return build_success({"kb_path": str(kb_root), "count": len(summaries), "templates": summaries})


def search_templates_data(
    kb_root: Path,
    *,
    query: str | None,
    category: str | None,
    limit: int,
) -> dict[str, Any]:
    templates = load_templates(kb_root)

    if category:
        templates = [item for item in templates if item["category"] == category]

    matched: list[dict[str, Any]] = []
    normalized_query = (query or "").strip().lower()

    if not normalized_query:
        matched = templates
    else:
        for item in templates:
            searchable = " ".join(
                [
                    item["id"],
                    item["title"],
                    item["description"],
                    item["category"],
                    " ".join(item["keywords"] if isinstance(item["keywords"], list) else []),
                    item.get("arguments_prompt") or "",
                    item.get("notes") or "",
                ]
            ).lower()
            if normalized_query in searchable:
                matched.append(item)

    limited = matched[: max(1, limit)]
    return build_success(
        {
            "kb_path": str(kb_root),
            "query": query,
            "category": category,
            "total": len(limited),
            "templates": [summarize_template(item) for item in limited],
        }
    )


def render_template_data(
    kb_root: Path,
    *,
    template_id: str,
    input_data: dict[str, Any],
    args: list[str],
    include_shared_handlers: bool,
    output_script_file: str | None,
) -> dict[str, Any]:
    templates = load_templates(kb_root)
    target = next((item for item in templates if item["id"] == template_id), None)
    if not target:
        return build_failure("NOT_FOUND", f"模板不存在: {template_id}")

    script = target["script"]
    if include_shared_handlers:
        handlers = load_shared_handlers(kb_root, target["language"])
        if handlers:
            script = "\n\n".join([*handlers, script])

    rendered = substitute_placeholders(
        script=script,
        language=target["language"],
        input_data=input_data,
        args=args,
    )

    payload: dict[str, Any] = {
        "template": {
            "id": target["id"],
            "title": target["title"],
            "category": target["category"],
            "language": target["language"],
            "source_path": target["source_path"],
        },
        "rendered_script": rendered,
    }

    if output_script_file:
        output_path = Path(output_script_file).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
        payload["output_script_file"] = str(output_path)

    return build_success(payload)


def execute_template_data(
    kb_root: Path,
    *,
    template_id: str,
    input_data: dict[str, Any],
    args: list[str],
    include_shared_handlers: bool,
    timeout_seconds: int | None,
    safe_mode: str | None,
    default_timeout_seconds: int,
    max_timeout_seconds: int,
) -> dict[str, Any]:
    render_result = render_template_data(
        kb_root,
        template_id=template_id,
        input_data=input_data,
        args=args,
        include_shared_handlers=include_shared_handlers,
        output_script_file=None,
    )
    if not render_result["ok"]:
        return render_result

    rendered_data = render_result["data"]
    execution_result, ok = execute_script(
        script_content=rendered_data["rendered_script"],
        script_file=None,
        language=rendered_data["template"]["language"],
        script_args=args,
        timeout_seconds=timeout_seconds,
        safe_mode=safe_mode,
        enable_raw_script=os.getenv("MACOS_KIT_ENABLE_RAW_SCRIPT", "true"),
        default_timeout_seconds=default_timeout_seconds,
        max_timeout_seconds=max_timeout_seconds,
    )
    if not ok:
        return execution_result

    return build_success(
        {
            "template": rendered_data["template"],
            "stdout": execution_result["data"]["stdout"],
            "stderr": execution_result["data"]["stderr"],
            "language": execution_result["data"]["language"],
            "timeout_seconds": execution_result["data"]["timeout_seconds"],
        }
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="macOS 自动化模板工具")
    subparsers = parser.add_subparsers(dest="command", required=True)

    categories_parser = subparsers.add_parser("categories", help="列出自动化分类")
    categories_parser.add_argument("--kb-path", default=None, help="知识库根目录")

    list_parser = subparsers.add_parser("list", help="列出模板")
    list_parser.add_argument("--kb-path", default=None, help="知识库根目录")
    list_parser.add_argument("--category", default=None, help="按分类过滤")
    list_parser.add_argument("--limit", type=int, default=None, help="限制结果数量")

    search_parser = subparsers.add_parser("search", help="搜索模板")
    search_parser.add_argument("--kb-path", default=None, help="知识库根目录")
    search_parser.add_argument("--query", default=None, help="关键词")
    search_parser.add_argument("--category", default=None, help="按分类过滤")
    search_parser.add_argument("--limit", type=int, default=10, help="返回数量")

    render_parser = subparsers.add_parser("render", help="渲染模板并替换占位符")
    render_parser.add_argument("--kb-path", default=None, help="知识库根目录")
    render_parser.add_argument("--template-id", required=True, help="模板 ID")
    render_parser.add_argument("--input-json", default="{}", help="JSON 形式的输入参数")
    render_parser.add_argument("--arg", action="append", default=[], help="模板参数，可重复")
    render_parser.add_argument(
        "--include-shared-handlers",
        action="store_true",
        help="自动拼接 _shared_handlers 中同语言公共脚本",
    )
    render_parser.add_argument("--output-script-file", default=None, help="写入渲染后的脚本")

    execute_parser = subparsers.add_parser("execute", help="渲染并执行模板")
    execute_parser.add_argument("--kb-path", default=None, help="知识库根目录")
    execute_parser.add_argument("--template-id", required=True, help="模板 ID")
    execute_parser.add_argument("--input-json", default="{}", help="JSON 形式的输入参数")
    execute_parser.add_argument("--arg", action="append", default=[], help="模板参数，可重复")
    execute_parser.add_argument(
        "--include-shared-handlers",
        action="store_true",
        help="自动拼接 _shared_handlers 中同语言公共脚本",
    )
    execute_parser.add_argument("--timeout-seconds", type=int, default=None, help="执行超时")
    execute_parser.add_argument(
        "--safe-mode",
        choices=["strict", "balanced", "off"],
        default=os.getenv("MACOS_KIT_SAFE_MODE", "balanced"),
        help="执行风险策略",
    )
    execute_parser.add_argument(
        "--default-timeout-seconds",
        type=int,
        default=int(os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")),
        help="默认超时",
    )
    execute_parser.add_argument(
        "--max-timeout-seconds",
        type=int,
        default=int(os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")),
        help="最大超时",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    kb_root = get_kb_root(getattr(args, "kb_path", None))
    if not kb_root.exists() or not kb_root.is_dir():
        result = build_failure("INVALID_INPUT", f"知识库目录不存在: {kb_root}")
        print_json(result)
        return 1

    if args.command == "categories":
        result = list_categories_data(kb_root)
    elif args.command == "list":
        result = list_templates_data(kb_root, category=args.category, limit=args.limit)
    elif args.command == "search":
        result = search_templates_data(
            kb_root,
            query=args.query,
            category=args.category,
            limit=args.limit,
        )
    elif args.command == "render":
        input_data, error = parse_json_object(args.input_json, "input_json")
        result = error or render_template_data(
            kb_root,
            template_id=args.template_id,
            input_data=input_data or {},
            args=args.arg,
            include_shared_handlers=args.include_shared_handlers,
            output_script_file=args.output_script_file,
        )
    elif args.command == "execute":
        input_data, error = parse_json_object(args.input_json, "input_json")
        result = error or execute_template_data(
            kb_root,
            template_id=args.template_id,
            input_data=input_data or {},
            args=args.arg,
            include_shared_handlers=args.include_shared_handlers,
            timeout_seconds=args.timeout_seconds,
            safe_mode=args.safe_mode,
            default_timeout_seconds=args.default_timeout_seconds,
            max_timeout_seconds=args.max_timeout_seconds,
        )
    else:
        result = build_failure("INVALID_INPUT", f"不支持的命令: {args.command}")

    print_json(result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
