/** Monotone cubic interpolation path (like Swift Charts' .monotone). */
export function smoothPath(points: Array<[number, number]>) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0][0]},${points[0][1]}`;
  const dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    m[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${(x0 + h).toFixed(2)},${(y0 + t[i] * h).toFixed(2)} ${(x1 - h).toFixed(2)},${(y1 - t[i + 1] * h).toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return d;
}

/** Evenly spaced "nice" ticks that include the data range. */
export function niceTicks(min: number, max: number, count = 3) {
  const span = Math.max(1, max - min);
  const rawStep = span / (count - 1);
  const step = Math.max(1, Math.ceil(rawStep));
  const mid = Math.round((min + max) / 2);
  const low = mid - step * Math.floor((count - 1) / 2);
  let ticks = Array.from({ length: count }, (_, i) => low + i * step);
  while (ticks[0] > min) ticks = ticks.map((v) => v - step);
  while (ticks[ticks.length - 1] < max) ticks = ticks.map((v) => v + step);
  return ticks;
}
