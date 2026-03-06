#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path
from typing import Any

from _shared import (
    PERMISSION_PATTERN,
    build_failure,
    build_success,
    clamp_timeout,
    is_binary_file,
    normalize_safe_mode,
    parse_bool,
    parse_csv_paths,
    print_json,
    run_osascript,
    scan_risk,
    validate_script_path_in_roots,
)


def execute_script(
    *,
    script_content: str | None = None,
    script_file: str | None = None,
    language: str = "applescript",
    script_args: list[str] | None = None,
    timeout_seconds: int | None = None,
    safe_mode: str | None = None,
    allowed_script_roots: str | list[str] | None = None,
    enable_raw_script: bool | str | None = None,
    default_timeout_seconds: int | None = None,
    max_timeout_seconds: int | None = None,
) -> tuple[dict[str, Any], bool]:
    resolved_safe_mode = normalize_safe_mode(
        safe_mode or os.getenv("MACOS_KIT_SAFE_MODE", "balanced")
    )
    resolved_default_timeout = default_timeout_seconds or int(
        os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")
    )
    resolved_max_timeout = max_timeout_seconds or int(
        os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")
    )

    allow_raw = parse_bool(
        enable_raw_script,
        default=parse_bool(os.getenv("MACOS_KIT_ENABLE_RAW_SCRIPT", "true"), default=True),
    )

    if isinstance(allowed_script_roots, list):
        roots = [item.strip() for item in allowed_script_roots if item.strip()]
    else:
        roots = parse_csv_paths(
            allowed_script_roots
            if isinstance(allowed_script_roots, str)
            else os.getenv("MACOS_KIT_ALLOWED_SCRIPT_ROOTS", "")
        )

    if not allow_raw:
        return (
            build_failure(
                "FEATURE_DISABLED",
                "run_macos_script 未开启",
                hint="设置 MACOS_KIT_ENABLE_RAW_SCRIPT=true 后重试",
                retryable=False,
            ),
            False,
        )

    if not resolved_safe_mode:
        return (
            build_failure(
                "INVALID_INPUT",
                "safe_mode 取值无效",
                hint="仅支持 strict / balanced / off",
                retryable=False,
            ),
            False,
        )

    if (script_content is None and script_file is None) or (
        script_content is not None and script_file is not None
    ):
        return (
            build_failure(
                "INVALID_INPUT",
                "script_content 与 script_file 必须且只能传一个",
                retryable=False,
            ),
            False,
        )

    if language not in {"applescript", "javascript"}:
        return (
            build_failure("INVALID_INPUT", f"不支持的语言: {language}", retryable=False),
            False,
        )

    resolved_script_content = script_content
    resolved_script_file = script_file

    if resolved_script_file:
        try:
            canonical_script_file = str(Path(resolved_script_file).expanduser().resolve())
        except Exception as error:
            return (
                build_failure(
                    "INVALID_INPUT",
                    "脚本路径不可读或不存在",
                    hint=str(error),
                    retryable=False,
                ),
                False,
            )

        if roots and not validate_script_path_in_roots(canonical_script_file, roots):
            return (
                build_failure(
                    "SAFETY_BLOCKED",
                    "脚本路径不在白名单目录内",
                    hint="请配置 MACOS_KIT_ALLOWED_SCRIPT_ROOTS 并确保脚本位于该目录",
                    retryable=False,
                ),
                False,
            )

        try:
            if resolved_safe_mode == "strict" and is_binary_file(canonical_script_file):
                return (
                    build_failure(
                        "SAFETY_BLOCKED",
                        "安全模式不允许执行二进制脚本文件",
                        hint="请改用可读文本脚本，或将 MACOS_KIT_SAFE_MODE 设置为 off",
                        retryable=False,
                    ),
                    False,
                )

            if resolved_script_content is None:
                resolved_script_content = Path(canonical_script_file).read_text(encoding="utf-8")
            resolved_script_file = canonical_script_file
        except Exception as error:
            return (
                build_failure(
                    "INVALID_INPUT",
                    "脚本路径不可读或不存在",
                    hint=str(error),
                    retryable=False,
                ),
                False,
            )

    if resolved_safe_mode != "off" and resolved_script_content:
        hit_pattern = scan_risk(resolved_safe_mode, resolved_script_content)
        if hit_pattern:
            return (
                build_failure(
                    "SAFETY_BLOCKED",
                    "脚本命中高风险策略阻断",
                    hint=f"命中规则: {hit_pattern}",
                    retryable=False,
                ),
                False,
            )

    resolved_timeout = clamp_timeout(
        timeout_seconds,
        default=max(1, resolved_default_timeout),
        maximum=max(1, resolved_max_timeout),
    )

    try:
        completed = run_osascript(
            language=language,
            timeout_seconds=resolved_timeout,
            script_content=resolved_script_content if script_content is not None else None,
            script_path=resolved_script_file if script_content is None else None,
            args=script_args,
        )
    except subprocess.TimeoutExpired:
        return (
            build_failure(
                "EXECUTION_TIMEOUT",
                "脚本执行超时",
                retryable=True,
            ),
            False,
        )
    except Exception as error:
        return (
            build_failure(
                "EXECUTION_FAILED",
                str(error),
                retryable=True,
            ),
            False,
        )

    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()

    if completed.returncode != 0:
        if PERMISSION_PATTERN.search(stderr):
            return (
                build_failure(
                    "PERMISSION_DENIED",
                    "macOS 自动化权限不足",
                    hint="请检查 系统设置 > 隐私与安全性 > 自动化/辅助功能 权限",
                    retryable=False,
                ),
                False,
            )
        return (
            build_failure(
                "EXECUTION_FAILED",
                stderr or "脚本执行失败",
                retryable=True,
            ),
            False,
        )

    return (
        build_success(
            {
                "mode": "content" if script_content is not None else "path",
                "language": language,
                "stdout": stdout,
                "stderr": stderr,
                "timeout_seconds": resolved_timeout,
            }
        ),
        True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="执行 AppleScript/JXA 并应用安全策略")

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--script", help="脚本内容")
    input_group.add_argument("--script-file", help="脚本文件路径")

    parser.add_argument(
        "--language",
        choices=["applescript", "javascript"],
        default="applescript",
        help="脚本语言",
    )
    parser.add_argument("--arg", action="append", default=[], help="传给脚本的参数，可重复")
    parser.add_argument("--timeout-seconds", type=int, default=None, help="执行超时（秒）")
    parser.add_argument(
        "--safe-mode",
        choices=["strict", "balanced", "off"],
        default=os.getenv("MACOS_KIT_SAFE_MODE", "balanced"),
        help="风险策略档位",
    )
    parser.add_argument(
        "--allowed-script-roots",
        default=os.getenv("MACOS_KIT_ALLOWED_SCRIPT_ROOTS", ""),
        help="脚本路径白名单（逗号分隔）",
    )
    parser.add_argument(
        "--enable-raw-script",
        default=os.getenv("MACOS_KIT_ENABLE_RAW_SCRIPT", "true"),
        help="是否允许执行原始脚本（true/false）",
    )
    parser.add_argument(
        "--default-timeout-seconds",
        type=int,
        default=int(os.getenv("MACOS_KIT_DEFAULT_TIMEOUT_SECONDS", "30")),
        help="默认超时",
    )
    parser.add_argument(
        "--max-timeout-seconds",
        type=int,
        default=int(os.getenv("MACOS_KIT_MAX_TIMEOUT_SECONDS", "120")),
        help="最大超时",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result, ok = execute_script(
        script_content=args.script,
        script_file=args.script_file,
        language=args.language,
        script_args=args.arg,
        timeout_seconds=args.timeout_seconds,
        safe_mode=args.safe_mode,
        allowed_script_roots=args.allowed_script_roots,
        enable_raw_script=args.enable_raw_script,
        default_timeout_seconds=args.default_timeout_seconds,
        max_timeout_seconds=args.max_timeout_seconds,
    )
    print_json(result)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
