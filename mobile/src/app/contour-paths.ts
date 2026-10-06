// Deterministic topographic contours for the brand header art (sketch 008 variant I, port of the
// sketch's `topo()`). Two path strings so the art is two Svg Path nodes: the sage group of
// rings and the moss group (every fourth ring). Same output on every call: no randomness.

export const CONTOUR_VIEWBOX = "0 0 320 180"

export function buildContourPaths(
  rings = 11,
  step = 15,
  cx = 300,
  cy = 150,
): { sage: string; moss: string } {
  const sage: string[] = []
  const moss: string[] = []
  for (let k = 1; k <= rings; k += 1) {
    const base = 14 * k
    const points: string[] = []
    for (let a = 0; a <= 360; a += step) {
      const r =
        base + 7 * Math.sin((a * Math.PI) / 60 + k) + 5 * Math.cos((a * Math.PI) / 37 + k * 2)
      const x = cx + r * 1.5 * Math.cos((a * Math.PI) / 180)
      const y = cy + r * Math.sin((a * Math.PI) / 180)
      points.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    const ring = `M${points.join("L")}Z`
    if (k % 4 === 0) moss.push(ring)
    else sage.push(ring)
  }
  return { sage: sage.join(" "), moss: moss.join(" ") }
}

export const CONTOUR_PATHS = buildContourPaths()
