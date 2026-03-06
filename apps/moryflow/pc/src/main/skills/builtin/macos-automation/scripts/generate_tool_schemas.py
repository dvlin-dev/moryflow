#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from _shared import build_failure, build_success, print_json
from tool_schemas import export_tool_schemas


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成机器可读工具 schema 清单")
    parser.add_argument("--kb-path", default=None, help="知识库目录（默认内置 assets/knowledge-base）")
    parser.add_argument(
        "--output-file",
        default=str(Path(__file__).resolve().parent.parent / "assets" / "tool-schemas.json"),
        help="输出文件路径",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="只校验 schema 文件是否与当前代码一致，不写入文件",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = Path(args.output_file).expanduser().resolve()

    if args.check:
        payload = export_tool_schemas(kb_path=args.kb_path, output_path=None)
        if not output_path.exists():
            print_json(
                build_failure(
                    "NOT_FOUND",
                    f"schema 文件不存在: {output_path}",
                    hint="先运行 generate_tool_schemas.py 生成文件",
                    retryable=False,
                )
            )
            return 1

        try:
            existing = json.loads(output_path.read_text(encoding="utf-8"))
        except Exception as error:
            print_json(
                build_failure(
                    "INVALID_INPUT",
                    f"schema 文件不可读或不是合法 JSON: {error}",
                    retryable=False,
                )
            )
            return 1

        if existing != payload:
            print_json(
                build_failure(
                    "SCHEMA_DRIFT",
                    "tool schema 清单与当前代码不一致",
                    hint="运行 generate_tool_schemas.py 更新 assets/tool-schemas.json",
                    retryable=False,
                )
            )
            return 1

        print_json(
            build_success(
                {
                    "output_file": str(output_path),
                    "tool_count": payload["tool_count"],
                    "up_to_date": True,
                }
            )
        )
        return 0

    payload = export_tool_schemas(kb_path=args.kb_path, output_path=str(output_path))
    print_json(
        build_success(
            {
                "output_file": str(output_path),
                "tool_count": payload["tool_count"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
