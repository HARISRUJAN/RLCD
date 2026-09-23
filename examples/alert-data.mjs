const sensors = [
  ["temperature", "°C", 18, 28, (random) => random < 0.5 ? 72 + random * 18 : -18 + random * 8],
  ["vibration", "g", 0.1, 0.8, (random) => 4 + random * 5],
  ["voltage", "V", 3.1, 3.4, (random) => 2.2 + random * 0.5],
  ["current", "A", 0.2, 1.2, (random) => 3.2 + random * 2.5],
  ["pressure", "kPa", 98, 103, (random) => random < 0.5 ? 75 + random * 10 : 115 + random * 20],
  ["smoke", "obscuration", 0.01, 0.15, (random) => 0.8 + random * 0.2],
];

const rootCauseFamily = {
  temperature: "thermal",
  vibration: "mechanical",
  voltage: "power",
  current: "power",
  pressure: "pressure",
  smoke: "smoke",
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
    const [sensor, unit, normalMin, normalMax, incidentValue] = sensors[Math.floor(random() * sensors.length)];
    const incident = random() < 0.12;
    const value = incident
      ? incidentValue(random())
      : normalMin + random() * (normalMax - normalMin);
    const deviceNumber = 1 + Math.floor(random() * 250);
    const device = `mcu-${String(deviceNumber).padStart(3, "0")}`;
    const zone = `zone-${String(Math.floor(deviceNumber / 10)).padStart(2, "0")}`;
    const battery = (3.55 + random() * 0.6).toFixed(2);
    const rssi = Math.round(-45 - random() * 45);
    return {
      id: `alert-${String(index + 1).padStart(5, "0")}`,
      device,
      zone,
      sequence: index + 1,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index * 5)).toISOString(),
      sensor,
      value: Number(value.toFixed(3)),
      unit,
      normalMin,
      normalMax,
      battery,
      rssi,
      incident,
      rootCauseId: incident ? `${rootCauseFamily[sensor]}:${zone}` : null,
      text: `${device} ${sensor} alert: ${value.toFixed(3)} ${unit}; normal range ${normalMin}-${normalMax} ${unit}; battery ${battery} V; RSSI ${rssi} dBm.`,
    };
  });
}
