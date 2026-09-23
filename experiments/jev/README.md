# Jev structured decision experiment

Status: reproducible exploratory experiment. The checked-in reports are examples of runs, not a claim about general model performance.

## Question

Can a typed Jev decision with one `Choice` question route short support tickets to the correct department, while keeping latency and token usage observable?

## Hypothesis

For this small, representative ticket set, Jev will produce useful department decisions with measurable confidence, latency, and token usage. A local model run is expected to be slower or less accurate than the deterministic mock; hosted results must be rerun because network latency and model availability vary.

## System under test

- Input: 10 synthetic support tickets.
- Decision: `department`, one of billing, technical, logistics, sales, security, or product.
- Secondary signal: `needs_human`, a `Noul` score.
- Ground truth: the expected department stored beside each case in [`examples/jev-benchmark.mjs`](../../examples/jev-benchmark.mjs).
- Variants: deterministic mock, local `local-jev`, or hosted TypeSafe Jev.

The benchmark makes one request per case. It records routing accuracy, confidence, wall-clock latency, input tokens, output tokens, and total tokens. The mock mode also has an assertion so the repository check fails if its fixture classifier drifts.

## Reproduce

From the repository root:

```sh
npm install
npm run benchmark:mock
```

For a local model, start the local server in one terminal, then run the benchmark in another:

```sh
npm run local
npm run local:benchmark
```

For hosted Jev, provide the key without committing it:

```sh
TYPESAFE_API_KEY=... npm run benchmark
```

The knowledge-base companion demo is:

```sh
npm run local
npm run kb
```

## Results

- [Mock verification](../../reports/jev-benchmark.mock.md)
- [Local model run](../../reports/jev-benchmark.md)

Each run overwrites its corresponding report with a fresh timestamp. Keep a report only when its environment and provenance are recorded in the commit or release notes.

## Interpretation and limits

This is a teaching-sized experiment, not a production evaluation: the dataset is synthetic, the sample is small, there are no repeated trials or confidence intervals, and the mock has no model latency or token cost. The local report is not evidence about hosted Jev. A publishable model comparison should add a frozen labeled dataset, repeated runs, versioned model/configuration metadata, and a prespecified error taxonomy.
