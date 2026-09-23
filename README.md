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

## What Jev is

Jev is TypeSafe AI's hosted System One decision model/service: you send state and typed questions, and it returns structured answers. `@typesafe-ai/sdk` is the client library. Jev is not Ollama and is not a general application framework; this repository uses the SDK to compare Jev with local Ollama models and GPT-5.6 Luna.

## Single comparison table

All measured rows use seed `42` and the same generated alert format. The 10-alert rows are directly comparable; the 10,000-alert rows show scale and are labeled separately.

| Run | Classifier | Accuracy | Precision | Recall | F1 | Avg latency | P95 latency | Total tokens | Cost | Status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10 alerts | [Local Jev](reports/alert-10-jev.md) | 80.00% | 0.00% | 0.00% | 0.00% | 72 ms | 106 ms | 446 | $0 | Measured |
| 10 alerts | [Gemma 3 4B](reports/alert-10-ollama.md) | 50.00% | 28.57% | 100.00% | 44.44% | 3,612 ms | 15,839 ms | 1,060 | $0 | Measured |
| 10 alerts | [TinyLlama](reports/alert-10-ollama.md) | 20.00% | 20.00% | 100.00% | 33.33% | 2,682 ms | 12,873 ms | 1,244 | $0 | Measured |
| 10 alerts | [Qwen3 4B AgentCoder](reports/alert-10-ollama.md) | 100.00% | 100.00% | 100.00% | 100.00% | 23,554 ms | 34,826 ms | 6,315 | $0 | Measured |
| 10,000 alerts | [Local Jev](reports/alert-10000-jev.md) | 88.42% | 0.00% | 0.00% | 0.00% | 660 ms | 721 ms | 443,694 | $0 | Measured |
| 10,000 alerts | GPT-5.6 Luna | — | — | — | — | — | — | 851,840 | $0.250368 | Estimate; not run |

The local Jev result is fast but misses every incident at threshold `0.5`. Qwen is the strongest 10-alert result but is much slower. GPT-5.6 Luna has only a token/cost estimate until an API key is provided. The generated labels are synthetic rule-based ground truth, not human labels.

## Noul grouping sample

The same 10,000-alert stream was sampled into 100 balanced pairs of incident alerts. Local Jev was asked whether each pair belonged to the same synthetic root-cause family. The [report](reports/noul-grouping-sample.md) shows 50% accuracy at threshold `0.5`, 36% at `0.3`, and 50% at `0.1` because the model predicted every pair as related. This validates the integration path, not real root-cause quality; use historical incidents with known incident IDs for that evaluation.

## Local Jev alert validation

The local server is the `local-jev` compatible server, not the hosted TypeSafe service. Run it first, then use the same deterministic alert stream as the Ollama and OpenAI comparisons:

```sh
TYPESAFE_BASE_URL=http://127.0.0.1:8765 TYPESAFE_API_KEY=local ALERT_COUNT=10000 ALERT_CONCURRENCY=20 npm run alerts:jev
```

The completed 10k run is [`reports/alert-10000-jev.md`](reports/alert-10000-jev.md): 88.42% accuracy, 0% recall at the default Noul threshold `0.5`, 443,694 total tokens, 660.15 ms average latency, and $0 API cost. The 10-alert apples-to-apples report is [`reports/alert-10-jev.md`](reports/alert-10-jev.md). A 100-alert threshold check is [`reports/alert-100-jev.md`](reports/alert-100-jev.md); at `0.1`, recall reached 100% but every alert was predicted as an incident.

## Ollama validation

The current local Ollama inventory contains three generative models and one embedding model. Run the generative models with:

```sh
ALERT_COUNT=10 ALERT_CONCURRENCY=2 npm run alerts:ollama
```

The smoke report is [`reports/alert-10-ollama.md`](reports/alert-10-ollama.md). The 10-alert result was 50% for `gemma3:4b`, 20% for `tinyllama:latest`, and 100% for `brnpistone/Qwen3-4B-AgentCoder-q5-k-m:latest`; the Qwen run averaged about 23.55 seconds per alert. `nomic-embed-text:v1.5` is skipped because it produces embeddings rather than classifications.

This is a wiring and smoke validation, not a completed 10k local inference run. At the observed Qwen latency, 10k alerts with concurrency 2 would take roughly 33 hours. The deterministic 10k rule-based baseline is [`reports/alert-10000-mock.md`](reports/alert-10000-mock.md).

The same harness supports the full deterministic stream, but run cost here means GPU time rather than API spend:

```sh
ALERT_COUNT=10000 ALERT_CONCURRENCY=2 npm run alerts:ollama
```

The 10k GPT-5.6 Luna dry-run estimate is in [`reports/alert-10000-estimate.md`](reports/alert-10000-estimate.md). It uses the standard rates of $0.20 per 1M input tokens and $1.20 per 1M output tokens; live usage is read from the API response.

To run the paid providers, set the required credentials and start with a small count:

```sh
ALERT_COUNT=100 TYPESAFE_API_KEY=... npm run alerts:jev
ALERT_COUNT=100 OPENAI_API_KEY=... npm run alerts:openai
```

Run `npm run alerts:compare` only after both providers are configured; it executes both against the same generated stream.

## Repository layout

| Path | Purpose |
|---|---|
| `examples/jev-benchmark.mjs` | Labeled routing benchmark and report generator |
| `examples/jev-kb.mjs` | Retrieval plus grounded-answer companion demo |
| `examples/alert-data.mjs` | Shared deterministic microcontroller-alert generator |
| `examples/noul-grouping-sample.mjs` | Pairwise Noul grouping sample |
| `experiments/jev/README.md` | Protocol, hypothesis, and reproduction commands |
| `experiments/jev/ANALYSIS.md` | Results, interpretation, and upgrade path |
| `reports/` | Checked-in example outputs |
| `SETUP.md` | Installation, local model setup, and troubleshooting |
| `reports/alert-10000-estimate.md` | 10k GPT-5.6 Luna token/cost estimate |
| `reports/noul-grouping-sample.md` | Noul grouping sample and threshold results |

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
