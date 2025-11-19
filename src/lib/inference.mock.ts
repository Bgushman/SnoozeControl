// Simulate EAR around 0.28 (open) with occasional dips to ~0.14 (blink/closed).
export function mockEar(): number {
  const base = 0.28 + (Math.random() - 0.5) * 0.02; // 0.27–0.29
  const blink = Math.random() < 0.07 ? -0.12 : 0;   // ~7% chance to dip
  return Math.max(0.1, base + blink);
}
