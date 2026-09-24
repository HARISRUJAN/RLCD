# From alert storm to incident group

## An honest evaluation of Jev for typed alert decisions

> **Status:** engineering article draft. The results are reproducible, but the data is synthetic and the grouping labels are not human-confirmed root causes.

## Abstract

Alerting systems usually detect individual symptoms. Operators then have to decide which alerts belong to the same incident, which ones can be ignored, and which ones need immediate action. This project evaluates whether Jev—a typed decision model/service—can help with those bounded judgments.

The experiment compares local Jev-compatible inference with local Ollama models on a deterministic microcontroller-alert stream. It measures classification quality, Noul threshold behavior, latency, token usage, and cost. The result is not a model leaderboard. It is an integration study: the API is simple, but useful alert grouping depends on candidate generation, labels, and calibration.

## The decision problem

The application receives alerts containing a device, sensor, value, normal range, battery level, signal strength, and timestamp. A production system may also have topology, deployment events, logs, and recent incident history.

The desired workflow is:

```text
alerts → deterministic correlation → candidate incident groups
                                      ↓
                              typed Jev judgment
                                      ↓
                           merge / create / review
```

Jev contributes the judgment. Ordinary application code still owns ingestion, policy, permissions, persistence, and actions. This follows the System One design described by [TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev): structured decisions are returned for software to use, rather than prose for a person to interpret.

## Experimental design

The generator creates 10,000 alerts from seed `42`. It uses six sensor types, 250 possible devices, normal operating ranges, and a deterministic 12% incident probability. The realized incident rate is 11.58%.

There are three separate measurements:

1. **Incident classification:** local Jev answers a Noul question about whether one alert requires operator action.
2. **Pairwise grouping:** 100 incident-alert pairs are sampled from the same stream. Jev answers whether two alerts belong to the same synthetic root-cause family.
3. **Local model smoke test:** Gemma, TinyLlama, and Qwen are run on 10 alerts through Ollama.

The grouping oracle is evaluation-only. It labels two incident alerts as related when they share the generated sensor family and device zone. That makes the experiment reproducible, but it is not a real causal label and is never sent to Jev.

## Results

### Classification and smoke test

| Run | Classifier | Accuracy | Precision | Recall | F1 | Avg latency | Total tokens |
|---|---|---:|---:|---:|---:|---:|---:|
| 10 alerts | Local Jev | 80.00% | 0.00% | 0.00% | 0.00% | 72 ms | 446 |
| 10 alerts | Gemma 3 4B | 50.00% | 28.57% | 100.00% | 44.44% | 3,612 ms | 1,060 |
| 10 alerts | TinyLlama | 20.00% | 20.00% | 100.00% | 33.33% | 2,682 ms | 1,244 |
| 10 alerts | Qwen3 4B AgentCoder | 100.00% | 100.00% | 100.00% | 100.00% | 23,554 ms | 6,315 |
| 10,000 alerts | Local Jev | 88.42% | 0.00% | 0.00% | 0.00% | 660 ms | 443,694 |

The local Jev server was run with `nli-deberta-large`. At Noul threshold `0.5`, it predicted no alerts as incidents. Because the generated incident prevalence was 11.58%, that produces 88.42% accuracy while missing every positive case. Accuracy alone is therefore misleading.

The Ollama rows are smoke tests, not reliable model rankings. In particular, Qwen’s perfect result is based on only 10 cases and its average latency is too high for an unmodified real-time alert path.

### Noul threshold behavior

For a Noul result `p`, the application predicts “yes” when `p >= threshold`.

| Threshold | Accuracy | Precision | Recall | F1 | Predicted related pairs |
|---:|---:|---:|---:|---:|---:|
| 0.1 | 50.00% | 50.00% | 100.00% | 66.67% | 100/100 |
| 0.3 | 36.00% | 37.50% | 42.00% | 39.62% | 56/100 |
| 0.5 | 50.00% | 0.00% | 0.00% | 0.00% | 0/100 |

This is a calibration result, not evidence that Jev is generally incapable of grouping. The local model, question wording, state representation, and synthetic oracle all affect it. It does show that `0.5` is not a magic threshold.

## What the experiment actually supports

The integration path is straightforward: a gateway can send a normalized alert and a small candidate set to Jev, then apply an application policy to the typed result. The harder work is upstream and downstream:

- candidate generation must include the correct incident group;
- labels must represent real operator-confirmed incidents;
- thresholds must be calibrated on held-out data;
- uncertain results need a review lane;
- automatic merging must be reversible and auditable.

For actual clustering, pairwise F1 is not enough. Evaluate the final clusters with pairwise metrics plus B-Cubed precision and recall, which measure over-linking and under-linking at the item level. [B-Cubed clustering evaluation](https://link.springer.com/article/10.1007/s10791-008-9066-8)

## Recommended production architecture

```text
1. Ingest alert
2. Deduplicate exact repeats
3. Apply time-window and topology correlation
4. Build a small candidate-group list
5. Ask Jev a Choice/Noul question
6. Merge, create, or route to human review
7. Store the decision, probability, threshold, model, and evidence
```

Hard safety rules should not depend on Jev. Jev should not be asked to prove a root cause from alert text alone. Provide the relevant topology, recent alerts, deployment changes, logs, and candidate causes.

## The useful contribution: incident memory with abstention

The most defensible contribution in this repository is not a new model. It is a control layer around a typed decision model, implemented in [`examples/incident-memory.mjs`](examples/incident-memory.mjs) with a checked-in [decision report](reports/incident-memory-local-jev.md) and [audit ledger](reports/incident-memory-audit.json):

1. deterministic correlation narrows the search to a few candidates;
2. Jev scores each candidate with an explicit Noul question;
3. the policy requires both a high score and a margin over the runner-up;
4. weak or ambiguous decisions are not merged automatically;
5. every decision is written to an audit ledger with its candidates, score, margin, threshold, latency, and token usage.

On 500 generated alerts, 54 were actionable and 48 required Jev calls. Candidate recall was 100% for the 11 alerts whose root cause had already appeared. The conservative policy made zero automatic merges because the local model scores remained low. A separate exploratory lower-threshold shadow policy made 9 automatic merges and routed 39 cases to review, with 100% precision on the nine synthetic merges. That is a safety-policy observation, not a validated production threshold.

## Limitations and next experiment

The next credible study needs historical alerts with confirmed `incident_id` and root-cause labels. Split by incident or time rather than randomly splitting alerts. Compare deterministic correlation, similarity search, local Jev, and hosted Jev on the same candidate groups.

Report:

- pairwise precision, recall, and F1;
- B-Cubed precision, recall, and F1;
- false merges and fragmented incidents;
- candidate-generation recall;
- abstention and human-review rate;
- cold-start and warm p50/p95 latency;
- input tokens, retries, failures, and total cost.

Until that data exists, the responsible conclusion is narrow: **local Jev is a useful integration and calibration subject, but this experiment does not establish it as a trustworthy root-cause grouper.**
