#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

CRITICAL_RISK_PATTERNS = [
    re.compile(r"rm\s+-rf\s+/", re.IGNORECASE),
    re.compile(r"mkfs", re.IGNORECASE),
    re.compile(r"shutdown\s+-h", re.IGNORECASE),
    re.compile(r"reboot", re.IGNORECASE),
]

STRICT_EXTRA_RISK_PATTERNS = [
    re.compile(r"curl\s+[^\n|]*\|\s*(sh|bash)", re.IGNORECASE),
]

PERMISSION_PATTERN = re.compile(
    r"not authorized|errAEEventNotPermitted|errAEAccessDenied|-1743|-10004|assistive devices",
    re.IGNORECASE,
)
SAFE_MODE_OPTIONS = {"strict", "balanced", "off"}


def parse_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return default


def parse_csv_paths(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def clamp_timeout(candidate: int | None, default: int, maximum: int) -> int:
    value = candidate if candidate is not None else default
    if value < 1:
        value = 1
    return min(value, maximum)


def is_path_like(value: str) -> bool:
    return "/" in value or value.startswith(".") or value.startswith("~")


def expand_home(value: str) -> str:
    return str(Path(value).expanduser())


def is_executable_file(path_text: str) -> bool:
    path = Path(path_text).expanduser()
    return path.is_file() and path.exists() and path.stat().st_mode & 0o111 != 0


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def is_binary_file(path_text: str) -> bool:
    path = Path(path_text).expanduser()
    return b"\x00" in path.read_bytes()


def is_subpath(parent: str, target: str) -> bool:
    try:
        parent_path = Path(parent).expanduser().resolve()
        target_path = Path(target).expanduser().resolve()
        target_path.relative_to(parent_path)
        return True
    except Exception:
        return False


def validate_script_path_in_roots(script_path: str, roots: list[str]) -> bool:
    if not roots:
        return False
    for root in roots:
        if is_subpath(root, script_path):
            return True
    return False


def risk_patterns_for_mode(mode: str) -> list[re.Pattern[str]]:
    if mode == "strict":
        return [*CRITICAL_RISK_PATTERNS, *STRICT_EXTRA_RISK_PATTERNS]
    if mode == "balanced":
        return CRITICAL_RISK_PATTERNS
    return []


def scan_risk(mode: str, content: str) -> str | None:
    for pattern in risk_patterns_for_mode(mode):
        if pattern.search(content):
            return pattern.pattern
    return None


def normalize_safe_mode(value: str | None, default: str = "balanced") -> str | None:
    candidate = (value or default).strip().lower()
    if candidate in SAFE_MODE_OPTIONS:
        return candidate
    return None


def to_applescript_literal(value: Any) -> str:
    if value is None:
        return "missing value"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        escaped = (
            value.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
        )
        return f'"{escaped}"'
    if isinstance(value, list):
        return "{" + ", ".join(to_applescript_literal(item) for item in value) + "}"
    if isinstance(value, dict):
        parts = [f"{key}:{to_applescript_literal(item)}" for key, item in value.items()]
        return "{" + ", ".join(parts) + "}"
    return "missing value"


def to_javascript_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, (str, bool, int, float, list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return "null"


def value_to_literal(value: Any, language: str) -> str:
    if language == "javascript":
        return to_javascript_literal(value)
    return to_applescript_literal(value)


def camel_to_snake(value: str) -> str:
    return re.sub(r"([A-Z])", lambda m: "_" + m.group(1).lower(), value)


def substitute_placeholders(
    script: str,
    language: str,
    input_data: dict[str, Any] | None,
    args: list[str] | None,
) -> str:
    rendered = script

    def input_value(raw_key: str) -> Any:
        mapped = camel_to_snake(raw_key)
        if not input_data:
            return None
        if mapped in input_data:
            return input_data[mapped]
        return input_data.get(raw_key)

    def replace_input(match: re.Match[str]) -> str:
        key = match.group(1)
        return value_to_literal(input_value(key), language)

    def replace_arg(match: re.Match[str]) -> str:
        index = int(match.group(1)) - 1
        value = None
        if args and 0 <= index < len(args):
            value = args[index]
        return value_to_literal(value, language)

    def replace_quoted_input(match: re.Match[str]) -> str:
        key = match.group(2)
        return value_to_literal(input_value(key), language)

    def replace_quoted_arg(match: re.Match[str]) -> str:
        index = int(match.group(2)) - 1
        value = args[index] if args and 0 <= index < len(args) else None
        return value_to_literal(value, language)

    rendered = re.sub(
        r"""(["'])--MCP_INPUT:(\w+)\1""",
        replace_quoted_input,
        rendered,
    )
    rendered = re.sub(
        r"""(["'])--MCP_ARG_(\d+)\1""",
        replace_quoted_arg,
        rendered,
    )

    rendered = re.sub(r"--MCP_INPUT:(\w+)", replace_input, rendered)
    rendered = re.sub(r"--MCP_ARG_(\d+)", replace_arg, rendered)

    def replace_input_data(match: re.Match[str]) -> str:
        key = match.group(1)
        return value_to_literal(input_value(key), language)

    rendered = re.sub(r"\$\{inputData\.(\w+)\}", replace_input_data, rendered)

    def replace_arguments(match: re.Match[str]) -> str:
        index = int(match.group(1))
        value = args[index] if args and 0 <= index < len(args) else None
        return value_to_literal(value, language)

    rendered = re.sub(r"\$\{arguments\[(\d+)\]\}", replace_arguments, rendered)

    return rendered


def run_osascript(
    language: str,
    timeout_seconds: int,
    script_content: str | None = None,
    script_path: str | None = None,
    args: list[str] | None = None,
) -> subprocess.CompletedProcess[str]:
    command = ["osascript"]
    if language == "javascript":
        command.extend(["-l", "JavaScript"])

    if script_content is not None:
        command.extend(["-e", script_content])
    elif script_path is not None:
        command.append(str(Path(script_path).expanduser()))
    else:
        raise ValueError("script_content 与 script_path 不能同时为空")

    if args:
        command.extend(args)

    return subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )


def build_success(data: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "data": data, "error": None}


def build_failure(
    code: str,
    message: str,
    *,
    hint: str | None = None,
    retryable: bool = False,
) -> dict[str, Any]:
    error: dict[str, Any] = {
        "code": code,
        "message": message,
        "retryable": retryable,
    }
    if hint:
        error["hint"] = hint
    return {"ok": False, "data": None, "error": error}


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
