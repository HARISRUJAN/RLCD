#!/usr/bin/env python3
"""Run the seed-42 incident classifier through Laya's typed-decisions model."""

from __future__ import annotations

import math
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import laya


COUNT = int(os.environ.get("ALERT_COUNT", "10"))
SEED = int(os.environ.get("ALERT_SEED", "42"))
BATCH_SIZE = int(os.environ.get("LAYA_BATCH_SIZE", "32"))
THRESHOLD = float(os.environ.get("INCIDENT_THRESHOLD", "0.5"))
DEVICE = os.environ.get("LAYA_DEVICE")

METRICS = (
    ("latency", "ms", 80, 220),
    ("error-rate", "%", 0.1, 2),
    ("queue-depth", "items", 10, 100),
    ("cpu-utilization", "%", 20, 70),
    ("request-rate", "req/s", 100, 500),
    ("cache-hit-rate", "%", 80, 99),
)


class Rng:
    def __init__(self, seed: int):
        self.value = seed & 0xFFFFFFFF

    def __call__(self) -> float:
        self.value = (self.value * 1664525 + 1013904223) & 0xFFFFFFFF
        return self.value / 2**32


def js_round(value: float) -> int:
    return math.floor(value + 0.5)


def generate_alerts(count: int, seed: int) -> list[dict]:
    random = Rng(seed)
    families = {
        "latency": "performance",
        "error-rate": "reliability",
        "queue-depth": "capacity",
        "cpu-utilization": "compute",
        "request-rate": "traffic",
        "cache-hit-rate": "caching",
    }
    alerts = []
    for index in range(count):
        metric, unit, normal_min, normal_max = METRICS[int(random() * len(METRICS))]
        incident = random() < 0.12
        if incident:
            sample = random()
            if metric == "latency":
                value = 900 + sample * 400 if sample < 0.5 else 10 + sample * 30
            elif metric == "error-rate":
                value = 10 + sample * 15
            elif metric == "queue-depth":
                value = 300 + sample * 250
            elif metric == "cpu-utilization":
                value = 90 + sample * 10
            elif metric == "request-rate":
                value = 5 + sample * 20
            else:
                value = 35 + sample * 20
        else:
            value = normal_min + random() * (normal_max - normal_min)
        service_number = 1 + int(random() * 250)
        service = f"svc-{service_number:03d}"
        region = f"region-{service_number // 10:02d}"
        throughput = js_round(100 + random() * 900)
        availability = f"{99 + random():.2f}"
        value_text = f"{value:.3f}"
        alerts.append(
            {
                "id": f"alert-{index + 1:05d}",
                "service": service,
                "region": region,
                "sequence": index + 1,
                "timestamp": (
                    datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=index * 5)
                ).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                "metric": metric,
                "value": float(value_text),
                "unit": unit,
                "normalMin": normal_min,
                "normalMax": normal_max,
                "throughput": throughput,
                "availability": availability,
                "incident": incident,
                "rootCauseId": f"{families[metric]}:{region}" if incident else None,
                "text": f"{service} {metric} alert: {value_text} {unit}; normal range {normal_min}-{normal_max} {unit}; throughput {throughput} req/s; availability {availability}%.",
            }
        )
    return alerts


def stats(predictions: list[dict]) -> dict:
    correct = sum(row["predicted"] == row["expected"] for row in predictions)
    true_positive = sum(row["expected"] and row["predicted"] for row in predictions)
    false_positive = sum(not row["expected"] and row["predicted"] for row in predictions)
    false_negative = sum(row["expected"] and not row["predicted"] for row in predictions)
    precision = true_positive / (true_positive + false_positive or 1)
    recall = true_positive / (true_positive + false_negative or 1)
    f1 = 2 * precision * recall / (precision + recall or 1)
    input_tokens = sum(row["input_tokens"] for row in predictions)
    output_tokens = sum(row["output_tokens"] for row in predictions)
    return {
        "accuracy": correct / len(predictions),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
    }


def render_report(alerts: list[dict], predictions: list[dict], elapsed_ms: float, device: str) -> str:
    summary = stats(predictions)
    lines = [
        f"# {len(alerts):,} service-health alert comparison — Laya",
        "",
        f"Alerts: **{len(alerts):,}**",
        f"Seed: **{SEED}**",
        f"Incident rate: **{sum(alert['incident'] for alert in alerts) / len(alerts) * 100:.2f}%**",
        f"Generated: **{datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')}**",
        "",
        "The same deterministic service-health alert stream, Noul question, threshold, and labels are used by the Jev report. Laya runs the cases in batches.",
        "",
        "## Comparison",
        "",
        "| Provider | Accuracy | Precision | Recall | F1 | Batch ms | Amortized ms/alert | Input tokens | Output tokens | Total tokens | Cost |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
        f"| Laya (typed-decisions) | {summary['accuracy'] * 100:.2f}% | {summary['precision'] * 100:.2f}% | {summary['recall'] * 100:.2f}% | {summary['f1'] * 100:.2f}% | {elapsed_ms:.2f} | {elapsed_ms / len(alerts):.2f} | {summary['input_tokens']:,} | {summary['output_tokens']:,} | {summary['total_tokens']:,} | $0.000000 |",
        "",
        "## Configuration",
        "",
        "- Laya model: `convaiinnovations/laya:typed-decisions`",
        f"- Device: `{device}`",
        f"- Batch size: `{BATCH_SIZE}`",
        f"- Incident threshold: `{THRESHOLD}`",
        "",
        "## Limits",
        "",
        "The generated labels are rule-based ground truth, not human labels. Laya reports zero output tokens because it is a non-autoregressive typed-decision model. Batch timing is not directly equivalent to Jev per-request latency.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    if COUNT < 1 or BATCH_SIZE < 1:
        raise SystemExit("ALERT_COUNT and LAYA_BATCH_SIZE must be positive integers")
    alerts = generate_alerts(COUNT, SEED)
    questions = {
        "incident": {
            "type": "noul",
            "instructions": "Does this service-health alert represent a real incident requiring operator action?",
        }
    }
    agent = laya.load("convaiinnovations/laya", subfolder="typed-decisions", device=DEVICE)
    started = time.perf_counter()
    try:
        results = agent.predict_batch(
            [{"alert": alert["text"]} for alert in alerts],
            questions,
            batch_size=BATCH_SIZE,
            sort_by_length=True,
        )
        elapsed_ms = (time.perf_counter() - started) * 1000
    finally:
        device = str(agent.device)
        agent.__exit__(None, None, None)

    predictions = []
    for alert, result in zip(alerts, results):
        answer = result["answers"]["incident"]
        score = float(answer["noul"])
        usage = result.get("usage") or {}
        predictions.append(
            {
                "expected": alert["incident"],
                "predicted": score >= THRESHOLD,
                "input_tokens": int(usage.get("input_tokens", 0)),
                "output_tokens": int(usage.get("output_tokens", 0)),
            }
        )

    output = render_report(alerts, predictions, elapsed_ms, device)
    path = Path("reports") / f"alert-{len(alerts)}-laya.md"
    path.parent.mkdir(exist_ok=True)
    path.write_text(output)
    print(output)
    print(f"Saved {path}")


if __name__ == "__main__":
    main()
