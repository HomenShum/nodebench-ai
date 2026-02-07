"""
Generate a local GAIA *capability* fixture for FILE-BACKED tasks with ground-truth answers.

GAIA is a gated dataset. This script writes fixtures and attachments into the repo's
`.cache/gaia` directory (gitignored) to avoid re-sharing gated content in the repository.

This fixture intentionally includes the "Final answer" field (for local scoring),
so it MUST NOT be committed to git. Keep it under `.cache/gaia/`.

It also downloads only the referenced attachment files for the selected tasks and copies
them into:
  .cache/gaia/data/<file_path>
so the capability test can run deterministically offline after the first download.

Source: https://huggingface.co/datasets/gaia-benchmark/GAIA
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
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


def _normalize_tools_str(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="2023_all")
    parser.add_argument("--split", default="validation")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--min-question-length", type=int, default=120)
    parser.add_argument("--max-steps", type=int, default=8)
    parser.add_argument("--min-tools", type=int, default=0)
    parser.add_argument(
        "--file-types",
        default="pdf,xlsx,csv",
        help="Comma-separated list of allowed attachment extensions (no dots).",
    )
    parser.add_argument(
        "--require-tools-regex",
        default="excel|spreadsheet|csv|pdf",
        help="Regex that must match Annotator Metadata.Tools (lowercased).",
    )
    parser.add_argument(
        "--exclude-tools-regex",
        default="web browser|search engine|web|image|audio|video|png|jpg|jpeg|mp3|ppt|powerpoint|zip",
        help="Regex that must NOT match Annotator Metadata.Tools (lowercased).",
    )
    parser.add_argument("--require-question-regex", default="")
    parser.add_argument("--exclude-question-regex", default="")
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
        cache_dir / f"gaia_capability_files_{args.config}_{args.split}.sample.json"
    )

    attachments_root = cache_dir / "data"
    attachments_root.mkdir(parents=True, exist_ok=True)

    allowed_exts = {
        x.strip().lower().lstrip(".")
        for x in str(args.file_types or "").split(",")
        if x.strip()
    }
    if not allowed_exts:
        raise SystemExit("--file-types must include at least one extension")

    filename = _parquet_filename(args.config, args.split)
    parquet_path = hf_hub_download(
        repo_id=DATASET_ID,
        repo_type="dataset",
        filename=filename,
        token=token,
    )

    df = pd.read_parquet(parquet_path)
    required_cols = {"task_id", "Question", "Final answer", "file_path"}
    if not required_cols.issubset(set(df.columns)):
        raise SystemExit(f"Unexpected GAIA parquet schema (columns={list(df.columns)})")

    exclude_re = (
        re.compile(args.exclude_tools_regex, re.IGNORECASE)
        if args.exclude_tools_regex
        else None
    )
    require_re = (
        re.compile(args.require_tools_regex, re.IGNORECASE)
        if args.require_tools_regex
        else None
    )
    require_q_re = (
        re.compile(args.require_question_regex, re.IGNORECASE)
        if args.require_question_regex
        else None
    )
    exclude_q_re = (
        re.compile(args.exclude_question_regex, re.IGNORECASE)
        if args.exclude_question_regex
        else None
    )

    tasks = []
    for _, row in df.iterrows():
        meta = row.get("Annotator Metadata")
        meta = meta if isinstance(meta, dict) else {}

        task_id = str(row.get("task_id") or "").strip()
        question = str(row.get("Question") or "").strip()
        final_answer = str(row.get("Final answer") or "").strip()
        level = str(row.get("Level") or "").strip()
        file_name = str(row.get("file_name") or "").strip()
        file_path = str(row.get("file_path") or "").strip()

        if not task_id or not question or not final_answer or not file_path:
            continue

        ext = Path(file_name or file_path).suffix.lower().lstrip(".")
        if ext not in allowed_exts:
            continue

        question_length = len(question)
        if question_length < int(args.min_question_length):
            continue
        if require_q_re and not require_q_re.search(question):
            continue
        if exclude_q_re and exclude_q_re.search(question):
            continue

        tools_str = _normalize_tools_str(meta.get("Tools"))
        if require_re and not require_re.search(tools_str):
            continue
        if exclude_re and tools_str and exclude_re.search(tools_str):
            continue

        number_of_steps = _parse_int_loose(meta.get("Number of steps"))
        number_of_tools = _parse_int_loose(meta.get("Number of tools"))
        if args.max_steps and number_of_steps > int(args.max_steps):
            continue
        if args.min_tools and number_of_tools < int(args.min_tools):
            continue

        complexity_score = question_length + number_of_steps * 120 + number_of_tools * 140

        tasks.append(
            {
                "id": task_id,
                "prompt": question,
                "expectedAnswer": final_answer,
                "level": level,
                "questionLength": question_length,
                "annotator": {
                    "numberOfSteps": number_of_steps,
                    "numberOfTools": number_of_tools,
                    "tools": tools_str,
                },
                "hasFile": True,
                "fileName": file_name,
                "filePath": file_path,
                "fileExt": ext,
                "complexityScore": complexity_score,
            }
        )

    total_records = len(df.index)
    candidates = tasks
    candidates.sort(key=lambda t: (t["complexityScore"], t["id"]))

    selected = candidates[: max(1, int(args.limit))]
    if not selected:
        raise SystemExit(
            "No GAIA tasks matched filters. Try loosening --exclude-tools-regex or --min-question-length."
        )

    # Download + copy attachments into repo-local cache.
    downloaded = 0
    for t in selected:
        file_path = str(t.get("filePath") or "")
        if not file_path:
            continue
        src = hf_hub_download(
            repo_id=DATASET_ID,
            repo_type="dataset",
            filename=file_path,
            token=token,
        )
        dest = attachments_root / file_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            shutil.copy2(src, dest)
            downloaded += 1

        # Store a stable repo-relative path for the capability harness.
        t["localFilePath"] = str(Path(".cache") / "gaia" / "data" / file_path).replace("\\", "/")

    payload = {
        "dataset": DATASET_ID,
        "config": args.config,
        "split": args.split,
        "sourceUrl": DATASET_PAGE,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "attachmentsRoot": str(Path(".cache") / "gaia" / "data").replace("\\", "/"),
        "selection": {
            "requestedLimit": args.limit,
            "minQuestionLength": args.min_question_length,
            "maxSteps": args.max_steps,
            "minTools": args.min_tools,
            "fileTypes": sorted(list(allowed_exts)),
            "requireToolsRegex": args.require_tools_regex,
            "excludeToolsRegex": args.exclude_tools_regex,
            "requireQuestionRegex": args.require_question_regex,
            "excludeQuestionRegex": args.exclude_question_regex,
            "totalRecords": int(total_records),
            "candidateRecords": int(len(candidates)),
            "parquetFile": filename,
            "downloadedAttachments": downloaded,
        },
        "tasks": selected,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"[gaia-capability-files-fixture] wrote {len(selected)} tasks to {output_path}")
    print(
        f"[gaia-capability-files-fixture] downloaded={downloaded} attachments into {attachments_root}"
    )


if __name__ == "__main__":
    main()

