# Jev benchmark report

Mode: **mock**
Cases: **10**
Generated: **2026-09-23T16:56:09.053Z**

The benchmark sends one request per use case with one Choice and one Noul question. Expected labels are the ground truth for routing accuracy.
Latency is measured around the mock call; mock mode intentionally reports zero tokens.

## Results

| Use case | Expected | Decision | Correct | Confidence | Latency (ms) | Input tokens | Output tokens | Total tokens |
|---|---|---|:---:|---:|---:|---:|---:|---:|
| double-charge | billing | billing | yes | 1.00 | 0.03 | 0 | 0 | 0 |
| login-bug | technical | technical | yes | 1.00 | 0 | 0 | 0 | 0 |
| refund-request | billing | billing | yes | 1.00 | 0 | 0 | 0 | 0 |
| shipping-delay | logistics | logistics | yes | 1.00 | 0 | 0 | 0 | 0 |
| password-reset | technical | technical | yes | 1.00 | 0 | 0 | 0 | 0 |
| sales-lead | sales | sales | yes | 1.00 | 0 | 0 | 0 | 0 |
| security-incident | security | security | yes | 1.00 | 0 | 0 | 0 | 0 |
| feature-request | product | product | yes | 1.00 | 0 | 0 | 0 | 0 |
| cancellation | billing | billing | yes | 1.00 | 0.01 | 0 | 0 | 0 |
| order-status | logistics | logistics | yes | 1.00 | 0 | 0 | 0 | 0 |

## Comparison

| Metric | Value |
|---|---:|
| Routing accuracy | 100.0% |
| Average latency | 0.00 ms |
| Median latency | 0.00 ms |
| Fastest / slowest | 0.00 / 0.03 ms |
| Total input tokens | 0 |
| Total output tokens | 0 |
| Total tokens | 0 |

> Mock verification only. Run `npm run local` in one terminal and `npm run local:benchmark` in another for local model measurements.
