# Setup guide

## Requirements

- Node.js 20 or newer
- npm
- Optional: `uv` or Python 3.10+ for the local Jev-compatible server
- Optional: a TypeSafe API key for hosted runs

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

The model cache is stored under `.hf-cache/`; both it and `local-jev/` are ignored.

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
