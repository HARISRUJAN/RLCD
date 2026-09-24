# 10,000 microcontroller alert comparison — Laya

Alerts: **10,000**
Seed: **42**
Incident rate: **11.58%**
Generated: **2026-09-24T14:42:38.637Z**

The same deterministic alert stream, Noul question, threshold, and labels are used by the Jev report. Laya runs the cases in batches.

## Comparison

| Provider | Accuracy | Precision | Recall | F1 | Batch ms | Amortized ms/alert | Input tokens | Output tokens | Total tokens | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Laya (typed-decisions) | 88.42% | 0.00% | 0.00% | 0.00% | 144242.97 | 14.42 | 797,756 | 0 | 797,756 | $0.000000 |

## Configuration

- Laya model: `convaiinnovations/laya:typed-decisions`
- Device: `mps`
- Batch size: `128`
- Incident threshold: `0.5`

## Limits

The generated labels are rule-based ground truth, not human labels. Laya reports zero output tokens because it is a non-autoregressive typed-decision model. Batch timing is not directly equivalent to Jev per-request latency.
