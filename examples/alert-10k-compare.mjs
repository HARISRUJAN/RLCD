import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { generateAlerts } from "./alert-data.mjs";

const COUNT = Number(process.env.ALERT_COUNT ?? 10_000);
const SEED = Number(process.env.ALERT_SEED ?? 42);
const CONCURRENCY = Number(process.env.ALERT_CONCURRENCY ?? 20);
const THRESHOLD = Number(process.env.INCIDENT_THRESHOLD ?? 0.5);
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
const OPENAI_INPUT_PRICE = 0.20;
const OPENAI_CACHED_INPUT_PRICE = 0.02;
const OPENAI_OUTPUT_PRICE = 1.20;
const JEV_INPUT_PRICE = Number(process.env.JEV_INPUT_PRICE_PER_MTOK ?? 0);
const JEV_OUTPUT_PRICE = Number(process.env.JEV_OUTPUT_PRICE_PER_MTOK ?? 0);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODELS_OVERRIDE = process.env.OLLAMA_MODELS?.split(",").map((model) => model.trim()).filter(Boolean);

const incidentQuestion = noul("Does this service-health alert represent a real incident requiring operator action?");
const OPENAI_INSTRUCTIONS = [
  "Classify one service-health alert as an incident.",
  "Return incident=true only when the metric is outside the stated normal range or the alert clearly indicates service degradation.",
  "Return JSON only.",
].join(" ");
const OPENAI_SCHEMA = {
  type: "object",
  properties: { incident: { type: "boolean" } },
  required: ["incident"],
  additionalProperties: false,
};

function costUsd(inputTokens, outputTokens, inputPrice, outputPrice, cachedInputTokens = 0, cachedInputPrice = inputPrice) {
  return ((inputTokens - cachedInputTokens) * inputPrice + cachedInputTokens * cachedInputPrice + outputTokens * outputPrice) / 1_000_000;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

function summarize(name, results) {
  const latencies = results.map((result) => result.latencyMs);
  const inputTokens = results.reduce((sum, result) => sum + result.inputTokens, 0);
  const outputTokens = results.reduce((sum, result) => sum + result.outputTokens, 0);
  const cachedInputTokens = results.reduce((sum, result) => sum + result.cachedInputTokens, 0);
  const correct = results.filter((result) => result.correct).length;
  const predictedIncidents = results.filter((result) => result.predictedIncident);
  const actualIncidents = results.filter((result) => result.expectedIncident);
  const truePositives = results.filter((result) => result.expectedIncident && result.predictedIncident).length;
  const falsePositives = results.filter((result) => !result.expectedIncident && result.predictedIncident).length;
  const falseNegatives = results.filter((result) => result.expectedIncident && !result.predictedIncident).length;
  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);
  const confidenceValues = results.map((result) => result.confidence).filter(Number.isFinite);
  return {
    name,
    cases: results.length,
    accuracy: correct / results.length,
    precision,
    recall,
    f1: 2 * precision * recall / (precision + recall || 1),
    actualIncidents: actualIncidents.length,
    predictedIncidents: predictedIncidents.length,
    averageLatencyMs: latencies.reduce((sum, value) => sum + value, 0) / results.length,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    averageConfidence: confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : null,
    costUsd: results.reduce((sum, result) => sum + result.costUsd, 0),
  };
}

async function runPool(items, worker) {
  const results = [];
  let next = 0;
  // ponytail: bounded worker pool; raise concurrency only after measuring server/API rate limits.
  async function consume() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, consume));
  return results;
}

async function classifyMock(alert) {
  const started = performance.now();
  const predictedIncident = alert.value < alert.normalMin || alert.value > alert.normalMax;
  return {
    predictedIncident,
    confidence: 1,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    latencyMs: Math.round((performance.now() - started) * 100) / 100,
  };
}

function buildJevClassifier() {
  const client = new TypeSafeClient();
  return async (alert) => {
    const started = performance.now();
    const response = await client.systemOne({ state: { alert: alert.text }, questions: { incident: incidentQuestion } });
    const score = Number(response.answers.incident.noul);
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    return {
      predictedIncident: score >= THRESHOLD,
      confidence: score,
      inputTokens,
      cachedInputTokens: 0,
      outputTokens,
      costUsd: costUsd(inputTokens, outputTokens, JEV_INPUT_PRICE, JEV_OUTPUT_PRICE),
      latencyMs: Math.round((performance.now() - started) * 100) / 100,
    };
  };
}

function outputText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  return response.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text).join("") ?? "";
}

function buildOpenAiClassifier() {
  return async (alert) => {
    const started = performance.now();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          store: false,
          reasoning: { effort: process.env.OPENAI_REASONING_EFFORT ?? "none" },
          instructions: OPENAI_INSTRUCTIONS,
          input: alert.text,
          text: { format: { type: "json_schema", name: "incident_classification", strict: true, schema: OPENAI_SCHEMA } },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const body = await response.json();
      if (response.ok) {
        const usage = body.usage ?? {};
        const inputTokens = usage.input_tokens ?? 0;
        const cachedInputTokens = usage.input_tokens_details?.cached_tokens ?? 0;
        const outputTokens = usage.output_tokens ?? 0;
        const answer = JSON.parse(outputText(body));
        return {
          predictedIncident: Boolean(answer.incident),
          confidence: null,
          inputTokens,
          cachedInputTokens,
          outputTokens,
          costUsd: costUsd(inputTokens, outputTokens, OPENAI_INPUT_PRICE, OPENAI_OUTPUT_PRICE, cachedInputTokens, OPENAI_CACHED_INPUT_PRICE),
          latencyMs: Math.round((performance.now() - started) * 100) / 100,
        };
      }
      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(body)}`);
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    }
    throw new Error("OpenAI request exhausted retries");
  };
}

function buildOllamaClassifier(model) {
  return async (alert) => {
    const started = performance.now();
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: OPENAI_SCHEMA,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: OPENAI_INSTRUCTIONS },
          { role: "user", content: alert.text },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`Ollama ${response.status}: ${JSON.stringify(body)}`);
    const answer = JSON.parse(body.message?.content ?? "{}");
    const inputTokens = body.prompt_eval_count ?? 0;
    const outputTokens = body.eval_count ?? 0;
    return {
      predictedIncident: Boolean(answer.incident),
      confidence: null,
      inputTokens,
      cachedInputTokens: 0,
      outputTokens,
      costUsd: 0,
      latencyMs: Math.round((performance.now() - started) * 100) / 100,
    };
  };
}

async function listOllamaModels() {
  if (OLLAMA_MODELS_OVERRIDE?.length) return OLLAMA_MODELS_OVERRIDE;
  const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(10_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`Ollama ${response.status}: ${JSON.stringify(body)}`);
  return (body.models ?? []).map((model) => model.name).filter((model) => !/(embed|embedding)/i.test(model));
}

function estimateOpenAi(alerts) {
  const inputTokens = alerts.reduce((sum, alert) => sum + Math.ceil((OPENAI_INSTRUCTIONS.length + alert.text.length) / 4), 0);
  const outputTokens = alerts.length * 8;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, costUsd: costUsd(inputTokens, outputTokens, OPENAI_INPUT_PRICE, OPENAI_OUTPUT_PRICE) };
}

function report(alerts, summaries, estimate) {
  const lines = [
    `# ${alerts.length.toLocaleString()} service-health alert comparison`,
    "",
    `Alerts: **${alerts.length.toLocaleString()}**`,
    `Seed: **${SEED}**`,
    `Incident rate: **${(alerts.filter((alert) => alert.incident).length / alerts.length * 100).toFixed(2)}%**`,
    `Generated: **${new Date().toISOString()}**`,
    "",
    "The same deterministic service-health alert stream is classified by each provider. A classification is an incident when the provider returns true (or a Jev Noul score at or above the configured threshold).",
    "",
    "## Comparison",
    "",
    "| Provider | Accuracy | Precision | Recall | F1 | Avg ms | P95 ms | Input tokens | Output tokens | Total tokens | Cost |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...summaries.map((summary) => `| ${summary.name} | ${(summary.accuracy * 100).toFixed(2)}% | ${(summary.precision * 100).toFixed(2)}% | ${(summary.recall * 100).toFixed(2)}% | ${(summary.f1 * 100).toFixed(2)}% | ${summary.averageLatencyMs.toFixed(2)} | ${summary.p95LatencyMs.toFixed(2)} | ${summary.inputTokens.toLocaleString()} | ${summary.outputTokens.toLocaleString()} | ${summary.totalTokens.toLocaleString()} | $${summary.costUsd.toFixed(6)} |`),
    "",
    "## Configuration",
    "",
    `- Alert concurrency: ${CONCURRENCY}`,
    `- Jev incident threshold: ${THRESHOLD}`,
    `- OpenAI model: ${OPENAI_MODEL}`,
    `- OpenAI reasoning effort: ${process.env.OPENAI_REASONING_EFFORT ?? "none"}`,
    `- OpenAI price used: $${OPENAI_INPUT_PRICE}/1M input, $${OPENAI_OUTPUT_PRICE}/1M output; cached input $${OPENAI_CACHED_INPUT_PRICE}/1M.`,
    `- Jev price used: $${JEV_INPUT_PRICE}/1M input, $${JEV_OUTPUT_PRICE}/1M output. Set JEV_INPUT_PRICE_PER_MTOK and JEV_OUTPUT_PRICE_PER_MTOK for hosted Jev pricing; local Jev API cost is otherwise reported as $0 excluding hardware.`,
    estimate ? `- OpenAI dry-run estimate: ${estimate.inputTokens.toLocaleString()} input + ${estimate.outputTokens.toLocaleString()} output = ${estimate.totalTokens.toLocaleString()} tokens, approximately $${estimate.costUsd.toFixed(6)}.` : "",
    "",
    "## Limits",
    "",
    "The generated labels are rule-based ground truth, not human labels. Jev local cost excludes electricity, hardware, model download, and operations. OpenAI cost is calculated from response usage and current standard token rates; confirm account-specific discounts, batch pricing, and rate limits before production use.",
    "",
  ];
  return lines.filter((line, index) => line || lines[index - 1] !== "").join("\n");
}

const providerArgument = process.argv.find((argument) => argument.startsWith("--provider="))?.split("=")[1];
const mode = process.argv.includes("--estimate") ? "estimate" : providerArgument ?? (process.argv.includes("--mock") ? "mock" : "both");
const providers = mode === "both" ? ["jev", "openai"] : mode === "ollama" ? [] : [mode];
if (!Number.isInteger(COUNT) || COUNT < 1) throw new Error("ALERT_COUNT must be a positive integer");
if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1) throw new Error("ALERT_CONCURRENCY must be a positive integer");
if (!["estimate", "mock", "jev", "openai", "ollama", "both"].includes(mode)) throw new Error("Use --estimate, --mock, --provider=jev, --provider=openai, or --provider=ollama");
if (providers.includes("jev") && !process.env.TYPESAFE_API_KEY) throw new Error("Missing TYPESAFE_API_KEY for Jev. Use --estimate or --mock first.");
if (providers.includes("openai") && !process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY for GPT-5.6 Luna. Use --estimate or --mock first.");
const ollamaModels = mode === "ollama" ? await listOllamaModels() : [];
if (mode === "ollama" && !ollamaModels.length) throw new Error("Ollama has no non-embedding models. Set OLLAMA_MODELS to choose one explicitly.");

const alerts = generateAlerts(COUNT, SEED);
assert.equal(alerts.length, COUNT);
assert.ok(alerts.every((alert) => typeof alert.text === "string" && typeof alert.incident === "boolean"));

if (mode === "estimate") {
  const estimate = estimateOpenAi(alerts);
  const reportText = report(alerts, [], estimate);
  await mkdir("reports", { recursive: true });
  const file = `reports/alert-${alerts.length}-estimate.md`;
  await writeFile(file, reportText);
  console.log(reportText);
  console.log(`Saved ${file}`);
  process.exit(0);
}

const summaries = [];
if (mode === "ollama") {
  for (const model of ollamaModels) {
    const classify = buildOllamaClassifier(model);
    const results = await runPool(alerts, async (alert) => {
      const result = await classify(alert);
      return { ...result, expectedIncident: alert.incident, correct: result.predictedIncident === alert.incident };
    });
    summaries.push(summarize(model, results));
  }
} else {
  const classifiers = { mock: classifyMock };
  if (providers.includes("jev")) classifiers.jev = buildJevClassifier();
  if (providers.includes("openai")) classifiers.openai = buildOpenAiClassifier();
  for (const provider of providers) {
    const results = await runPool(alerts, async (alert) => {
      const result = await classifiers[provider](alert);
      return { ...result, expectedIncident: alert.incident, correct: result.predictedIncident === alert.incident };
    });
    summaries.push(summarize(provider === "openai" ? OPENAI_MODEL : provider, results));
  }
}

const reportText = report(alerts, summaries);
const file = mode === "ollama" ? `reports/alert-${alerts.length}-ollama.md` : providers.length === 1 ? `reports/alert-${alerts.length}-${providers[0]}.md` : `reports/alert-${alerts.length}-compare.md`;
await mkdir("reports", { recursive: true });
await writeFile(file, reportText);
console.log(reportText);
console.log(`Saved ${file}`);
