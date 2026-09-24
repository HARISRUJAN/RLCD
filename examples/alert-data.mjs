const metrics = [
  ["latency", "ms", 80, 220, (random) => random < 0.5 ? 900 + random * 400 : 10 + random * 30],
  ["error-rate", "%", 0.1, 2, (random) => 10 + random * 15],
  ["queue-depth", "items", 10, 100, (random) => 300 + random * 250],
  ["cpu-utilization", "%", 20, 70, (random) => 90 + random * 10],
  ["request-rate", "req/s", 100, 500, (random) => 5 + random * 20],
  ["cache-hit-rate", "%", 80, 99, (random) => 35 + random * 20],
];

const rootCauseFamily = {
  latency: "performance",
  "error-rate": "reliability",
  "queue-depth": "capacity",
  "cpu-utilization": "compute",
  "request-rate": "traffic",
  "cache-hit-rate": "caching",
};

export function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

export function generateAlerts(count, seed) {
  const random = rng(seed);
  return Array.from({ length: count }, (_, index) => {
    const [metric, unit, normalMin, normalMax, incidentValue] = metrics[Math.floor(random() * metrics.length)];
    const incident = random() < 0.12;
    const value = incident
      ? incidentValue(random())
      : normalMin + random() * (normalMax - normalMin);
    const serviceNumber = 1 + Math.floor(random() * 250);
    const service = `svc-${String(serviceNumber).padStart(3, "0")}`;
    const region = `region-${String(Math.floor(serviceNumber / 10)).padStart(2, "0")}`;
    const throughput = Math.round(100 + random() * 900);
    const availability = (99 + random()).toFixed(2);
    return {
      id: `alert-${String(index + 1).padStart(5, "0")}`,
      service,
      region,
      sequence: index + 1,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index * 5)).toISOString(),
      metric,
      value: Number(value.toFixed(3)),
      unit,
      normalMin,
      normalMax,
      throughput,
      availability,
      incident,
      rootCauseId: incident ? `${rootCauseFamily[metric]}:${region}` : null,
      text: `${service} ${metric} alert: ${value.toFixed(3)} ${unit}; normal range ${normalMin}-${normalMax} ${unit}; throughput ${throughput} req/s; availability ${availability}%.`,
    };
  });
}
