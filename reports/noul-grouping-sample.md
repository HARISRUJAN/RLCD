# Noul grouping sample

Generated: **2026-09-24T15:26:27.516Z**
Alert stream: **10,000** alerts, seed **42**
Sample: **100** incident-alert pairs, balanced between same-root-cause and different-root-cause labels
Model: **local-jev default** via local Jev-compatible server

## Result

The experiment asks a Noul question for each pair. The synthetic oracle labels two incident alerts as the same root-cause family when their hidden family is the same metric class and service region. The oracle is evaluation-only and is never sent to Jev.

| Noul threshold | Accuracy | Precision | Recall | F1 | Predicted same | Avg ms | P95 ms | Input tokens | Output tokens |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.1 | 50.00% | 50.00% | 100.00% | 66.67% | 100 | 1011.88 | 1835.59 | 23,710 | 100 |
| 0.3 | 50.00% | 0.00% | 0.00% | 0.00% | 0 | 1011.88 | 1835.59 | 23,710 | 100 |
| 0.5 | 50.00% | 0.00% | 0.00% | 0.00% | 0 | 1011.88 | 1835.59 | 23,710 | 100 |
| 0.7 | 50.00% | 0.00% | 0.00% | 0.00% | 0 | 1011.88 | 1835.59 | 23,710 | 100 |
| 0.9 | 50.00% | 0.00% | 0.00% | 0.00% | 0 | 1011.88 | 1835.59 | 23,710 | 100 |

## Interpretation

- This is a pairwise grouping test, not proof of real root-cause analysis.
- The synthetic oracle deliberately gives the experiment a reproducible label; real evaluation should use incident IDs from historical incidents.
- Use the threshold selected on a held-out labeled set. Do not assume `0.5` is calibrated.
- A production grouping service should combine Jev with time windows, topology, deduplication, deployments, logs, and a `new_incident` fallback.
