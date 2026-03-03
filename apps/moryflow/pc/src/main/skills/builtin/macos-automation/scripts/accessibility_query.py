#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
from pathlib import Path
from typing import Any

from _shared import build_failure, build_success, clamp_timeout, parse_bool, print_json
from ensure_ax import ensure_ax_binary


def parse_payload_json(payload_json: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    try:
        parsed = json.loads(payload_json)
    except json.JSONDecodeError as error:
        return None, build_failure("INVALID_INPUT", f"payload_json 不是合法 JSON: {error}")
    if not isinstance(parsed, dict):
        return None, build_failure("INVALID_INPUT", "payload_json 必须是 JSON 对象")
    return parsed, None


def load_payload_file(payload_file: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    try:
        raw = Path(payload_file).expanduser().read_text(encoding="utf-8")
    except Exception as error:
        return None, build_failure("INVALID_INPUT", f"payload_file 不可读: {error}")
    return parse_payload_json(raw)


def execute_accessibility_query(
    *,
    payload: dict[str, Any],
    timeout_seconds: int | None,
    enable_ax_query: bool | str,
    ax_binary_path: str,
    ax_auto_install: bool | str,
    ax_download_url: str,
    ax_download_sha256: str | None,
    ax_cache_dir: str,
    default_timeout_seconds: int,
    max_timeout_seconds: int,
) -> tuple[dict[str, Any], bool]:
    if not parse_bool(enable_ax_query, default=True):
        return (
            build_failure(
                "FEATURE_DISABLED",
                "accessibility_query 未开启",
                hint="设置 MACOS_KIT_ENABLE_AX_QUERY=true 后重试",
                retryable=False,
            ),
            False,
        )

    if platform.system().lower() != "darwin":
        return (
            build_failure(
                "UNSUPPORTED_PLATFORM",
                "accessibility_query 仅支持 macOS",
                retryable=False,
            ),
            False,
        )

    resolved_timeout = clamp_timeout(
        timeout_seconds,
        default=max(1, default_timeout_seconds),
        maximum=max(1, max_timeout_seconds),
    )

    ensure_result = ensure_ax_binary(
        ax_binary_path=ax_binary_path,
        auto_install=parse_bool(ax_auto_install, default=True),
        download_url_template=ax_download_url.strip() or None,
        download_sha256=(ax_download_sha256 or "").strip() or None,
        cache_dir=ax_cache_dir,
        timeout_seconds=15,
    )
    if not ensure_result["ok"]:
        return ensure_result, False

    binary_path = ensure_result["data"]["binary_path"]

    try:
        completed = subprocess.run(
            [binary_path, json.dumps(payload, ensure_ascii=False)],
            check=False,
            capture_output=True,
            text=True,
            timeout=resolved_timeout,
        )
    except subprocess.TimeoutExpired:
        return (
            build_failure("EXECUTION_TIMEOUT", "AX 查询执行超时", retryable=True),
            False,
        )
    except Exception as error:
        return (build_failure("EXECUTION_FAILED", str(error), retryable=True), False)

    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()

    if completed.returncode != 0:
        return (
            build_failure("EXECUTION_FAILED", stderr or "AX 执行失败", retryable=True),
            False,
        )

    return (
        build_success(
            {
                "stdout": stdout,
                "stderr": stderr,
                "timeout_seconds": resolved_timeout,
                "binary_path": binary_path,
            }
        ),
        True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="执行 accessibility_query")

    payload_group = parser.add_mutually_exclusive_group(required=True)
    payload_group.add_argument("--payload-json", help="AX 查询 payload（JSON 对象）")
    payload_group.add_argument("--payload-file", help="AX 查询 payload 文件路径")

    parser.add_argument("--timeout-seconds", type=int, default=None, help="执行超时")
    parser.add_argument(
        "--enable-ax-query",
        default=os.getenv("MACOS_KIT_ENABLE_AX_QUERY", "true"),
        help="是否启用 accessibility_query",
    )
    parser.add_argument(
        "--ax-binary-path",
        default=os.getenv("MACOS_KIT_AX_BINARY_PATH", "ax"),
        help="AX 可执行文件命令或路径",
    )
    parser.add_argument(
        "--ax-auto-install",
        default=os.getenv("MACOS_KIT_AX_AUTO_INSTALL", "true"),
        help="是否自动下载 AX",
    )
    parser.add_argument(
        "--ax-download-url",
        default=os.getenv("MACOS_KIT_AX_DOWNLOAD_URL", ""),
        help="AX 下载地址模板",
    )
    parser.add_argument(
        "--ax-cache-dir",
        default=os.getenv("MACOS_KIT_AX_CACHE_DIR", "~/.cache/macos-automation-skill/bin"),
        help="AX 缓存目录",
    )
    parser.add_argument(
        "--ax-download-sha256",
        default=os.getenv("MACOS_KIT_AX_DOWNLOAD_SHA256", ""),
        help="AX 下载内容 SHA256（可选）",
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

    if args.payload_json:
        payload, error = parse_payload_json(args.payload_json)
    else:
        payload, error = load_payload_file(args.payload_file)

    if error:
        print_json(error)
        return 1

    result, ok = execute_accessibility_query(
        payload=payload or {},
        timeout_seconds=args.timeout_seconds,
        enable_ax_query=args.enable_ax_query,
        ax_binary_path=args.ax_binary_path,
        ax_auto_install=args.ax_auto_install,
        ax_download_url=args.ax_download_url,
        ax_download_sha256=args.ax_download_sha256,
        ax_cache_dir=args.ax_cache_dir,
        default_timeout_seconds=args.default_timeout_seconds,
        max_timeout_seconds=args.max_timeout_seconds,
    )
    print_json(result)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
