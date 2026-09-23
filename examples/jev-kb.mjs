import { performance } from "node:perf_hooks";
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";

const knowledgeBase = [
  {
    id: "refunds",
    title: "Refund policy",
    text: "Damaged items can be refunded within 30 days of delivery. Include a photo of the damage when contacting support. Approved refunds return to the original payment method in 5 to 7 business days.",
  },
  {
    id: "shipping",
    title: "Shipping times",
    text: "Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days. Orders are tracked from the shipping confirmation email.",
  },
  {
    id: "account",
    title: "Account access",
    text: "Use the Forgot password link on the sign-in page to receive a reset email. Reset links expire after 30 minutes. Contact support if the email does not arrive.",
  },
  {
    id: "security",
    title: "Suspicious account activity",
    text: "If you see an unfamiliar login, change your password immediately, sign out of other sessions, and contact support so the account can be reviewed.",
  },
  {
    id: "plans",
    title: "Business plans",
    text: "Business plans include team seats, priority support, and monthly invoicing. Contact sales for volume pricing and a custom quote.",
  },
];

const demoQuestions = [
  "How long do refunds take for a damaged item?",
  "How fast is standard shipping?",
  "I forgot my password. How do I get back into my account?",
  "I see a login from a device I do not recognize.",
  "Can business customers get a volume discount?",
  "Who won the 2024 football final?",
];

const stopWords = new Set("a an and are can do for from get how i in is me not of on see the to what who you".split(" "));

function tokens(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => !stopWords.has(token)));
}

function retrieve(question) {
  const queryTokens = tokens(question);
  // ponytail: keyword retrieval is O(documents × words); use embeddings only when the KB is large enough to justify them.
  return knowledgeBase
    .map((document) => {
      const documentTokens = tokens(`${document.title} ${document.text}`);
      const matched = [...queryTokens].filter((token) => documentTokens.has(token));
      return { ...document, score: matched.length, matched };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1);
}

const questions = {
  topic: choice("Which knowledge-base topic best matches the question?", {
    refunds: "Refunds, damaged items, or payment returns",
    shipping: "Delivery speed, tracking, or shipping",
    account: "Password reset or account access",
    security: "Unrecognized logins or suspicious account activity",
    plans: "Business plans, sales, or volume pricing",
    out_of_scope: "The knowledge base does not cover this question",
  }),
  supported: noul(
    "The retrieved knowledge-base passages contain the answer to the user question.",
    {
      true: "The answer is explicitly stated in the passages.",
      false: "The answer is not stated in the passages.",
    },
  ),
};

if (!process.env.TYPESAFE_API_KEY) {
  console.error("Missing TYPESAFE_API_KEY. Start local-jev and run: npm run kb");
  process.exit(1);
}

const client = new TypeSafeClient();
const requested = process.argv.slice(2).filter((argument) => argument !== "--demo").join(" ");
const runQuestions = requested ? [requested] : demoQuestions;

console.log("KB demo: local documents -> keyword retrieval -> Jev decision -> grounded source");
console.log(`Knowledge base: ${knowledgeBase.length} documents; questions: ${runQuestions.length}`);

for (const question of runQuestions) {
  const sources = retrieve(question);
  const context = sources.length
    ? sources.map(({ id, title, text }) => `[${id}] ${title}: ${text}`).join("\n")
    : "No knowledge-base passages matched this question.";
  const started = performance.now();
  const response = await client.systemOne({
    state: { question, retrieved_context: context },
    questions,
  });
  const latencyMs = Math.round((performance.now() - started) * 100) / 100;
  const topic = response.answers.topic;
  const support = response.answers.supported.noul;
  const grounded = sources.length > 0 && support >= 0.7;

  console.log(`\nQuestion: ${question}`);
  console.log(`Retrieved: ${sources.length ? sources.map(({ id, score, matched }) => `${id} (${score}: ${matched.join(", ")})`).join("; ") : "none"}`);
  console.log(`Jev topic: ${topic.choice} (confidence ${topic.confidence.toFixed(2)})`);
  console.log(`Jev supports answer: ${support.toFixed(2)}`);
  console.log(`Result: ${grounded ? `use source ${sources[0].id} as the grounded answer` : "no grounded answer; route to a human"}`);
  console.log(`Trace: ${latencyMs} ms, ${response.usage.input_tokens} input tokens, ${response.usage.output_tokens} output tokens`);
  if (grounded) console.log(`Source text: ${sources[0].text}`);
}
