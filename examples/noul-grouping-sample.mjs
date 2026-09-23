import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { generateAlerts, rng } from "./alert-data.mjs";

const ALERT_COUNT = Number(process.env.ALERT_COUNT ?? 10_000);
const SAMPLE_PAIRS = Number(process.env.GROUP_SAMPLE_PAIRS ?? 100);
const CONCURRENCY = Number(process.env.ALERT_CONCURRENCY ?? 4);
const SEED = Number(process.env.ALERT_SEED ?? 42);
const THRESHOLDS = [0.1, 0.3, 0.5, 0.7, 0.9];
const question = noul(
  "Are these two microcontroller alerts manifestations of the same underlying hardware root-cause family and safe to group into one incident? Consider sensor type, device zone, signal pattern, and timing."
);

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function samplePairs(alerts, count, seed) {
  const incidents = alerts.filter((alert) => alert.rootCauseId);
  const groups = new Map();
  for (const alert of incidents) {
    const members = groups.get(alert.rootCauseId) ?? [];
    members.push(alert);
    groups.set(alert.rootCauseId, members);
  }
  const positive = [];
  for (const members of groups.values()) {
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        positive.push({ left: members[left], right: members[right], expectedSame: true });
      }
    }
  }

  const random = rng(seed + 1);
  const negative = [];
  while (negative.length < positive.length) {
    const left = incidents[Math.floor(random() * incidents.length)];
    const right = incidents[Math.floor(random() * incidents.length)];
    if (left.id !== right.id && left.rootCauseId !== right.rootCauseId) {
      negative.push({ left, right, expectedSame: false });
    }
  }

  const half = Math.floor(count / 2);
  const selected = [
    ...shuffle(positive, random).slice(0, half),
    ...shuffle(negative, random).slice(0, count - half),
  ];
  assert.equal(selected.length, count);
  return shuffle(selected, random);
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

async function runPool(items, worker) {
  const results = [];
  let next = 0;
  // ponytail: bounded pool; increase only after measuring local server saturation.
  async function consume() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, consume));
  return results;
}

function summarize(results, threshold) {
  const predicted = results.map((result) => result.score >= threshold);
  const truePositive = results.filter((result, index) => result.expectedSame && predicted[index]).length;
  const falsePositive = results.filter((result, index) => !result.expectedSame && predicted[index]).length;
  const falseNegative = results.filter((result, index) => result.expectedSame && !predicted[index]).length;
  const trueNegative = results.length - truePositive - falsePositive - falseNegative;
  const precision = truePositive / (truePositive + falsePositive || 1);
  const recall = truePositive / (truePositive + falseNegative || 1);
  const latencies = results.map((result) => result.latencyMs);
  return {
    threshold,
    accuracy: (truePositive + trueNegative) / results.length,
    precision,
    recall,
    f1: 2 * precision * recall / (precision + recall || 1),
    predictedSame: predicted.filter(Boolean).length,
    averageLatencyMs: latencies.reduce((sum, value) => sum + value, 0) / results.length,
    p95LatencyMs: percentile(latencies, 0.95),
    inputTokens: results.reduce((sum, result) => sum + result.inputTokens, 0),
    outputTokens: results.reduce((sum, result) => sum + result.outputTokens, 0),
  };
}

function report(alerts, pairs, results, model) {
  const summaries = THRESHOLDS.map((threshold) => summarize(results, threshold));
  const lines = [
    "# Noul grouping sample",
    "",
    `Generated: **${new Date().toISOString()}**`,
    `Alert stream: **${alerts.length.toLocaleString()}** alerts, seed **${SEED}**`,
    `Sample: **${pairs.length}** incident-alert pairs, balanced between same-root-cause and different-root-cause labels`,
    `Model: **${model}** via local Jev-compatible server`,
    "",
    "## Result",
    "",
    "The experiment asks a Noul question for each pair. The synthetic oracle labels two incident alerts as the same root-cause family when their hidden family is the same sensor class and device zone. The oracle is evaluation-only and is never sent to Jev.",
    "",
    "| Noul threshold | Accuracy | Precision | Recall | F1 | Predicted same | Avg ms | P95 ms | Input tokens | Output tokens |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summaries.map((summary) => `| ${summary.threshold.toFixed(1)} | ${(summary.accuracy * 100).toFixed(2)}% | ${(summary.precision * 100).toFixed(2)}% | ${(summary.recall * 100).toFixed(2)}% | ${(summary.f1 * 100).toFixed(2)}% | ${summary.predictedSame} | ${summary.averageLatencyMs.toFixed(2)} | ${summary.p95LatencyMs.toFixed(2)} | ${summary.inputTokens.toLocaleString()} | ${summary.outputTokens.toLocaleString()} |`),
    "",
    "## Interpretation",
    "",
    "- This is a pairwise grouping test, not proof of real root-cause analysis.",
    "- The synthetic oracle deliberately gives the experiment a reproducible label; real evaluation should use incident IDs from historical incidents.",
    "- Use the threshold selected on a held-out labeled set. Do not assume `0.5` is calibrated.",
    "- A production grouping service should combine Jev with time windows, topology, deduplication, deployments, logs, and a `new_incident` fallback.",
    "",
  ];
  return lines.join("\n");
}

if (!Number.isInteger(ALERT_COUNT) || ALERT_COUNT < 100) throw new Error("ALERT_COUNT must be an integer >= 100");
if (!Number.isInteger(SAMPLE_PAIRS) || SAMPLE_PAIRS < 2 || SAMPLE_PAIRS % 2 !== 0) throw new Error("GROUP_SAMPLE_PAIRS must be an even integer >= 2");
if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1) throw new Error("ALERT_CONCURRENCY must be a positive integer");

const alerts = generateAlerts(ALERT_COUNT, SEED);
const pairs = samplePairs(alerts, SAMPLE_PAIRS, SEED);
const client = new TypeSafeClient();
const results = await runPool(pairs, async ({ left, right, expectedSame }) => {
  const started = performance.now();
  const response = await client.systemOne({
    state: { new_alert: alertState(left), candidate_alert: alertState(right) },
    questions: { same_root_cause: question },
  });
  const usage = response.usage ?? {};
  return {
    expectedSame,
    score: Number(response.answers.same_root_cause.noul),
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    latencyMs: Math.round((performance.now() - started) * 100) / 100,
  };
});

const model = results.length ? "local-jev default" : "unknown";
const reportText = report(alerts, pairs, results, model);
await mkdir("reports", { recursive: true });
await writeFile("reports/noul-grouping-sample.md", reportText);
console.log(reportText);
console.log("Saved reports/noul-grouping-sample.md");
