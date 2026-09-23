# Jev decision experiment

A small, reproducible experiment for testing typed Jev decisions on support-ticket routing.

The benchmark asks one `Choice` question— which department should handle a ticket?—and one `Noul` question about human escalation. It records correctness, confidence, latency, and token usage for each case.

This is an exploratory teaching benchmark, not a claim of general model performance.

## Results at a glance

The checked-in local run routed all 10 cases correctly:

| Variant | Cases | Accuracy | Average latency | Total tokens |
|---|---:|---:|---:|---:|
| Mock fixture | 10 | 100.0% | ~0 ms | 0 |
| Local Jev run | 10 | 100.0% | 105.09 ms | 1,973 |

The sample is intentionally small and synthetic. See [`experiments/jev/ANALYSIS.md`](experiments/jev/ANALYSIS.md) for interpretation and validity limits.

## Quick start

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run benchmark:mock
```

The mock run requires no credentials, model download, or network service. It writes `reports/jev-benchmark.mock.md`.

For hosted or local-model runs, follow [`SETUP.md`](SETUP.md).

## Repository layout

| Path | Purpose |
|---|---|
| `examples/jev-benchmark.mjs` | Labeled routing benchmark and report generator |
| `examples/jev-kb.mjs` | Retrieval plus grounded-answer companion demo |
| `experiments/jev/README.md` | Protocol, hypothesis, and reproduction commands |
| `experiments/jev/ANALYSIS.md` | Results, interpretation, and upgrade path |
| `reports/` | Checked-in example outputs |
| `SETUP.md` | Installation, local model setup, and troubleshooting |

## Experiment protocol

- 10 synthetic support tickets with frozen expected departments.
- One sequential SDK request per case.
- Variants: deterministic mock, local Jev-compatible server, hosted TypeSafe Jev.
- Primary metric: routing accuracy.
- Secondary metrics: confidence, wall-clock latency, input tokens, output tokens, and total tokens.
- Mock mode asserts that every fixture prediction matches its expected label.

## Reproducibility

Do not commit API keys, virtual environments, model weights, or caches. Hosted runs can incur cost and include network latency. Before publishing a new report, record the model, SDK version, hardware, configuration, timestamp, and dataset revision.

## Limitations

The benchmark has no repeated trials, confidence intervals, calibration analysis, adversarial cases, multilingual cases, or production traffic. A larger evaluation should use a frozen labeled dataset, per-class metrics, a confusion matrix, latency percentiles, cost, and human-escalation quality.
