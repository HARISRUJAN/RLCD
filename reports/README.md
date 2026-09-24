# Experiment report index

This repository contains separate experiments, not one combined leaderboard. Each experiment answers a different question and has its own dataset size, control, metric, and validity limits.

## Experiment map

| ID | Question | Run | Evidence |
|---|---|---|---|
| E0 | Does the benchmark wiring and report generation work without a model? | `npm run benchmark:mock` | [Mock routing report](jev-benchmark.mock.md) |
| E1 | Can typed Jev decisions route short support tickets? | `npm run local:benchmark` | [Local routing report](jev-benchmark.md), [protocol](../experiments/jev/README.md) |
| E2 | How do local Jev and Ollama behave on the same 10-alert stream? | `ALERT_COUNT=10 npm run alerts:jev` and `ALERT_COUNT=10 npm run alerts:ollama` | [Jev report](alert-10-jev.md), [Ollama report](alert-10-ollama.md) |
| E3 | What happens when local Jev is run on 100 alerts with a lower threshold? | `ALERT_COUNT=100 INCIDENT_THRESHOLD=0.1 npm run alerts:jev` | [100-alert report](alert-100-jev.md) |
| E4 | What happens at 10,000 alerts, and what would a hosted run cost? | `ALERT_COUNT=10000 npm run alerts:jev` and `npm run alerts:estimate` | [Local Jev](alert-10000-jev.md), [cost estimate](alert-10000-estimate.md) |
| E5 | Is a Noul threshold calibrated for pairwise incident grouping? | `npm run alerts:noul-group` | [Threshold sweep](noul-grouping-sample.md) |
| E6 | Can Jev act as a conservative, auditable incident-memory layer? | `npm run alerts:memory` | [Decision report](incident-memory-local-jev.md), [audit ledger](incident-memory-audit.json) |
| E7 | How does the installed Laya typed-decisions model behave on the exact Jev alert stream? | `ALERT_COUNT=10000 npm run alerts:laya` | [10-alert report](alert-10-laya.md), [10k report](alert-10000-laya.md) |

## What each experiment establishes

### E0 — Pipeline verification

The mock run is a regression check for fixture loading, request construction, response parsing, metrics, and report writing. Its 100% score is expected by construction and is not model evidence.

### E1 — Typed support-ticket routing

The local Jev-compatible server routed all 10 synthetic support tickets correctly and returned confidence, latency, and token usage. The sample is too small and too clean to establish robustness or calibration.

### E2 — Small alert comparison

This is the only direct 10-alert comparison between local Jev and the installed Ollama models. The results are smoke tests: one short stream, one run, and substantial latency differences. They should not be treated as a model ranking.

### E3 — 100-alert threshold sanity check

The lower threshold increased positive predictions but produced a majority-class-shaped result: 100% recall and 9% precision on the frozen synthetic stream. This is evidence that threshold choice changes behavior; it is not threshold calibration.

### E4 — Scale and cost accounting

The 10,000-alert local run shows that high accuracy can coexist with zero positive predictions when incidents are a minority class. The hosted GPT-5.6 Luna row is a token and price estimate only; it was not a live model run.

### E5 — Noul threshold sweep

The balanced pair sample shows that `0.5` is not automatically calibrated: the local model predicted no positive pairs at thresholds `0.5`, `0.7`, and `0.9`, while `0.1` predicted every pair. Real thresholds require held-out, operator-confirmed incident labels.

### E6 — Auditable incident memory

This is the repository’s main workflow experiment. Deterministic rules produce a small candidate set; Jev scores each candidate; an application policy uses both score and margin; uncertain cases remain reviewable; and every decision is recorded. On the default 500-alert run, candidate recall was 100% for the 11 warm-start cases, while the conservative policy made zero automatic merges. The lower-threshold shadow run is exploratory and not held-out validation.

### E7 — Laya comparison

Laya matched local Jev’s 88.42% accuracy on the 10,000-alert stream and predicted zero incidents at the default `0.5` threshold. Its typed-decisions model used 797,756 input tokens and 144.2 seconds total on MPS with batch size 128; this batch timing is not directly comparable to Jev’s per-request latency.

## Evidence rules

- **Measured:** a checked-in report produced by a model or local server run.
- **Mock:** a deterministic wiring check, not model performance.
- **Estimate:** token and cost arithmetic without a live provider call.
- **Synthetic oracle:** a reproducible label used to test code paths; it is not a human-confirmed root cause.

Do not combine the metrics across experiments. A publishable evaluation needs a frozen, human-labeled dataset, repeated runs, pinned model versions, held-out threshold selection, confidence intervals, false-merge analysis, and review outcomes.
