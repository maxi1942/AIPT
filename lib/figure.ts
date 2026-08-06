export type Pt = [number, number];

/**
 * SVG path for a tapered capsule (limb segment): a quad between two circles
 * of radius r1 at `a` and r2 at `b`, with rounded ends. This is what turns a
 * stick-figure line into a limb with volume.
 */
export function capsulePath(a: Pt, b: Pt, r1: number, r2: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const p1x = a[0] + nx * r1;
  const p1y = a[1] + ny * r1;
  const p2x = b[0] + nx * r2;
  const p2y = b[1] + ny * r2;
  const p3x = b[0] - nx * r2;
  const p3y = b[1] - ny * r2;
  const p4x = a[0] - nx * r1;
  const p4y = a[1] - ny * r1;

  return (
    `M${p1x.toFixed(2)},${p1y.toFixed(2)} ` +
    `L${p2x.toFixed(2)},${p2y.toFixed(2)} ` +
    `A${r2},${r2} 0 1 0 ${p3x.toFixed(2)},${p3y.toFixed(2)} ` +
    `L${p4x.toFixed(2)},${p4y.toFixed(2)} ` +
    `A${r1},${r1} 0 1 0 ${p1x.toFixed(2)},${p1y.toFixed(2)} Z`
  );
}
