# Jev benchmark report

Mode: **local-jev**
Cases: **10**
Generated: **2026-09-23T16:32:56.736Z**

The benchmark sends one request per use case with one Choice and one Noul question. Expected labels are the ground truth for routing accuracy.
Latency is measured around the local SDK call. Token counts come from the local server response.

## Results

| Use case | Expected | Decision | Correct | Confidence | Latency (ms) | Input tokens | Output tokens | Total tokens |
|---|---|---|:---:|---:|---:|---:|---:|---:|
| double-charge | billing | billing | yes | 0.17 | 122.71 | 189 | 2 | 191 |
| login-bug | technical | technical | yes | 0.68 | 103.47 | 203 | 2 | 205 |
| refund-request | billing | billing | yes | 0.37 | 124.47 | 196 | 2 | 198 |
| shipping-delay | logistics | logistics | yes | 0.91 | 100.07 | 196 | 2 | 198 |
| password-reset | technical | technical | yes | 0.27 | 100.9 | 196 | 2 | 198 |
| sales-lead | sales | sales | yes | 0.93 | 98.8 | 189 | 2 | 191 |
| security-incident | security | security | yes | 0.93 | 100.98 | 210 | 2 | 212 |
| feature-request | product | product | yes | 0.93 | 101.1 | 182 | 2 | 184 |
| cancellation | billing | billing | yes | 0.33 | 99.41 | 196 | 2 | 198 |
| order-status | logistics | logistics | yes | 0.60 | 99.01 | 196 | 2 | 198 |

## Comparison

| Metric | Value |
|---|---:|
| Routing accuracy | 100.0% |
| Average latency | 105.09 ms |
| Median latency | 100.98 ms |
| Fastest / slowest | 98.80 / 124.47 ms |
| Total input tokens | 1953 |
| Total output tokens | 20 |
| Total tokens | 1973 |

> These are local model measurements, not TypeSafe-hosted Jev results; repeat the benchmark for a stable baseline.
