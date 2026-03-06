#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import platform
import subprocess
from typing import Any

from _shared import build_success, parse_bool, print_json
from ensure_ax import ensure_ax_binary

CHECK_TIMEOUT_SECONDS = 5


def probe_osascript() -> tuple[bool, str]:
    try:
        completed = subprocess.run(
            ["osascript", "-e", 'return "ok"'],
            check=False,
            capture_output=True,
            text=True,
            timeout=CHECK_TIMEOUT_SECONDS,
        )
        if completed.returncode == 0:
            return True, "osascript 可用"
        message = (completed.stderr or completed.stdout or "未知错误").strip()
        return False, message
    except Exception as error:
        return False, str(error)


def probe_automation() -> tuple[bool, str]:
    try:
        completed = subprocess.run(
            [
                "osascript",
                "-e",
                'tell application "System Events" to get name of first process whose frontmost is true',
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=CHECK_TIMEOUT_SECONDS,
        )
        if completed.returncode == 0:
            return True, "System Events 自动化访问正常"
        message = (completed.stderr or completed.stdout or "未知错误").strip()
        return (
            False,
            f"{message}。请检查 系统设置 > 隐私与安全性 > 自动化/辅助功能",
        )
    except Exception as error:
        return False, str(error)


def check_environment(
    *,
    prewarm_ax: bool,
    ax_binary_path: str,
    ax_auto_install: bool | str,
    ax_download_url: str,
    ax_download_sha256: str | None,
    ax_cache_dir: str,
) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    is_macos = platform.system().lower() == "darwin"
    checks.append(
        {
            "name": "platform",
            "ok": is_macos,
            "details": "macOS 平台校验通过" if is_macos else "当前不是 macOS，AppleScript/JXA 不可用",
        }
    )

    osascript_ok, osascript_details = probe_osascript()
    checks.append({"name": "osascript", "ok": osascript_ok, "details": osascript_details})

    automation_ok, automation_details = probe_automation()
    checks.append(
        {
            "name": "automation_probe",
            "ok": automation_ok,
            "details": automation_details,
        }
    )

    if prewarm_ax:
        ax_result = ensure_ax_binary(
            ax_binary_path=ax_binary_path,
            auto_install=parse_bool(ax_auto_install, default=True),
            download_url_template=ax_download_url.strip() or None,
            download_sha256=(ax_download_sha256 or "").strip() or None,
            cache_dir=ax_cache_dir,
            timeout_seconds=15,
        )
        if ax_result["ok"]:
            checks.append(
                {
                    "name": "ax_binary",
                    "ok": True,
                    "details": ax_result["data"]["message"],
                }
            )
        else:
            checks.append(
                {
                    "name": "ax_binary",
                    "ok": False,
                    "details": ax_result["error"].get("hint") or ax_result["error"]["message"],
                }
            )
    else:
        checks.append(
            {
                "name": "ax_binary",
                "ok": True,
                "details": "未执行 AX 预热（可通过 --prewarm-ax 启用）",
            }
        )

    all_pass = all(item["ok"] for item in checks)
    return build_success({"all_pass": all_pass, "checks": checks})


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查 macOS 自动化可用性")
    parser.add_argument(
        "--prewarm-ax",
        action="store_true",
        help="启动时预热 AX（二进制不存在时按配置自动下载）",
    )
    parser.add_argument(
        "--ax-binary-path",
        default=os.getenv("MACOS_KIT_AX_BINARY_PATH", "ax"),
        help="AX 可执行文件路径或命令名",
    )
    parser.add_argument(
        "--ax-auto-install",
        default=os.getenv("MACOS_KIT_AX_AUTO_INSTALL", "true"),
        help="是否允许自动下载 AX（true/false）",
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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = check_environment(
        prewarm_ax=args.prewarm_ax,
        ax_binary_path=args.ax_binary_path,
        ax_auto_install=args.ax_auto_install,
        ax_download_url=args.ax_download_url,
        ax_download_sha256=args.ax_download_sha256,
        ax_cache_dir=args.ax_cache_dir,
    )
    print_json(result)
    return 0 if result["data"]["all_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
