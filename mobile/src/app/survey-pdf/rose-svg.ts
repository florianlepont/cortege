import { escapeHtml, formatDecimal, splitLabel, svgNumber } from "./html"
import { toneColor, zoneTint } from "./score-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"
import type { ScoreTone } from "@cortege/ibp-domain"

// The rose of the factor chart (phase 33, D-27, UI-SPEC B.5 amendment (charts)): our own static
// redrawing of the CNPF ten-axis chart. Ten axes A to J clockwise from 12 o'clock, a ring at every
// score a factor may take (0, 2, 5 today) with a soft zone tint between rings, the survey as a
// polygon line with a dot per factor, and the factor names around it, green for the stand and
// management factors and brown for the context ones. Pure: the ring scores and their tones, the
// ten titles and points, the groups and the spoken label are all given, computed upstream from the
// domain package and the catalogue. A missing factor gets a dashed spoke, no dot and a broken
// polygon: a value the survey does not have is never drawn. Static solid SVG only: no transparency,
// no colour ramp, no fill pattern, no transform, no turned text, no script, no reference to any
// resource. Numbers go through `svgNumber`, texts and colours through `escapeHtml`.

export type RoseRing = { value: number; tone: ScoreTone }

export type RoseItem = {
  factor: string
  title: string
  /** The retained points, or null when the factor is missing. */
  points: number | null
  group: "stand" | "context"
}

export type RoseInput = {
  /** The ring scores in ascending order, each with its tone. */
  rings: readonly RoseRing[]
  /** One item per axis, in the order of the axes. */
  items: readonly RoseItem[]
  /** The spoken label of the chart. */
  label: string
}

export type RoseOptions = {
  /** The chart title in a header band, or null for none. */
  title: string | null
  /** Panel and hub fill (a palette value). */
  fill: string
}

const HEADER = 16
const TITLE_BASELINE = 11
const CENTRE_RIGHT = 3 // the centre sits this far right of the middle of the panel
const CENTRE_DOWN = 71 // and this far under the header band
const HUB_RADIUS = 10
const OUTER_RADIUS = 46
const NAME_RADIUS = 55
const PANEL_RADIUS = 8
const STROKE = 1
const FONT_SIZE = 8
const RING_WIDTH = 1.5
const SPOKE_WIDTH = 0.75
const MISSING_SPOKE_DASH = "2 2"
const SCALE_WIDTH = 0.75
const SCALE_OFFSET = 2.5 // ring value: right of the scale line and above its ring
const POLYGON_WIDTH = 2
const VERTEX_RADIUS = 2.5
const LINE_STEP = 10
const SIDE_SINE = 0.2 // a name left or right of its axis beyond this sine
const POLE_COSINE = 0.8 // a name above or below its axis beyond this cosine
const ABOVE_LAST_BASELINE = 2
const BELOW_FIRST_BASELINE = 6.5
const MIDDLE_DROP = 3
const NAME_MAX_CHARS = 12

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** The rose as one `svg` element drawn at `size` design units. */
export function buildRoseSvg(
  input: RoseInput,
  palette: PdfPalette,
  size: { width: number; height: number },
  options: RoseOptions,
): string {
  const font = PDF_FONT_FAMILIES
  const { width, height } = size
  const header = options.title === null ? 0 : HEADER
  const cx = width / 2 + CENTRE_RIGHT
  const cy = header + CENTRE_DOWN
  const count = input.items.length
  const firstRing = input.rings[0]
  const lastRing = input.rings[input.rings.length - 1]
  const low = firstRing ? firstRing.value : 0
  const high = lastRing ? lastRing.value : low + 1
  const span = Math.max(high - low, 1)
  const radiusOf = (points: number) =>
    HUB_RADIUS + ((clamp(points, low, high) - low) / span) * (OUTER_RADIUS - HUB_RADIUS)
  const angleOf = (index: number) => ((360 / count) * (index + 0.5) * Math.PI) / 180
  const at = (index: number, radius: number) => ({
    x: cx + radius * Math.sin(angleOf(index)),
    y: cy - radius * Math.cos(angleOf(index)),
  })

  const text = (
    point: { x: number; y: number },
    anchor: "start" | "middle" | "end",
    face: "body" | "label",
    fill: string,
    content: string,
  ) =>
    `<text x="${svgNumber(point.x)}" y="${svgNumber(point.y)}" text-anchor="${anchor}" font-family="${escapeHtml(font[face])}" font-size="${svgNumber(FONT_SIZE)}" fill="${escapeHtml(fill)}">${escapeHtml(content)}</text>`
  const line = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    stroke: string,
    strokeWidth: number,
    dash: string | null,
  ) =>
    `<line x1="${svgNumber(from.x)}" y1="${svgNumber(from.y)}" x2="${svgNumber(to.x)}" y2="${svgNumber(to.y)}" stroke="${escapeHtml(stroke)}" stroke-width="${svgNumber(strokeWidth)}"${dash === null ? "" : ` stroke-dasharray="${dash}"`}/>`
  const disc = (radius: number, attrs: string) =>
    `<circle cx="${svgNumber(cx)}" cy="${svgNumber(cy)}" r="${svgNumber(radius)}" ${attrs}/>`

  const half = STROKE / 2
  const panel = `<rect x="${svgNumber(half)}" y="${svgNumber(half)}" width="${svgNumber(width - STROKE)}" height="${svgNumber(height - STROKE)}" rx="${svgNumber(PANEL_RADIUS)}" fill="${escapeHtml(options.fill)}" stroke="${escapeHtml(palette.line)}" stroke-width="${svgNumber(STROKE)}"/>`
  const title =
    options.title === null
      ? ""
      : text({ x: width / 2, y: TITLE_BASELINE }, "middle", "label", palette.ink, options.title)

  // Zones: from the outermost ring inwards, every ring but the first, in the soft tint of its tone.
  const zones = input.rings
    .slice(1)
    .reverse()
    .map((ring) =>
      disc(
        radiusOf(ring.value),
        `class="rose-zone" fill="${escapeHtml(zoneTint(ring.tone, false, palette))}"`,
      ),
    )
    .join("")
  const hub = disc(HUB_RADIUS, `class="rose-hub" fill="${escapeHtml(options.fill)}"`)

  const spokes = input.items
    .map((item, index) =>
      item.points === null
        ? line(
            at(index, HUB_RADIUS),
            at(index, OUTER_RADIUS),
            palette.inkMuted,
            STROKE,
            MISSING_SPOKE_DASH,
          )
        : line(at(index, HUB_RADIUS), at(index, OUTER_RADIUS), palette.paper, SPOKE_WIDTH, null),
    )
    .join("")

  const rings = input.rings
    .map((ring) =>
      disc(
        radiusOf(ring.value),
        `class="rose-ring" fill="none" stroke="${escapeHtml(toneColor(ring.tone, palette))}" stroke-width="${svgNumber(RING_WIDTH)}"`,
      ),
    )
    .join("")

  const scale =
    line(
      { x: cx, y: cy - HUB_RADIUS },
      { x: cx, y: cy - OUTER_RADIUS },
      palette.inkMuted,
      SCALE_WIDTH,
      null,
    ) +
    input.rings
      .map((ring) =>
        text(
          { x: cx + SCALE_OFFSET, y: cy - radiusOf(ring.value) - SCALE_OFFSET },
          "start",
          "body",
          palette.ink,
          formatDecimal(ring.value),
        ),
      )
      .join("")

  // The polygon: one closed path when every factor is filled, else one segment per pair of
  // neighbouring filled factors (the last factor's neighbour is the first), so a missing factor
  // breaks the line on both sides.
  const vertex = (index: number) => {
    const points = input.items[index].points
    return points === null ? null : at(index, radiusOf(points))
  }
  const pathPoint = (point: { x: number; y: number }) =>
    `${svgNumber(point.x)} ${svgNumber(point.y)}`
  const vertices = input.items.map((_, index) => vertex(index))
  let outline = ""
  if (count > 0 && vertices.every((point) => point !== null)) {
    outline = `M${vertices.map((point) => pathPoint(point as { x: number; y: number })).join(" L")} Z`
  } else {
    const segments: string[] = []
    for (let index = 0; index < count; index += 1) {
      const from = vertices[index]
      const to = vertices[(index + 1) % count]
      if (from !== null && to !== null && count > 1) {
        segments.push(`M${pathPoint(from)} L${pathPoint(to)}`)
      }
    }
    outline = segments.join(" ")
  }
  const polygon =
    outline === ""
      ? ""
      : `<path class="rose-polygon" d="${outline}" fill="none" stroke="${escapeHtml(palette.accent)}" stroke-width="${svgNumber(POLYGON_WIDTH)}" stroke-linejoin="round" stroke-linecap="round"/>`
  const dots = vertices
    .map((point) =>
      point === null
        ? ""
        : `<circle class="rose-vertex" cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${svgNumber(VERTEX_RADIUS)}" fill="${escapeHtml(palette.accent)}"/>`,
    )
    .join("")

  const names = input.items
    .map((item, index) => {
      const lines = splitLabel(item.title, NAME_MAX_CHARS)
      const anchor = at(index, NAME_RADIUS)
      const sine = Math.sin(angleOf(index))
      const cosine = Math.cos(angleOf(index))
      const textAnchor = sine > SIDE_SINE ? "start" : sine < -SIDE_SINE ? "end" : "middle"
      let firstBaseline = anchor.y + MIDDLE_DROP - (LINE_STEP / 2) * (lines.length - 1)
      if (cosine > POLE_COSINE) {
        firstBaseline = anchor.y - ABOVE_LAST_BASELINE - LINE_STEP * (lines.length - 1)
      } else if (cosine < -POLE_COSINE) {
        firstBaseline = anchor.y + BELOW_FIRST_BASELINE
      }
      const ink = item.group === "stand" ? palette.accent : palette.contextInk
      return lines
        .map((part, row) =>
          text({ x: anchor.x, y: firstBaseline + row * LINE_STEP }, textAnchor, "body", ink, part),
        )
        .join("")
    })
    .join("")

  return `<svg class="chart-rose" role="img" aria-label="${escapeHtml(input.label)}" width="${svgNumber(width)}" height="${svgNumber(height)}" viewBox="0 0 ${svgNumber(width)} ${svgNumber(height)}">${panel}${title}${zones}${hub}${spokes}${rings}${scale}${polygon}${dots}${names}</svg>`
}
