# Jev quick-reference cheatsheet

## Mental model

**State + typed question → structured answer → your application’s policy**

Jev is a decision model/service, not an alerting system, workflow engine, or general chat framework. Your code still owns ingestion, permissions, actions, and human review.

Official overview: [What is Jev?](https://www.typesafeai.org/jev)

## Choose the question type

| Type | Use it for | Example | Read |
|---|---|---|---|
| **Noul** | One yes/no judgment | “Are these alerts from the same incident?” | `answer.noul` = probability of yes, `0–1` |
| **Choice** | One item from a finite list | “Which incident group fits?” | `answer.choice` = selected label |
| **Score** | An ordered rubric | “How severe is this?” | `answer.score` = expected level |

### Noul

Use for a focused proposition. `0.85` means Jev estimates an 85% chance of **yes**. It is not automatically a safe production threshold.

### Choice

Use for routing or grouping. Include a fallback such as `new_incident`, `unknown`, or `human_review`.

### Score

Use for coarse ordered levels, not exact measurements:

```text
0 = informational   1 = investigate   2 = urgent   3 = critical
```

More detail: [Choice, Score or Noul?](https://www.typesafeai.org/guides/choice-score-noul)

## Minimal JavaScript example

```js
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const result = await new TypeSafeClient().systemOne({
  state: { newAlert, candidateGroup, topology, recentDeployments },
  questions: {
    sameIncident: noul("Are these alerts caused by the same incident?"),
    group: choice("Where should this alert go?", {
      existing_group: "An existing incident group",
      new_incident: "No existing group fits",
      human_review: "Uncertain; ask an operator",
    }),
    severity: score("How urgent is this?", [
      "Informational", "Investigate", "Urgent", "Critical",
    ]),
  },
});

const same = result.answers.sameIncident.noul;
const group = result.answers.group.choice;
const severity = result.answers.severity.score;
```

Keep `TYPESAFE_API_KEY` server-side. [API quickstart](https://www.typesafeai.org/guides/jev-api-quickstart)

## Alert-grouping pattern

```text
deduplicate + time window + topology
                 ↓
          candidate incident groups
                 ↓
             Jev judgment
                 ↓
       merge / create / human review
```

- **Your code:** exact deduplication, topology, policy, permissions, final actions.
- **Jev:** semantic comparison between a new alert and a small candidate set.
- **Human:** uncertain or high-impact cases.

Do not ask Jev to prove a root cause from alert text alone. Provide logs, deployments, dependencies, recent alerts, and candidate causes. Keep `new_incident` available.

## Production rules

- Calibrate Noul thresholds on labeled historical incidents; do not assume `0.5` works.
- Measure false merges and fragmented incidents, not only accuracy.
- On timeout/error, use deterministic fallback or `human_review`; do not silently ignore.
- Start with reversible suggestions before automatic merging or paging.
- Local testing: `TYPESAFE_BASE_URL=http://127.0.0.1:8765` with [`local-jev`](https://github.com/amithgc/local-jev).

**Shortcut:** Noul = “yes/no?”, Choice = “which one?”, Score = “how much on an ordered scale?”
