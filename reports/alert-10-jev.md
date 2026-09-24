# 10 service-health alert comparison

Alerts: **10**
Seed: **42**
Incident rate: **20.00%**
Generated: **2026-09-24T15:16:44.443Z**

The same deterministic service-health alert stream is classified by each provider. A classification is an incident when the provider returns true (or a Jev Noul score at or above the configured threshold).

## Comparison

| Provider | Accuracy | Precision | Recall | F1 | Avg ms | P95 ms | Input tokens | Output tokens | Total tokens | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| jev | 80.00% | 0.00% | 0.00% | 0.00% | 119.64 | 329.20 | 423 | 10 | 433 | $0.000000 |

## Configuration

- Alert concurrency: 2
- Jev incident threshold: 0.5
- OpenAI model: gpt-5.6-luna
- OpenAI reasoning effort: none
- OpenAI price used: $0.2/1M input, $1.2/1M output; cached input $0.02/1M.
- Jev price used: $0/1M input, $0/1M output. Set JEV_INPUT_PRICE_PER_MTOK and JEV_OUTPUT_PRICE_PER_MTOK for hosted Jev pricing; local Jev API cost is otherwise reported as $0 excluding hardware.

## Limits

The generated labels are rule-based ground truth, not human labels. Jev local cost excludes electricity, hardware, model download, and operations. OpenAI cost is calculated from response usage and current standard token rates; confirm account-specific discounts, batch pricing, and rate limits before production use.
