# Jev incident memory report

Generated: **2026-09-24T15:27:15.990Z**
Alert stream: **500** alerts, seed **42**
Actionable alerts: **54**
Model: **local Jev-compatible server**

## Policy

- Auto-merge threshold: **0.8**
- Human-review threshold: **0.4**
- Minimum best-vs-second margin: **0.15**
- Candidate limit: **3**

## Results

| Metric | Result |
|---|---:|
| Candidate-eligible alerts | 9 |
| Cold-start alerts | 45 |
| Candidate recall (eligible only) | 100.00% |
| Groups created | 54 |
| Automatic merges | 0 |
| Human-review decisions | 0 |
| New-incident decisions | 54 |
| Automatic-merge precision | n/a |
| B-Cubed precision | 100.00% |
| B-Cubed recall | 83.33% |
| Jev calls | 48 |
| Average Jev latency | 657.87 ms |
| P95 Jev latency | 803.89 ms |
| Input tokens | 53,758 |
| Output tokens | 132 |

## Decision audit sample

| Alert | Candidates | Action | Best score | Margin | Assigned group |
|---|---:|---|---:|---:|---|
| alert-00001 | 0 | new_incident | 0.000 | 1.000 | incident-0001 |
| alert-00002 | 0 | new_incident | 0.000 | 1.000 | incident-0002 |
| alert-00019 | 1 | new_incident | 0.213 | 0.213 | incident-0003 |
| alert-00022 | 0 | new_incident | 0.000 | 1.000 | incident-0004 |
| alert-00038 | 3 | new_incident | 0.220 | 0.010 | incident-0005 |
| alert-00048 | 0 | new_incident | 0.000 | 1.000 | incident-0006 |
| alert-00050 | 1 | new_incident | 0.205 | 0.205 | incident-0007 |
| alert-00059 | 0 | new_incident | 0.000 | 1.000 | incident-0008 |
| alert-00067 | 3 | new_incident | 0.220 | 0.003 | incident-0009 |
| alert-00103 | 0 | new_incident | 0.000 | 1.000 | incident-0010 |
| alert-00118 | 1 | new_incident | 0.211 | 0.211 | incident-0011 |
| alert-00119 | 2 | new_incident | 0.215 | 0.020 | incident-0012 |

## Interpretation

This workflow separates candidate generation from Jev judgment and refuses to auto-merge when the top score is weak or too close to the runner-up. The synthetic root-cause IDs are evaluation-only; they are not sent to Jev. A production rollout requires historical incident IDs, held-out calibration, topology, and operator review.
