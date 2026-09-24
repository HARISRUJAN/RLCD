import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { generateAlerts } from "./alert-data.mjs";

const ALERT_COUNT = Number(process.env.MEMORY_ALERT_COUNT ?? 500);
const MAX_CANDIDATES = Number(process.env.MEMORY_MAX_CANDIDATES ?? 3);
const AUTO_THRESHOLD = Number(process.env.MEMORY_AUTO_THRESHOLD ?? 0.8);
const REVIEW_THRESHOLD = Number(process.env.MEMORY_REVIEW_THRESHOLD ?? 0.4);
const MIN_MARGIN = Number(process.env.MEMORY_MIN_MARGIN ?? 0.15);
const SEED = Number(process.env.ALERT_SEED ?? 42);
const MODEL = process.env.JEV_MODEL ?? "local Jev-compatible server";
const client = new TypeSafeClient();

function isActionable(alert) {
  return alert.value < alert.normalMin || alert.value > alert.normalMax;
}

function alertState(alert) {
  return {
    id: alert.id,
    device: alert.device,
    zone: alert.zone,
    sensor: alert.sensor,
    value: alert.value,
    unit: alert.unit,
    normal_range: [alert.normalMin, alert.normalMax],
    timestamp: alert.timestamp,
    battery: alert.battery,
    rssi: alert.rssi,
  };
}

function groupState(group) {
  return {
    id: group.id,
    zone: group.zone,
    sensors: [...group.sensors],
    alert_count: group.alerts.length,
    last_sequence: group.lastSequence,
    recent_alerts: group.alerts.slice(-3).map((alert) => alert.text),
  };
}

function candidateScore(alert, group) {
  return (group.zone === alert.zone ? 3 : 0)
    + (group.sensors.has(alert.sensor) ? 2 : 0)
    - Math.min(Math.abs(alert.sequence - group.lastSequence) / 1000, 1);
}

function candidatesFor(alert, groups) {
  return groups
    .filter((group) => group.zone === alert.zone || group.sensors.has(alert.sensor))
    .sort((left, right) => candidateScore(alert, right) - candidateScore(alert, left))
    .slice(0, MAX_CANDIDATES);
}

function createGroup(alert, index, action) {
  return {
    id: `incident-${String(index).padStart(4, "0")}`,
    zone: alert.zone,
    sensors: new Set([alert.sensor]),
    alerts: [alert],
    lastSequence: alert.sequence,
    truthRootCauses: new Set(alert.rootCauseId ? [alert.rootCauseId] : []),
    action,
  };
}

function addToGroup(group, alert, action) {
  group.sensors.add(alert.sensor);
  group.alerts.push(alert);
  group.lastSequence = alert.sequence;
  if (alert.rootCauseId) group.truthRootCauses.add(alert.rootCauseId);
  group.action = action;
}

async function askJev(alert, candidates) {
  const questions = Object.fromEntries(candidates.map((group) => [
    group.id,
    noul(`Is this new alert caused by the same underlying incident as candidate group ${group.id}?`),
  ]));
  const started = performance.now();
  const response = await client.systemOne({
    state: { new_alert: alertState(alert), candidate_groups: candidates.map(groupState) },
    questions,
  });
  const scores = candidates.map((group) => ({
    groupId: group.id,
    score: Number(response.answers[group.id].noul),
  })).sort((left, right) => right.score - left.score);
  const usage = response.usage ?? {};
  return {
    scores,
    latencyMs: Math.round((performance.now() - started) * 100) / 100,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
  };
}

function choose(scores) {
  if (!scores.length) return { action: "new_incident", groupId: null, bestScore: 0, margin: 1 };
  const [best, second = { score: 0 }] = scores;
  const margin = best.score - second.score;
  if (best.score >= AUTO_THRESHOLD && margin >= MIN_MARGIN) {
    return { action: "auto_merge", groupId: best.groupId, bestScore: best.score, margin };
  }
  if (best.score >= REVIEW_THRESHOLD) {
    return { action: "human_review", groupId: best.groupId, bestScore: best.score, margin };
  }
  return { action: "new_incident", groupId: null, bestScore: best.score, margin };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

function bCubed(assignments) {
  const predicted = new Map();
  const truth = new Map();
  for (const item of assignments) {
    if (!predicted.has(item.predicted)) predicted.set(item.predicted, []);
    if (!truth.has(item.expected)) truth.set(item.expected, []);
    predicted.get(item.predicted).push(item);
    truth.get(item.expected).push(item);
  }
  let precision = 0;
  let recall = 0;
  for (const item of assignments) {
    const predictedMembers = predicted.get(item.predicted);
    const truthMembers = truth.get(item.expected);
    const overlap = predictedMembers.filter((candidate) => candidate.expected === item.expected).length;
    precision += overlap / predictedMembers.length;
    recall += overlap / truthMembers.length;
  }
  return { precision: precision / assignments.length, recall: recall / assignments.length };
}

function report(alerts, groups, decisions) {
  const actionable = alerts.filter(isActionable);
  const evaluated = decisions.filter((decision) => decision.actionable && decision.expectedRootCause);
  const repeatable = evaluated.filter((decision) => decision.seenRootCause);
  const candidateHits = repeatable.filter((decision) => decision.candidateRootCauses.includes(decision.expectedRootCause)).length;
  const auto = evaluated.filter((decision) => decision.action === "auto_merge");
  const correctAuto = auto.filter((decision) => decision.mergedRootCauses.includes(decision.expectedRootCause)).length;
  const autoPrecision = auto.length ? `${(correctAuto / auto.length * 100).toFixed(2)}%` : "n/a";
  const assignments = evaluated.map((decision) => ({ predicted: decision.assignedGroup, expected: decision.expectedRootCause }));
  const bcubed = assignments.length ? bCubed(assignments) : { precision: 0, recall: 0 };
  const latencies = decisions.filter((decision) => decision.latencyMs).map((decision) => decision.latencyMs);
  const lines = [
    "# Jev incident memory report",
    "",
    `Generated: **${new Date().toISOString()}**`,
    `Alert stream: **${alerts.length.toLocaleString()}** alerts, seed **${SEED}**`,
    `Actionable alerts: **${actionable.length}**`,
    `Model: **${MODEL}**`,
    "",
    "## Policy",
    "",
    `- Auto-merge threshold: **${AUTO_THRESHOLD}**`,
    `- Human-review threshold: **${REVIEW_THRESHOLD}**`,
    `- Minimum best-vs-second margin: **${MIN_MARGIN}**`,
    `- Candidate limit: **${MAX_CANDIDATES}**`,
    "",
    "## Results",
    "",
    "| Metric | Result |",
    "|---|---:|",
    `| Candidate-eligible alerts | ${repeatable.length} |`,
    `| Cold-start alerts | ${evaluated.length - repeatable.length} |`,
    `| Candidate recall (eligible only) | ${(candidateHits / (repeatable.length || 1) * 100).toFixed(2)}% |`,
    `| Groups created | ${groups.length} |`,
    `| Automatic merges | ${auto.length} |`,
    `| Human-review decisions | ${evaluated.filter((decision) => decision.action === "human_review").length} |`,
    `| New-incident decisions | ${evaluated.filter((decision) => decision.action === "new_incident").length} |`,
    `| Automatic-merge precision | ${autoPrecision} |`,
    `| B-Cubed precision | ${(bcubed.precision * 100).toFixed(2)}% |`,
    `| B-Cubed recall | ${(bcubed.recall * 100).toFixed(2)}% |`,
    `| Jev calls | ${latencies.length} |`,
    `| Average Jev latency | ${(latencies.reduce((sum, value) => sum + value, 0) / (latencies.length || 1)).toFixed(2)} ms |`,
    `| P95 Jev latency | ${percentile(latencies, 0.95).toFixed(2)} ms |`,
    `| Input tokens | ${decisions.reduce((sum, decision) => sum + decision.inputTokens, 0).toLocaleString()} |`,
    `| Output tokens | ${decisions.reduce((sum, decision) => sum + decision.outputTokens, 0).toLocaleString()} |`,
    "",
    "## Decision audit sample",
    "",
    "| Alert | Candidates | Action | Best score | Margin | Assigned group |",
    "|---|---:|---|---:|---:|---|",
    ...decisions.filter((decision) => decision.actionable).slice(0, 12).map((decision) => `| ${decision.alertId} | ${decision.candidateCount} | ${decision.action} | ${decision.bestScore.toFixed(3)} | ${decision.margin.toFixed(3)} | ${decision.assignedGroup} |`),
    "",
    "## Interpretation",
    "",
    "This workflow separates candidate generation from Jev judgment and refuses to auto-merge when the top score is weak or too close to the runner-up. The synthetic root-cause IDs are evaluation-only; they are not sent to Jev. A production rollout requires historical incident IDs, held-out calibration, topology, and operator review.",
    "",
  ];
  return lines.join("\n");
}

if (!Number.isInteger(ALERT_COUNT) || ALERT_COUNT < 100) throw new Error("MEMORY_ALERT_COUNT must be an integer >= 100");
if (!Number.isInteger(MAX_CANDIDATES) || MAX_CANDIDATES < 1) throw new Error("MEMORY_MAX_CANDIDATES must be a positive integer");

const alerts = generateAlerts(ALERT_COUNT, SEED);
const groups = [];
const decisions = [];
let nextGroup = 1;

for (const alert of alerts) {
  if (!isActionable(alert)) {
    decisions.push({ alertId: alert.id, actionable: false, action: "filtered", inputTokens: 0, outputTokens: 0 });
    continue;
  }

  const candidates = candidatesFor(alert, groups);
  const seenRootCause = groups.some((group) => group.truthRootCauses.has(alert.rootCauseId));
  const answer = candidates.length
    ? await askJev(alert, candidates)
    : { scores: [], latencyMs: 0, inputTokens: 0, outputTokens: 0 };
  const selection = choose(answer.scores);
  let assignedGroup;
  if (selection.action === "auto_merge" && groups.some((group) => group.id === selection.groupId)) {
    const group = groups.find((candidate) => candidate.id === selection.groupId);
    addToGroup(group, alert, selection.action);
    assignedGroup = group.id;
  } else {
    const group = createGroup(alert, nextGroup++, selection.action);
    groups.push(group);
    assignedGroup = group.id;
  }
  const assigned = groups.find((group) => group.id === assignedGroup);
  decisions.push({
    alertId: alert.id,
    actionable: true,
    action: selection.action,
    expectedRootCause: alert.rootCauseId,
    seenRootCause,
    candidateCount: candidates.length,
    candidateRootCauses: candidates.flatMap((candidate) => [...candidate.truthRootCauses]),
    mergedRootCauses: assigned ? [...assigned.truthRootCauses] : [],
    assignedGroup,
    bestScore: selection.bestScore,
    margin: selection.margin,
    latencyMs: answer.latencyMs,
    inputTokens: answer.inputTokens,
    outputTokens: answer.outputTokens,
  });
}

assert.equal(decisions.length, alerts.length);
const reportText = report(alerts, groups, decisions);
await mkdir("reports", { recursive: true });
await writeFile("reports/incident-memory-local-jev.md", reportText);
await writeFile("reports/incident-memory-audit.json", JSON.stringify({ model: MODEL, seed: SEED, policy: { AUTO_THRESHOLD, REVIEW_THRESHOLD, MIN_MARGIN, MAX_CANDIDATES }, decisions }, null, 2));
console.log(reportText);
console.log("Saved reports/incident-memory-local-jev.md");
console.log("Saved reports/incident-memory-audit.json");
