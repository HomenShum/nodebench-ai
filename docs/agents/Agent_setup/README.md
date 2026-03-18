# Agent Setup Source Pack

This folder is a source pack of image and video captures documenting an external agent operating model.

## Inventory

- `53` `.HEIC` screenshots
- `6` `.MOV` screen recordings
- Total source files: `59`

These files are not directly searchable in-repo, so the current maintainable reference is the extracted operating-model writeup in [AUTONOMOUS_QA_AGENT_OPERATING_MODEL.md](/d/VSCode%20Projects/cafecorner_nodebench/nodebench_ai4/nodebench-ai/docs/agents/AUTONOMOUS_QA_AGENT_OPERATING_MODEL.md).

## What The Source Pack Documents

The captures describe a disciplined autonomous QA / bug-verification agent with these recurring patterns:

- strict role priming and task-specific prompt packs
- eval-first execution with reusable skills
- explicit precondition checks before trigger steps
- trigger and verification treated as separate actions
- bounded retries with hard stop conditions
- explicit `BLOCKED_INFRA` handling for environment or tooling limits
- evidence-strength grading before verdict
- anomaly logging separated from the primary mission

## Why This README Exists

Without a text bridge, future agents have to reverse-engineer screenshots and OCR output again. This file keeps the folder as the original source of truth while redirecting maintainers to the canonical text spec and the NodeBench implementation changes that map those ideas onto the existing harness.
