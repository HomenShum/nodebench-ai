"""
Generate a local GAIA fixture for the MCP open-dataset benchmark.

GAIA is a gated dataset. This script writes fixtures into the repo's `.cache/`
directory (gitignored) to avoid re-sharing gated content in the repository.

Source: https://huggingface.co/datasets/gaia-benchmark/GAIA
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from huggingface_hub import hf_hub_download


DATASET_ID = "gaia-benchmark/GAIA"
DATASET_PAGE = "https://huggingface.co/datasets/gaia-benchmark/GAIA"


def _parse_int_loose(value: object) -> int:
    if value is None:
        return 0
    match = re.search(r"\d+", str(value))
    if not match:
        return 0
    try:
        return int(match.group(0))
    except ValueError:
        return 0


def _repo_root_from_here(here: Path) -> Path:
    # here = repoRoot/packages/mcp-local/src/__tests__/fixtures
    # go up: fixtures -> __tests__ -> src -> mcp-local -> packages -> repoRoot
    return here.resolve().parents[4]


def _parquet_filename(config: str, split: str) -> str:
    if not split:
        raise ValueError("split is required")

    if config.endswith("_level1"):
        suffix = "metadata.level1.parquet"
    elif config.endswith("_level2"):
        suffix = "metadata.level2.parquet"
    elif config.endswith("_level3"):
        suffix = "metadata.level3.parquet"
    elif config.endswith("_all"):
        suffix = "metadata.parquet"
    else:
        raise ValueError(f"Unsupported GAIA config: {config}")

    year = config.split("_", 1)[0]
    return f"{year}/{split}/{suffix}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="2023_level3")
    parser.add_argument("--split", default="validation")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--min-question-length", type=int, default=400)
    parser.add_argument("--require-file", action="store_true")
    parser.add_argument("--output", default="")

    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if not token:
        raise SystemExit(
            "Missing HF token. Set HF_TOKEN or HUGGINGFACE_HUB_TOKEN before running."
        )

    here = Path(__file__).parent
    repo_root = _repo_root_from_here(here)

    cache_dir = repo_root / ".cache" / "gaia"
    cache_dir.mkdir(parents=True, exist_ok=True)

    output_path = Path(args.output) if args.output else (
        cache_dir / f"gaia_{args.config}_{args.split}.sample.json"
    )

    filename = _parquet_filename(args.config, args.split)
    parquet_path = hf_hub_download(
        repo_id=DATASET_ID,
        repo_type="dataset",
        filename=filename,
        token=token,
    )

    df = pd.read_parquet(parquet_path)
    if "task_id" not in df.columns or "Question" not in df.columns:
        raise SystemExit(f"Unexpected GAIA parquet schema (columns={list(df.columns)})")

    tasks = []
    for _, row in df.iterrows():
        meta = row.get("Annotator Metadata")
        meta = meta if isinstance(meta, dict) else {}

        task_id = str(row.get("task_id") or "").strip()
        question = str(row.get("Question") or "").strip()
        level = str(row.get("Level") or "").strip()
        file_name = str(row.get("file_name") or "").strip()
        file_path = str(row.get("file_path") or "").strip()

        number_of_steps = _parse_int_loose(meta.get("Number of steps"))
        number_of_tools = _parse_int_loose(meta.get("Number of tools"))
        question_length = len(question)

        has_file = bool(file_path)
        ext = Path(file_name).suffix.lower().lstrip(".") if file_name else ""

        complexity_score = (
            question_length
            + number_of_steps * 180
            + number_of_tools * 140
            + (600 if has_file else 0)
        )

        tasks.append(
            {
                "id": task_id,
                "title": f"GAIA {task_id}",
                "prompt": question,
                "level": level,
                "questionLength": question_length,
                "hasFile": has_file,
                "fileName": file_name,
                "filePath": file_path,
                "fileExt": ext,
                "annotator": {
                    "numberOfSteps": number_of_steps,
                    "numberOfTools": number_of_tools,
                },
                "complexityScore": complexity_score,
            }
        )

    total_records = len(tasks)
    candidates = [
        t
        for t in tasks
        if t["questionLength"] >= args.min_question_length
        and (not args.require_file or t["hasFile"])
        and t["id"]
    ]
    candidates.sort(key=lambda t: (-t["complexityScore"], t["id"]))

    selected = candidates[: max(1, int(args.limit))]
    if not selected:
        raise SystemExit(
            f"No GAIA tasks matched filters (minQuestionLength={args.min_question_length}, requireFile={args.require_file})."
        )

    payload = {
        "dataset": DATASET_ID,
        "config": args.config,
        "split": args.split,
        "sourceUrl": DATASET_PAGE,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "selection": {
            "requestedLimit": args.limit,
            "minQuestionLength": args.min_question_length,
            "requireFile": bool(args.require_file),
            "totalRecords": total_records,
            "candidateRecords": len(candidates),
            "parquetFile": filename,
        },
        "tasks": selected,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"[gaia-fixture] wrote {len(selected)} tasks to {output_path}")
    print(
        f"[gaia-fixture] total={total_records}, candidates={len(candidates)}, filters=questionLength>={args.min_question_length}, requireFile={args.require_file}"
    )


if __name__ == "__main__":
    main()
