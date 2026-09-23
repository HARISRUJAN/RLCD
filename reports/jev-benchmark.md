# Jev benchmark report

Mode: **local-jev**
Cases: **10**
Generated: **2026-09-23T17:19:12.135Z**

The benchmark sends one request per use case with one Choice and one Noul question. Expected labels are the ground truth for routing accuracy.
Latency is measured around the local SDK call. Token counts come from the local server response.

## Results

| Use case | Expected | Decision | Correct | Confidence | Latency (ms) | Input tokens | Output tokens | Total tokens |
|---|---|---|:---:|---:|---:|---:|---:|---:|
| double-charge | billing | billing | yes | 0.17 | 2461.42 | 189 | 2 | 191 |
| login-bug | technical | technical | yes | 0.68 | 108.97 | 203 | 2 | 205 |
| refund-request | billing | billing | yes | 0.37 | 107.9 | 196 | 2 | 198 |
| shipping-delay | logistics | logistics | yes | 0.91 | 101.94 | 196 | 2 | 198 |
| password-reset | technical | technical | yes | 0.27 | 99.84 | 196 | 2 | 198 |
| sales-lead | sales | sales | yes | 0.93 | 99.09 | 189 | 2 | 191 |
| security-incident | security | security | yes | 0.93 | 105.23 | 210 | 2 | 212 |
| feature-request | product | product | yes | 0.93 | 103.6 | 182 | 2 | 184 |
| cancellation | billing | billing | yes | 0.33 | 101.05 | 196 | 2 | 198 |
| order-status | logistics | logistics | yes | 0.60 | 100.72 | 196 | 2 | 198 |

## Comparison

| Metric | Value |
|---|---:|
| Routing accuracy | 100.0% |
| Average latency | 338.98 ms |
| Median latency | 102.77 ms |
| Fastest / slowest | 99.09 / 2461.42 ms |
| Total input tokens | 1953 |
| Total output tokens | 20 |
| Total tokens | 1973 |

> These are local model measurements, not TypeSafe-hosted Jev results; repeat the benchmark for a stable baseline.
