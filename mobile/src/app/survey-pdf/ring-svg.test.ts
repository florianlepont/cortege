import { buildRingSvg } from "./ring-svg"

const base = {
  size: 112,
  stroke: 8,
  ratio: 0.64,
  track: "chartGrid",
  arc: "bandHigh",
  label: "Score IBP : 32 sur 50",
}

const circumference = 2 * Math.PI * 52
const printed = (value: number): string => String(Math.round(value * 10) / 10)

describe("buildRingSvg", () => {
  it("is one labelled svg of the requested size with a track and an arc", () => {
    const svg = buildRingSvg(base)
    expect(svg.match(/<svg\b/g)).toHaveLength(1)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="Score IBP : 32 sur 50"')
    expect(svg).toContain('width="112"')
    expect(svg).toContain('height="112"')
    expect(svg).toContain('viewBox="0 0 112 112"')
    expect(svg.match(/<circle\b/g)).toHaveLength(2)
  })

  it("draws the track as a full circle in the track colour", () => {
    const svg = buildRingSvg(base)
    expect(svg).toMatch(/<circle class="ring-track" cx="56" cy="56" r="52"[^>]*stroke="chartGrid"/)
    expect(svg).toMatch(/class="ring-track"[^>]*stroke-width="8"/)
    expect(svg).toMatch(/class="ring-track"[^>]*fill="none"/)
  })

  it("draws the arc from 12 o'clock with round caps and the dash of the ratio", () => {
    const svg = buildRingSvg(base)
    expect(svg).toMatch(/<circle class="ring-arc" cx="56" cy="56" r="52"[^>]*stroke="bandHigh"/)
    expect(svg).toContain('stroke-linecap="round"')
    expect(svg).toContain('transform="rotate(-90 56 56)"')
    expect(svg).toContain(
      `stroke-dasharray="${printed(circumference * 0.64)} ${printed(circumference)}"`,
    )
  })

  it("takes the radius and the centre from the size and the stroke", () => {
    const svg = buildRingSvg({ ...base, size: 64, stroke: 6 })
    expect(svg).toContain('r="29"')
    expect(svg).toContain('cx="32"')
    expect(svg).toContain('transform="rotate(-90 32 32)"')
    expect(svg).toContain(
      `stroke-dasharray="${printed(2 * Math.PI * 29 * 0.64)} ${printed(2 * Math.PI * 29)}"`,
    )
  })

  it("draws the track only for a ratio of 0, so no round-cap dot appears", () => {
    const svg = buildRingSvg({ ...base, ratio: 0 })
    expect(svg.match(/<circle\b/g)).toHaveLength(1)
    expect(svg).not.toContain("ring-arc")
    expect(svg).not.toContain("stroke-linecap")
  })

  it("draws no arc whose printed length would round to nothing", () => {
    expect(buildRingSvg({ ...base, ratio: 0.00001 })).not.toContain("ring-arc")
  })

  it("clamps a ratio above 1 or below 0 and reads NaN as 0", () => {
    const full = buildRingSvg({ ...base, ratio: 1 })
    expect(buildRingSvg({ ...base, ratio: 3 })).toBe(full)
    expect(buildRingSvg({ ...base, ratio: Number.POSITIVE_INFINITY })).toBe(full)
    const empty = buildRingSvg({ ...base, ratio: 0 })
    expect(buildRingSvg({ ...base, ratio: -2 })).toBe(empty)
    expect(buildRingSvg({ ...base, ratio: Number.NaN })).toBe(empty)
    expect(buildRingSvg({ ...base, ratio: Number.NEGATIVE_INFINITY })).toBe(empty)
    expect(full).toContain(`stroke-dasharray="${printed(circumference)} ${printed(circumference)}"`)
  })

  it("writes only plain numbers", () => {
    const svg = buildRingSvg({ ...base, ratio: 0.3333333 })
    expect(svg).not.toMatch(/NaN|Infinity|undefined|e[+-]\d/)
    expect(svg).not.toMatch(/\d\.\d{2,}/)
  })

  it("holds no opacity, gradient, link or script", () => {
    const svg = buildRingSvg(base)
    expect(svg).not.toContain("opacity")
    expect(svg).not.toContain("Gradient")
    expect(svg).not.toMatch(/https?:|<script|xmlns/)
  })

  it("escapes the label and the colours it is given", () => {
    const svg = buildRingSvg({
      ...base,
      label: '"><script>x</script>',
      track: '"><b>',
      arc: "'onload=x",
    })
    expect(svg).not.toContain("<script")
    expect(svg).not.toContain("<b>")
    expect(svg).toContain("&quot;&gt;&lt;script&gt;")
    expect(svg).toContain("&#39;onload=x")
    expect(svg.match(/<svg\b/g)).toHaveLength(1)
  })

  it("never prints a dash", () => {
    expect(buildRingSvg(base)).not.toContain("—")
  })
})
