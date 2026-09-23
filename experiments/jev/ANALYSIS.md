# Jev experiment analysis

## Executive summary

The repository's 10-case support-ticket fixture is a routing smoke test, not a general benchmark. The deterministic mock achieves 100% routing accuracy by construction. The checked-in local-model run also routed all 10 cases correctly, with 105.09 ms average latency, 100.98 ms median latency, and 1,973 total tokens.

Those results support only one narrow conclusion: this implementation can be executed end to end on these examples while producing observable decision and usage fields. They do not establish robustness, calibration, or superiority over another model.

## Research question

Can a typed Jev `Choice` decision route short support tickets to the correct department while exposing confidence, latency, and token usage?

## Hypothesis

Jev should produce a useful department decision for clear support tickets. The local model should provide real usage and latency measurements, while the mock should provide a deterministic regression check. Hosted measurements should be treated separately because network and provider conditions vary.

## Method

| Element | Definition |
|---|---|
| Cases | 10 synthetic support tickets |
| Task | Choose one department: billing, technical, logistics, sales, security, or product |
| Ground truth | Expected department stored with each case in `examples/jev-benchmark.mjs` |
| Request shape | One `Choice` question plus one `Noul` question per case |
| Primary metric | Routing accuracy: correct department / 10 cases |
| System metrics | Average, median, and range of wall-clock latency; input, output, and total tokens |
| Variants | Deterministic mock, local Jev-compatible server, hosted TypeSafe Jev |

The benchmark sends cases sequentially and writes a Markdown report. The median calculation averages the two middle values for an even-sized sample. Mock mode includes an assertion over all expected labels.

## Results

### Local-model run

Source: [`reports/jev-benchmark.md`](../../reports/jev-benchmark.md), generated 2026-09-23.

| Metric | Result |
|---|---:|
| Cases | 10 |
| Routing accuracy | 100.0% |
| Average latency | 105.09 ms |
| Median latency | 100.98 ms |
| Fastest / slowest | 98.80 / 124.47 ms |
| Input tokens | 1,953 |
| Output tokens | 20 |
| Total tokens | 1,973 |

All ten observed decisions match the frozen expected labels. Confidence varies substantially, from 0.17 to 0.93, despite the perfect result on this sample. That gap is a warning against treating confidence as accuracy without calibration data.

### Mock run

Source: [`reports/jev-benchmark.mock.md`](../../reports/jev-benchmark.mock.md).

The mock returns 100.0% accuracy, zero reported tokens, and effectively zero latency. It verifies fixture wiring and report generation only; it is not a model-performance result.

## Interpretation

1. The benchmark has a useful minimum regression signal: labels, request shape, response parsing, report generation, and the SDK path all work together.
2. The local run demonstrates that the Jev-compatible path can solve the selected clear cases while exposing usage metadata.
3. Confidence is not enough to infer correctness. The lowest-confidence local answer was correct, and this sample contains no incorrect decisions with which to test calibration.
4. Latency is a single sequential run, so it should not be used as a service-level target.

## Validity limits

- **Construct validity:** Department routing is narrower than a production support workflow; human escalation is measured but not evaluated as a labeled outcome.
- **Dataset validity:** Ten synthetic cases are too small and too clean to represent real customer language, ambiguity, multilingual input, or adversarial phrasing.
- **Statistical validity:** There are no repeated trials, confidence intervals, bootstrap estimates, or significance tests.
- **Comparison validity:** The mock, local model, and hosted service are different systems. Their results must not be compared without recording model/version/configuration metadata and running the same frozen dataset.
- **Operational validity:** Latency excludes queueing and concurrent load. Token counts depend on the server response and may vary with provider implementation.

## Upgrade path for a publishable evaluation

1. Freeze a larger labeled dataset and publish its schema and labeling rules.
2. Add ambiguous, out-of-scope, multilingual, and adversarial cases.
3. Run each system repeatedly with pinned model and SDK versions.
4. Report macro accuracy, per-class precision/recall, confusion matrix, abstention or human-routing quality, latency percentiles, and cost.
5. Evaluate confidence calibration and pre-register the decision thresholds.
6. Record hardware, operating system, model cache state, server flags, API region, and timestamp for every run.
