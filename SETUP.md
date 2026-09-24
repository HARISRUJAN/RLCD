# Setup guide

## Requirements

- Node.js 20 or newer
- npm
- Optional: `uv` or Python 3.10+ for the local Jev-compatible server
- Optional: a TypeSafe API key for hosted runs
- Optional: Ollama for local model validation

Check the toolchain:

```sh
node --version
npm --version
python3 --version
```

## Install

```sh
git clone https://github.com/HARISRUJAN/jev-decision-experiment.git
cd jev-decision-experiment
npm install
```

## Run the mock benchmark

```sh
npm run benchmark:mock
```

This is the deterministic repository check. It needs no credentials and writes `reports/jev-benchmark.mock.md`.

## Run hosted Jev

Keep the key in the environment and never commit it:

```sh
TYPESAFE_API_KEY=your-key-here npm run benchmark
```

The command writes `reports/jev-benchmark.md`. Hosted results include network and provider latency and should be repeated before comparison.

## Run local Jev

The optional local server is kept outside Git because model weights and its virtual environment are large. Install it at the repository root:

```sh
git clone https://github.com/amithgc/local-jev local-jev
cd local-jev
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -e .
cd ..
```

Without `uv`:

```sh
python3 -m venv local-jev/.venv
local-jev/.venv/bin/pip install -e local-jev
```

Start the server in terminal 1:

```sh
npm run local
```

The first start downloads `nli-deberta-large` and listens on `http://127.0.0.1:8765`. Run the benchmark in terminal 2:

```sh
npm run local:benchmark
```

Run the retrieval and grounded-answer demo:

```sh
npm run kb
```

Run the 10k alert comparison against the local server:

```sh
TYPESAFE_BASE_URL=http://127.0.0.1:8765 TYPESAFE_API_KEY=local ALERT_COUNT=10000 ALERT_CONCURRENCY=20 npm run alerts:jev
```

The local Jev Noul threshold defaults to `0.5`. A Noul value is the estimated probability of **yes**; your application predicts yes when `value >= threshold`. Lower thresholds increase recall and false positives, while higher thresholds reduce false positives and increase missed matches. Use `INCIDENT_THRESHOLD=0.1` only as a calibration experiment; record the threshold with every report because it changes the precision/recall tradeoff sharply.

Run the pairwise Noul grouping sample against the same 10,000-alert stream:

```sh
GROUP_SAMPLE_PAIRS=100 ALERT_CONCURRENCY=4 TYPESAFE_BASE_URL=http://127.0.0.1:8765 TYPESAFE_API_KEY=local npm run alerts:noul-group
```

The sample uses a hidden synthetic root-cause family only as an evaluation oracle. It is not sent to Jev and does not represent a real causal label.

Run the auditable incident-memory workflow:

```sh
MEMORY_ALERT_COUNT=500 TYPESAFE_BASE_URL=http://127.0.0.1:8765 TYPESAFE_API_KEY=local npm run alerts:memory
```

It writes `reports/incident-memory-local-jev.md` and `reports/incident-memory-audit.json`. The default policy is deliberately conservative: high score plus a margin over the next candidate is required for automatic merging; all other cases become a new incident or human review.

The model cache is stored under `.hf-cache/`; both it and `local-jev/` are ignored.

## Run the installed Ollama models

List local models first:

```sh
ollama list
```

The harness discovers installed models from Ollama and skips embedding models. The inventory used for the checked-in smoke report was:

- `gemma3:4b`
- `tinyllama:latest`
- `brnpistone/Qwen3-4B-AgentCoder-q5-k-m:latest`

It skips `nomic-embed-text:v1.5` because that model creates embeddings and is not an incident classifier.

Run a smoke validation:

```sh
ALERT_COUNT=10 ALERT_CONCURRENCY=2 npm run alerts:ollama
```

Run the full 10,000-alert stream when the observed local throughput is acceptable:

```sh
ALERT_COUNT=10000 ALERT_CONCURRENCY=2 npm run alerts:ollama
```

Set `OLLAMA_MODELS` to choose a subset, and `OLLAMA_URL` for a non-default daemon:

```sh
OLLAMA_MODELS=gemma3:4b ALERT_COUNT=100 npm run alerts:ollama
OLLAMA_URL=http://127.0.0.1:11434 npm run alerts:ollama
```

Ollama reports local prompt/evaluation token counts when available. Its API cost is `$0`; report hardware, model load time, and GPU time separately.

## Compare Jev and GPT-5.6 Luna

Start with 100 alerts before spending on a 10k run:

```sh
ALERT_COUNT=100 TYPESAFE_API_KEY=... npm run alerts:jev
ALERT_COUNT=100 OPENAI_API_KEY=... npm run alerts:openai
```

For the same stream through both providers:

```sh
ALERT_COUNT=100 TYPESAFE_API_KEY=... OPENAI_API_KEY=... npm run alerts:compare
```

Use `ALERT_COUNT=10000` only after checking latency, rate limits, and account spend. Jev pricing is configurable with `JEV_INPUT_PRICE_PER_MTOK` and `JEV_OUTPUT_PRICE_PER_MTOK`; local Jev cost is reported as zero API cost and excludes hardware. GPT-5.6 Luna cost is calculated from returned input/output usage using the rates in the script.

## Development loop

```sh
npm run benchmark:mock
git diff --check
git status --short
```

Review the generated report before committing it. Keep the benchmark cases, expected labels, and report schema versioned together.

## Troubleshooting

### Missing `TYPESAFE_API_KEY`

Use `npm run benchmark:mock`, or set a real key for hosted Jev.

### `local-jev` executable not found

Install the optional server from the commands above, then confirm:

```sh
ls -l local-jev/.venv/bin/local-jev
```

### Port `8765` is unavailable

Stop the process using the port, or start local Jev on another port and run:

```sh
TYPESAFE_BASE_URL=http://127.0.0.1:8876 TYPESAFE_API_KEY=local npm run benchmark
```

### Model download or memory failure

Use the smaller `nli-deberta-large` model, or use mock mode. Larger local models require more disk and memory.
