# 10 service-health alert comparison

Alerts: **10**
Seed: **42**
Incident rate: **20.00%**
Generated: **2026-09-24T15:29:03.076Z**

The same deterministic service-health alert stream is classified by each provider. A classification is an incident when the provider returns true (or a Jev Noul score at or above the configured threshold).

## Comparison

| Provider | Accuracy | Precision | Recall | F1 | Avg ms | P95 ms | Input tokens | Output tokens | Total tokens | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| gemma3:4b | 20.00% | 20.00% | 100.00% | 33.33% | 1127.95 | 3484.47 | 1,006 | 60 | 1,066 | $0.000000 |
| brnpistone/Qwen3-4B-AgentCoder-q5-k-m:latest | 90.00% | 66.67% | 100.00% | 80.00% | 18241.07 | 23915.78 | 4,926 | 60 | 4,986 | $0.000000 |
| tinyllama:latest | 80.00% | 0.00% | 0.00% | 0.00% | 318.78 | 990.64 | 1,168 | 110 | 1,278 | $0.000000 |

## Configuration

- Alert concurrency: 2
- Jev incident threshold: 0.5
- OpenAI model: gpt-5.6-luna
- OpenAI reasoning effort: none
- OpenAI price used: $0.2/1M input, $1.2/1M output; cached input $0.02/1M.
- Jev price used: $0/1M input, $0/1M output. Set JEV_INPUT_PRICE_PER_MTOK and JEV_OUTPUT_PRICE_PER_MTOK for hosted Jev pricing; local Jev API cost is otherwise reported as $0 excluding hardware.

## Limits

The generated labels are rule-based ground truth, not human labels. Jev local cost excludes electricity, hardware, model download, and operations. OpenAI cost is calculated from response usage and current standard token rates; confirm account-specific discounts, batch pricing, and rate limits before production use.
