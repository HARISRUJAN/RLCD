# 10 service-health alert comparison — Laya

Alerts: **10**
Seed: **42**
Incident rate: **20.00%**
Generated: **2026-09-24T15:25:14.026Z**

The same deterministic service-health alert stream, Noul question, threshold, and labels are used by the Jev report. Laya runs the cases in batches.

## Comparison

| Provider | Accuracy | Precision | Recall | F1 | Batch ms | Amortized ms/alert | Input tokens | Output tokens | Total tokens | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Laya (typed-decisions) | 80.00% | 0.00% | 0.00% | 0.00% | 255.99 | 25.60 | 793 | 0 | 793 | $0.000000 |

## Configuration

- Laya model: `convaiinnovations/laya:typed-decisions`
- Device: `mps`
- Batch size: `32`
- Incident threshold: `0.5`

## Limits

The generated labels are rule-based ground truth, not human labels. Laya reports zero output tokens because it is a non-autoregressive typed-decision model. Batch timing is not directly equivalent to Jev per-request latency.
