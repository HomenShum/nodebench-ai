#!/bin/bash

# Run all model benchmarks for an iteration
# Usage: bash scripts/run-iteration-benchmarks.sh 1 pack

ITERATION=${1:-1}
SUITE=${2:-pack}

echo "=== Running Iteration $ITERATION Benchmarks (Suite: $SUITE) ==="
echo ""

# Run each model sequentially
npx tsx scripts/run-persona-episode-eval.ts --model claude-haiku-4.5 --suite "$SUITE" --pricing cache --out "haiku-45-${SUITE}-iter${ITERATION}"
echo "✅ Haiku 4.5 complete"
echo ""

npx tsx scripts/run-persona-episode-eval.ts --model gemini-3-flash --suite "$SUITE" --pricing cache --out "gemini-3-flash-${SUITE}-iter${ITERATION}"
echo "✅ Gemini 3 Flash complete"
echo ""

npx tsx scripts/run-persona-episode-eval.ts --model gpt-5.2-mini --suite "$SUITE" --pricing cache --out "gpt-5.2-mini-${SUITE}-iter${ITERATION}"
echo "✅ GPT-5.2 Mini complete"
echo ""

npx tsx scripts/run-persona-episode-eval.ts --model gpt-5.2 --suite "$SUITE" --pricing cache --out "gpt-5.2-${SUITE}-iter${ITERATION}"
echo "✅ GPT-5.2 (baseline) complete"
echo ""

echo "=== All benchmarks complete for iteration $ITERATION ==="
