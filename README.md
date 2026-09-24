<div align="center">

# RLCD

### Typed decisions for alert routing and incident grouping

Reproducible experiments comparing **local Jev**, **Laya**, **Ollama models**, and a **GPT-5.6 Luna estimate** on a deterministic service-health alert stream.

<p>
  <a href="JEV_CHEATSHEET.md"><strong>Read the Jev cheatsheet</strong></a> ·
  <a href="ARTICLE_DRAFT.md"><strong>Read the article draft</strong></a> ·
  <a href="SETUP.md"><strong>Setup guide</strong></a> ·
  <a href="reports/README.md"><strong>Experiment reports</strong></a>
</p>

<img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
<img alt="Jev and Laya typed decisions" src="https://img.shields.io/badge/Jev%20%2B%20Laya-typed%20decisions-5B4BDB">
<img alt="Ollama local models" src="https://img.shields.io/badge/Ollama-local%20models-111111?logo=ollama&logoColor=white">
<img alt="Status experimental" src="https://img.shields.io/badge/status-experimental-F59E0B">

</div>

> **Current call:** keep hard service-health alarms deterministic. Use Jev as a second-stage semantic layer for ambiguous grouping, routing, severity, and human-review decisions.

## Why this repository exists

Jev is a decision model/service: send **state + a typed question**, receive a structured answer, and let application code decide what happens next. It is not an alerting system or a general chat framework.

This repository tests that pattern against the same generated data and records accuracy, precision, recall, F1, latency, token usage, and cost.

<table>
<tr>
<td width="50%" valign="top">

### 01 · Same data

10,000 deterministic service-health alerts with fixed seed `42`, metric ranges, service metadata, and reproducible labels.

</td>
<td width="50%" valign="top">

### 02 · Typed decisions

Jev `Noul`, `Choice`, and `Score` questions instead of unconstrained text generation.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 03 · Local-first

Run `local-jev` and Ollama locally. No API cost for local inference.

</td>
<td width="50%" valign="top">

### 04 · Honest reports

Checked-in reports expose thresholds, sample sizes, latency, tokens, costs, and limitations.

</td>
</tr>
</table>

## Results at a glance

The 10-alert rows are directly comparable. The 10,000-alert rows show scale and are labeled separately. All measured rows use seed `42`.

| Run | Classifier | Accuracy | Precision | Recall | F1 | Avg latency | Total tokens | Cost | Status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 10 alerts | [Local Jev](reports/alert-10-jev.md) | 80.00% | 0.00% | 0.00% | 0.00% | 72 ms | 446 | $0 | Measured |
| 10 alerts | [Gemma 3 4B](reports/alert-10-ollama.md) | 20.00% | 20.00% | 100.00% | 33.33% | 1,128 ms | 1,066 | $0 | Measured |
| 10 alerts | [TinyLlama](reports/alert-10-ollama.md) | 80.00% | 0.00% | 0.00% | 0.00% | 319 ms | 1,278 | $0 | Measured |
| 10 alerts | [Qwen3 4B AgentCoder](reports/alert-10-ollama.md) | 90.00% | 66.67% | 100.00% | 80.00% | 18,241 ms | 4,986 | $0 | Measured |
| 10 alerts | [Laya typed-decisions](reports/alert-10-laya.md) | 80.00% | 0.00% | 0.00% | 0.00% | 256 ms batch | 793 | $0 | Measured |
| 10,000 alerts | [Local Jev](reports/alert-10000-jev.md) | 88.42% | 0.00% | 0.00% | 0.00% | 683 ms | 434,299 | $0 | Measured |
| 10,000 alerts | [Laya typed-decisions](reports/alert-10000-laya.md) | 88.42% | 0.00% | 0.00% | 0.00% | 14.00 ms/alert batch | 796,756 | $0 | Measured |
| 10,000 alerts | GPT-5.6 Luna | — | — | — | — | — | 837,761 | $0.247552 | Estimate; not run |

### What the numbers mean

- **Local Jev:** fast, but missed every synthetic incident at the default Noul threshold `0.5`.
- **Laya:** matched Jev's 10k accuracy and also missed every synthetic incident at threshold `0.5`; its 10k timing is 140.0 seconds total / 14.00 ms per alert with MPS batching.
- **Qwen3:** strongest 10-alert smoke result at 90% accuracy, but roughly 18.2 seconds per alert locally.
- **GPT-5.6 Luna:** token and cost estimate only; no live API call has been made.
- **Synthetic labels:** useful for wiring and regression checks, not proof of production quality.

## Jev vs Laya — same 10,000 alerts

🟩 winner · 🟨 tie · ⬜ not directly comparable

| Metric | Jev | Laya | Result |
|---|---:|---:|:---:|
| Accuracy | 88.42% | 88.42% | 🟨 Tie |
| Precision | 0.00% | 0.00% | 🟨 Tie |
| Recall | 0.00% | 0.00% | 🟨 Tie |
| F1 | 0.00% | 0.00% | 🟨 Tie |
| Total tokens | **434,299** | 796,756 | 🟩 Jev* |
| Cost | $0 | $0 | 🟨 Tie |
| Latency | 682.99 ms/request | 14.00 ms/alert batched | ⬜ N/A† |

*Token totals use different provider accounting and are directional only. Jev latency is per request at concurrency 20; Laya latency is amortized MPS batch time, so it is not an apples-to-apples winner.

## Experiment map

The reports are organized as separate experiments rather than one leaderboard. Start with the [experiment report index](reports/README.md) for the question, command, evidence, and limits behind each result.

| ID | Experiment | Main report |
|---|---|---|
| E0 | Mock pipeline verification | [Mock routing](reports/jev-benchmark.mock.md) |
| E1 | Typed support-ticket routing | [Local Jev routing](reports/jev-benchmark.md) |
| E2 | 10-alert Jev and Ollama smoke comparison | [Jev](reports/alert-10-jev.md) · [Ollama](reports/alert-10-ollama.md) |
| E3 | 100-alert threshold sanity check | [100-alert Jev](reports/alert-100-jev.md) |
| E4 | 10k scale and hosted cost estimate | [10k Jev](reports/alert-10000-jev.md) · [Estimate](reports/alert-10000-estimate.md) |
| E5 | Noul threshold sweep for grouping | [Grouping sample](reports/noul-grouping-sample.md) |
| E6 | Auditable incident memory with abstention | [Decision report](reports/incident-memory-local-jev.md) · [Audit ledger](reports/incident-memory-audit.json) |
| E7 | Same alert stream through Laya | [10-alert Laya](reports/alert-10-laya.md) · [10k Laya](reports/alert-10000-laya.md) |

## Quick start

```sh
npm install
npm run benchmark:mock
```

The mock benchmark needs no credentials or model downloads. It writes `reports/jev-benchmark.mock.md`.

For the complete environment setup, see [`SETUP.md`](SETUP.md). For a beginner-friendly explanation of Jev, see [`JEV_CHEATSHEET.md`](JEV_CHEATSHEET.md).

## Run the local Jev comparison

The local server is the [`local-jev`](https://github.com/amithgc/local-jev) Jev-compatible server, not the hosted TypeSafe service.

Start the server, then run the 10,000-alert comparison:

```sh
TYPESAFE_BASE_URL=http://127.0.0.1:8765 \
TYPESAFE_API_KEY=local \
ALERT_COUNT=10000 \
ALERT_CONCURRENCY=20 \
npm run alerts:jev
```

### Noul grouping sample

This samples 100 balanced alert pairs from the same 10,000-alert stream and asks whether each pair belongs to the same synthetic root-cause family.

```sh
GROUP_SAMPLE_PAIRS=100 \
ALERT_CONCURRENCY=4 \
TYPESAFE_BASE_URL=http://127.0.0.1:8765 \
TYPESAFE_API_KEY=local \
npm run alerts:noul-group
```

See the [Noul grouping report](reports/noul-grouping-sample.md). It validates the integration path, not real root-cause quality; historical incidents with known incident IDs are needed for that.

### How the Noul threshold works

`answer.noul` is a probability of **yes**. Your code turns it into a decision with `probability >= threshold`. A lower threshold finds more matches but risks false merges; a higher threshold reduces false merges but fragments incidents. The threshold must be calibrated on labeled incidents—`0.5` is not automatically correct. In this experiment, `0.5` grouped nothing, while `0.1` grouped every sampled pair.

## Auditable incident memory

The next layer is a stateful, reversible workflow rather than a raw classifier. It uses deterministic rules to generate up to three candidate groups, asks Jev a Noul question for each candidate, and auto-merges only when both the score and the margin over the runner-up are high. Otherwise it creates a new group or records a human-review decision.

```sh
MEMORY_ALERT_COUNT=500 \
TYPESAFE_BASE_URL=http://127.0.0.1:8765 \
TYPESAFE_API_KEY=local \
npm run alerts:memory
```

The [incident-memory report](reports/incident-memory-local-jev.md) and [audit ledger](reports/incident-memory-audit.json) record the policy, candidate recall, decisions, scores, margins, latency, and tokens. The conservative run made zero automatic merges because local Jev scores stayed below the merge policy. An exploratory lower-threshold shadow run produced 9 automatic merges, 39 reviews, and 100% precision on 9 synthetic merges; that result is not held-out calibration and is not a production recommendation.

## Run Ollama models

List your local inventory:

```sh
ollama list
```

The checked-in smoke run used:

| Model | Role |
|---|---|
| `gemma3:4b` | Generative classifier |
| `tinyllama:latest` | Generative classifier |
| `brnpistone/Qwen3-4B-AgentCoder-q5-k-m:latest` | Generative classifier |
| `nomic-embed-text:v1.5` | Embeddings; skipped |

Run the smoke comparison:

```sh
ALERT_COUNT=10 ALERT_CONCURRENCY=2 npm run alerts:ollama
```

See the [Ollama smoke report](reports/alert-10-ollama.md). The full 10k local run was not completed because the observed Qwen throughput would take roughly 33 hours at concurrency `2`.

## Run Laya

Laya uses the installed typed-decisions checkpoint and the same alert stream, Noul question, threshold, seed, and evaluation metrics as Jev:

```sh
source /Users/srujanreddy/Projects/laya/.venv/bin/activate
ALERT_COUNT=10 npm run alerts:laya
```

The runner writes `reports/alert-10-laya.md`. Laya is evaluated in batches, so its report gives total batch time and amortized milliseconds per alert instead of per-request Jev latency.

## What Jev question should I use?

| Need | Jev type | Example |
|---|---|---|
| Yes/no probability | **Noul** | “Are these alerts from the same incident?” |
| Finite route or group | **Choice** | “Which incident group fits?” |
| Ordered level | **Score** | “How severe is this: informational, urgent, or critical?” |

Rule of thumb: **Noul = yes/no, Choice = which one, Score = how much on an ordered scale.**

For alert grouping, combine deterministic deduplication, time windows, and service topology first. Give Jev a small candidate set and keep `new_incident` and `human_review` as choices.

## Hosted providers

Start small before running a paid comparison:

```sh
ALERT_COUNT=100 TYPESAFE_API_KEY=... npm run alerts:jev
ALERT_COUNT=100 OPENAI_API_KEY=... npm run alerts:openai
```

Run both against the same stream only after both credentials are configured:

```sh
ALERT_COUNT=100 \
TYPESAFE_API_KEY=... \
OPENAI_API_KEY=... \
npm run alerts:compare
```

Keep keys server-side. For GPT-5.6 Luna, the checked-in estimate is in [`reports/alert-10000-estimate.md`](reports/alert-10000-estimate.md).

## Repository map

| Path | Purpose |
|---|---|
| [`JEV_CHEATSHEET.md`](JEV_CHEATSHEET.md) | One-page Jev and question-type reference |
| [`ARTICLE_DRAFT.md`](ARTICLE_DRAFT.md) | Honest engineering article draft |
| `examples/alert-data.mjs` | Shared deterministic alert generator |
| `examples/alert-10k-compare.mjs` | Jev, OpenAI, Ollama, and mock comparison harness |
| `examples/noul-grouping-sample.mjs` | Pairwise Noul grouping experiment |
| `examples/incident-memory.mjs` | Candidate-based, margin-aware Jev grouping workflow |
| `examples/jev-benchmark.mjs` | Original support-ticket routing benchmark |
| [`reports/README.md`](reports/README.md) | Experiment index and report guide |
| `reports/` | Checked-in experiment outputs |
| [`SETUP.md`](SETUP.md) | Installation and troubleshooting |
| `experiments/jev/` | Protocol and analysis notes |

## Limitations

This is an exploratory teaching benchmark. It does not include repeated trials, confidence intervals, human-labeled root causes, adversarial cases, multilingual data, or production traffic. Before deployment, use a held-out historical dataset and measure false merges, fragmented incidents, false negatives, p95 latency, cost, and human-review rate.

## License

No license has been declared in this experimental repository yet.
