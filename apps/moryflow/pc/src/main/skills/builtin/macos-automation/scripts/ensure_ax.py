#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import platform
import stat
import tempfile
import urllib.request
from pathlib import Path

from _shared import (
    build_failure,
    build_success,
    command_exists,
    expand_home,
    is_executable_file,
    is_path_like,
    parse_bool,
    print_json,
)

DEFAULT_TIMEOUT_SECONDS = 15
DEFAULT_CACHE_DIR = "~/.cache/macos-automation-skill/bin"


def build_download_url(template: str) -> str:
    return (
        template.replace("{platform}", platform.system().lower())
        .replace("{arch}", platform.machine().lower())
    )


def resolve_ax_binary(configured: str) -> str | None:
    configured = configured.strip()
    if not configured:
        return None

    if is_path_like(configured):
        expanded = expand_home(configured)
        return expanded if is_executable_file(expanded) else None

    if command_exists(configured):
        return configured

    return None


def normalize_sha256(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip().lower()
    if len(candidate) != 64:
        return None
    if any(ch not in "0123456789abcdef" for ch in candidate):
        return None
    return candidate


def calculate_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def download_ax_binary(
    download_url_template: str,
    cache_dir: str,
    timeout_seconds: int,
    expected_sha256: str | None,
) -> tuple[str | None, str]:
    if platform.system().lower() != "darwin":
        return None, "当前平台不是 macOS，跳过自动下载"

    resolved_cache_dir = Path(expand_home(cache_dir))
    resolved_cache_dir.mkdir(parents=True, exist_ok=True)

    target_name = f"ax-{platform.system().lower()}-{platform.machine().lower()}"
    target_path = resolved_cache_dir / target_name
    if is_executable_file(str(target_path)):
        return str(target_path), "命中本地缓存的 AX 可执行文件"

    download_url = build_download_url(download_url_template)

    try:
        request = urllib.request.Request(
            download_url,
            headers={"User-Agent": "macos-automation-skill/1.0.0"},
        )
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            content = response.read()

        actual_sha256 = calculate_sha256(content)
        if expected_sha256 and actual_sha256 != expected_sha256:
            return (
                None,
                f"AX 下载内容校验失败，期望 SHA256={expected_sha256}，实际 SHA256={actual_sha256}",
            )

        with tempfile.NamedTemporaryFile(delete=False, dir=resolved_cache_dir) as temp_file:
            temp_file.write(content)
            temp_path = Path(temp_file.name)

        current_mode = temp_path.stat().st_mode
        temp_path.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        temp_path.replace(target_path)
        return str(target_path), f"AX 已自动下载到 {target_path}"
    except Exception as error:
        return None, f"AX 自动下载失败: {error}"


def ensure_ax_binary(
    *,
    ax_binary_path: str,
    auto_install: bool,
    download_url_template: str | None,
    download_sha256: str | None,
    cache_dir: str,
    timeout_seconds: int,
) -> dict:
    normalized_sha256 = normalize_sha256(download_sha256)
    if download_sha256 and not normalized_sha256:
        return build_failure(
            "INVALID_INPUT",
            "MACOS_KIT_AX_DOWNLOAD_SHA256 不是合法的 SHA256 值",
            hint="请提供 64 位十六进制字符串",
            retryable=False,
        )

    resolved = resolve_ax_binary(ax_binary_path)
    if resolved:
        return build_success(
            {
                "binary_path": resolved,
                "installed": False,
                "message": "已找到 AX 可执行文件",
            }
        )

    if not auto_install:
        return build_failure(
            "DEPENDENCY_MISSING",
            "未找到 AX 可执行文件",
            hint="请先安装 ax，或启用自动下载",
            retryable=False,
        )

    if not download_url_template:
        return build_failure(
            "DEPENDENCY_MISSING",
            "未找到 AX 可执行文件",
            hint="请配置 MACOS_KIT_AX_DOWNLOAD_URL，或手动安装 ax",
            retryable=False,
        )

    if not normalized_sha256:
        return build_failure(
            "INVALID_INPUT",
            "MACOS_KIT_AX_DOWNLOAD_SHA256 不能为空",
            hint="自动下载 AX 时必须提供 SHA256 校验值",
            retryable=False,
        )

    downloaded_path, message = download_ax_binary(
        download_url_template=download_url_template,
        cache_dir=cache_dir,
        timeout_seconds=timeout_seconds,
        expected_sha256=normalized_sha256,
    )
    if not downloaded_path:
        return build_failure(
            "DEPENDENCY_MISSING",
            "未找到 AX 可执行文件",
            hint=message,
            retryable=False,
        )

    return build_success(
        {
            "binary_path": downloaded_path,
            "installed": True,
            "message": message,
        }
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查并按需自动安装 AX 可执行文件")
    parser.add_argument(
        "--ax-binary-path",
        default=os.getenv("MACOS_KIT_AX_BINARY_PATH", "ax"),
        help="AX 可执行文件路径或命令名",
    )
    parser.add_argument(
        "--ax-auto-install",
        default=os.getenv("MACOS_KIT_AX_AUTO_INSTALL", "true"),
        help="是否启用自动下载（true/false）",
    )
    parser.add_argument(
        "--ax-download-url",
        default=os.getenv("MACOS_KIT_AX_DOWNLOAD_URL", ""),
        help="下载地址模板，可使用 {platform} 与 {arch} 占位符",
    )
    parser.add_argument(
        "--ax-cache-dir",
        default=os.getenv("MACOS_KIT_AX_CACHE_DIR", DEFAULT_CACHE_DIR),
        help="AX 缓存目录",
    )
    parser.add_argument(
        "--ax-download-sha256",
        default=os.getenv("MACOS_KIT_AX_DOWNLOAD_SHA256", ""),
        help="AX 下载内容的 SHA256 校验值（可选）",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help="下载超时（秒）",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = ensure_ax_binary(
        ax_binary_path=args.ax_binary_path,
        auto_install=parse_bool(args.ax_auto_install, default=True),
        download_url_template=args.ax_download_url.strip() or None,
        download_sha256=args.ax_download_sha256.strip() or None,
        cache_dir=args.ax_cache_dir,
        timeout_seconds=max(1, args.timeout_seconds),
    )
    print_json(result)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
