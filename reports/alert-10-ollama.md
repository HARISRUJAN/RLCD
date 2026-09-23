# 10 microcontroller alert comparison

Alerts: **10**
Seed: **42**
Incident rate: **20.00%**
Generated: **2026-09-23T17:06:55.330Z**

The same deterministic alert stream is classified by each provider. A classification is an incident when the provider returns true (or a Jev Noul score at or above the configured threshold).

## Comparison

| Provider | Accuracy | Precision | Recall | F1 | Avg ms | P95 ms | Input tokens | Output tokens | Total tokens | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gemma3:4b | 50.00% | 28.57% | 100.00% | 44.44% | 3611.55 | 15839.20 | 1,000 | 60 | 1,060 | $0.000000 |
| tinyllama:latest | 20.00% | 20.00% | 100.00% | 33.33% | 2681.96 | 12873.01 | 1,134 | 110 | 1,244 | $0.000000 |
| brnpistone/Qwen3-4B-AgentCoder-q5-k-m:latest | 100.00% | 100.00% | 100.00% | 100.00% | 23553.58 | 34826.20 | 6,255 | 60 | 6,315 | $0.000000 |

## Configuration

- Alert concurrency: 2
- Jev incident threshold: 0.5
- OpenAI model: gpt-5.6-luna
- OpenAI reasoning effort: none
- OpenAI price used: $0.2/1M input, $1.2/1M output; cached input $0.02/1M.
- Jev price used: $0/1M input, $0/1M output. Set JEV_INPUT_PRICE_PER_MTOK and JEV_OUTPUT_PRICE_PER_MTOK for hosted Jev pricing; local Jev API cost is otherwise reported as $0 excluding hardware.

## Limits

The generated labels are rule-based ground truth, not human labels. Jev local cost excludes electricity, hardware, model download, and operations. OpenAI cost is calculated from response usage and current standard token rates; confirm account-specific discounts, batch pricing, and rate limits before production use.
