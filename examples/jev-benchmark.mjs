import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";

const cases = [
  { name: "double-charge", message: "I was charged twice for the same subscription.", expected: "billing" },
  { name: "login-bug", message: "The app crashes every time I try to sign in.", expected: "technical" },
  { name: "refund-request", message: "Please refund my order; it arrived damaged.", expected: "billing" },
  { name: "shipping-delay", message: "My package was supposed to arrive three days ago.", expected: "logistics" },
  { name: "password-reset", message: "I forgot my password and need to reset it.", expected: "technical" },
  { name: "sales-lead", message: "Can someone show me the enterprise plan pricing?", expected: "sales" },
  { name: "security-incident", message: "I see a login from a device I do not recognize.", expected: "security" },
  { name: "feature-request", message: "Please add dark mode to the dashboard.", expected: "product" },
  { name: "cancellation", message: "Cancel my account at the end of this billing period.", expected: "billing" },
  { name: "order-status", message: "Can you tell me where order 4812 is?", expected: "logistics" },
];

const questionSet = {
  department: choice("Which team should handle this ticket?", {
    billing: "Charges, refunds, subscriptions, or cancellations",
    technical: "Bugs, crashes, login, or product behavior",
    logistics: "Shipping, delivery, or order status",
    sales: "Pricing, plans, or pre-sale questions",
    security: "Suspicious access or account security",
    product: "Feature requests or product feedback",
  }),
  needs_human: noul("Does this ticket need a human response?"),
};

const mockClient = {
  async systemOne({ state }) {
    const message = state.message.toLowerCase();
    const department = message.includes("charge") || message.includes("refund") || message.includes("cancel")
      ? "billing"
      : message.includes("crash") || message.includes("sign in") || message.includes("password")
        ? "technical"
        : message.includes("package") || message.includes("order")
          ? "logistics"
          : message.includes("pricing") || message.includes("plan")
            ? "sales"
            : message.includes("login") || message.includes("device")
              ? "security"
              : "product";

    return {
      model: "mock",
      answers: {
        department: { choice: department, confidence: 1 },
        needs_human: { noul: 0.9 },
      },
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  },
};

async function benchmark(client, mode) {
  const results = [];

  for (const { name, message, expected } of cases) {
    const started = performance.now();
    const response = await client.systemOne({
      state: { ticket: name, message },
      questions: questionSet,
    });
    const latencyMs = Math.round((performance.now() - started) * 100) / 100;
    const department = response.answers.department;
    results.push({
      name,
      expected,
      department: department.choice,
      correct: department.choice === expected,
      confidence: department.confidence ?? response.answers.needs_human.noul,
      latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    });
  }

  const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
  const sum = (key) => results.reduce((total, result) => total + result[key], 0);
  const middle = Math.floor(latencies.length / 2);
  const median = latencies.length % 2 ? latencies[middle] : (latencies[middle - 1] + latencies[middle]) / 2;
  const report = [
    "# Jev benchmark report",
    "",
    `Mode: **${mode}**`,
    `Cases: **${results.length}**`,
    `Generated: **${new Date().toISOString()}**`,
    "",
    "The benchmark sends one request per use case with one Choice and one Noul question. Expected labels are the ground truth for routing accuracy.",
    mode === "mock"
      ? "Latency is measured around the mock call; mock mode intentionally reports zero tokens."
      : mode === "local-jev"
        ? "Latency is measured around the local SDK call. Token counts come from the local server response."
        : "Latency is measured around the SDK call. Token counts come from the TypeSafe API response.",
    "",
    "## Results",
    "",
    "| Use case | Expected | Decision | Correct | Confidence | Latency (ms) | Input tokens | Output tokens | Total tokens |",
    "|---|---|---|:---:|---:|---:|---:|---:|---:|",
    ...results.map((result) => `| ${result.name} | ${result.expected} | ${result.department} | ${result.correct ? "yes" : "no"} | ${result.confidence.toFixed(2)} | ${result.latencyMs} | ${result.inputTokens} | ${result.outputTokens} | ${result.totalTokens} |`),
    "",
    "## Comparison",
    "",
    `| Metric | Value |`,
    `|---|---:|`,
    `| Routing accuracy | ${(results.filter((result) => result.correct).length / results.length * 100).toFixed(1)}% |`,
    `| Average latency | ${(sum("latencyMs") / results.length).toFixed(2)} ms |`,
    `| Median latency | ${median.toFixed(2)} ms |`,
    `| Fastest / slowest | ${latencies[0].toFixed(2)} / ${latencies.at(-1).toFixed(2)} ms |`,
    `| Total input tokens | ${sum("inputTokens")} |`,
    `| Total output tokens | ${sum("outputTokens")} |`,
    `| Total tokens | ${sum("totalTokens")} |`,
    "",
    mode === "mock"
      ? "> Mock verification only. Run `npm run local` in one terminal and `npm run local:benchmark` in another for local model measurements."
      : mode === "local-jev"
        ? "> These are local model measurements, not TypeSafe-hosted Jev results; repeat the benchmark for a stable baseline."
        : "> These measurements include network/API latency and reflect this run only; repeat the benchmark for a stable baseline.",
    "",
  ].join("\n");

  await mkdir("reports", { recursive: true });
  const file = mode === "mock" ? "reports/jev-benchmark.mock.md" : "reports/jev-benchmark.md";
  await writeFile(file, report);
  if (mode === "mock") assert.ok(results.every((result) => result.correct), "mock routing check failed");
  console.log(report);
  console.log(`Saved ${file}`);
}

const mock = process.argv.includes("--mock");
if (!mock && !process.env.TYPESAFE_API_KEY) {
  console.error("Missing TYPESAFE_API_KEY. Set it for a real run, or use: npm run benchmark:mock");
  process.exit(1);
}

const mode = mock ? "mock" : process.env.TYPESAFE_BASE_URL ? "local-jev" : "TypeSafe Jev";
await benchmark(mock ? mockClient : new TypeSafeClient(), mode);
