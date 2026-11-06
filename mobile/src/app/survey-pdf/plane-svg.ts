import { escapeHtml, formatDecimal, splitLabel, svgNumber } from "./html"
import type { ChartZone } from "./score-section"
import { zoneTint } from "./score-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette } from "./types"

// The plane of the factor charts (phase 33, D-27, D-28, UI-SPEC B.5 amendment (charts)): our own
// static redrawing of the CNPF chart "IBP contexte face à l'IBP peuplement et gestion". The stand
// and management score is on x with solid tinted bands, the context score is on y with dashed level
// lines, and the survey is one marker at its two sub-scores. Pure: it draws what it is given. The
// zones (cut points, names, tones), the sub-scores, the axis titles and the spoken label are all
// computed upstream from the domain package and the catalogue, so no rule and no word is written
// here. Static solid SVG only: no transparency, no colour ramp, no fill pattern, no transform, no
// turned text, no script, no reference to any resource. Numbers go through `svgNumber`, texts and
// colours through `escapeHtml`, colours come from the palette argument only.

export type PlaneInput = {
  /** Stand and management sub-score, or null when it is missing (no marker is drawn). */
  stand: number | null
  /** Context sub-score, or null when it is missing (no marker is drawn). */
  context: number | null
  /** The bands of the x axis, in ascending order, 0 to the stand maximum. */
  standZones: readonly ChartZone[]
  /** The levels of the y axis, in ascending order, 0 to the context maximum. */
  contextLevels: readonly ChartZone[]
  /** Title of the x axis, printed at the bottom right. */
  xTitle: string
  /** Title of the y axis, printed at the top left. */
  yTitle: string
  /** The spoken label of the chart. */
  label: string
}

export type PlaneOptions = {
  /** The chart title in a header band, or null for none (the summary has its own heading). */
  title: string | null
  /** Panel fill (a palette value): `paper` on the card, `panel` on the summary page. */
  fill: string
}

const HEADER = 16
const TITLE_BASELINE = 11
const PLOT_LEFT = 46
const PLOT_RIGHT_MARGIN = 12
const PLOT_TOP_ROOM = 18
const PLOT_BOTTOM_ROOM = 44
const PANEL_RADIUS = 8
const STROKE = 1
const FONT_SIZE = 8
const TICK_BASELINE = 10 // x tick values under the plot
const NAME_BASELINE = 20 // first line of a band name under the plot
const NAME_STEP = 9
const NAME_MAX_CHARS = 9
const GUTTER = 4 // between the y texts and the left axis
const TEXT_DROP = 3 // y texts: baseline under the middle of what they name
const Y_TITLE_X = 8
const Y_TITLE_BASELINE = 12 // under the header band
const X_TITLE_BASELINE_UP = 4 // above the chart bottom
const LEVEL_DASH = "3 3"
const GUIDE_DASH = "2 2"
const MARKER_RADIUS = 5
const MARKER_RING = 1.5

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

const isScore = (value: number | null): value is number => value !== null && Number.isFinite(value)

/** The plane as one `svg` element drawn at `size` design units. */
export function buildPlaneSvg(
  input: PlaneInput,
  palette: PdfPalette,
  size: { width: number; height: number },
  options: PlaneOptions,
): string {
  const font = PDF_FONT_FAMILIES
  const { width, height } = size
  const header = options.title === null ? 0 : HEADER
  const left = PLOT_LEFT
  const right = width - PLOT_RIGHT_MARGIN
  const top = header + PLOT_TOP_ROOM
  const bottom = height - PLOT_BOTTOM_ROOM
  const lastZone = input.standZones[input.standZones.length - 1]
  const lastLevel = input.contextLevels[input.contextLevels.length - 1]
  const xMax = Math.max(1, lastZone ? lastZone.to : 1)
  const yMax = Math.max(1, lastLevel ? lastLevel.to : 1)
  const x = (value: number) => left + (clamp(value, 0, xMax) / xMax) * (right - left)
  const y = (value: number) => bottom - (clamp(value, 0, yMax) / yMax) * (bottom - top)

  const text = (
    at: { x: number; y: number },
    anchor: "start" | "middle" | "end",
    face: "body" | "label",
    fill: string,
    content: string,
  ) =>
    `<text x="${svgNumber(at.x)}" y="${svgNumber(at.y)}" text-anchor="${anchor}" font-family="${escapeHtml(font[face])}" font-size="${svgNumber(FONT_SIZE)}" fill="${escapeHtml(fill)}">${escapeHtml(content)}</text>`
  const line = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    stroke: string,
    dash: string | null,
  ) =>
    `<line x1="${svgNumber(from.x)}" y1="${svgNumber(from.y)}" x2="${svgNumber(to.x)}" y2="${svgNumber(to.y)}" stroke="${escapeHtml(stroke)}" stroke-width="${svgNumber(STROKE)}"${dash === null ? "" : ` stroke-dasharray="${dash}"`}/>`

  const half = STROKE / 2
  const panel = `<rect x="${svgNumber(half)}" y="${svgNumber(half)}" width="${svgNumber(width - STROKE)}" height="${svgNumber(height - STROKE)}" rx="${svgNumber(PANEL_RADIUS)}" fill="${escapeHtml(options.fill)}" stroke="${escapeHtml(palette.line)}" stroke-width="${svgNumber(STROKE)}"/>`
  const title =
    options.title === null
      ? ""
      : text({ x: width / 2, y: TITLE_BASELINE }, "middle", "label", palette.ink, options.title)

  // The first and the last band take the strong tint of their tone, the others the soft one.
  const bands = input.standZones
    .map((zone, index) => {
      const strong = index === 0 || index === input.standZones.length - 1
      return `<rect class="plane-band" x="${svgNumber(x(zone.from))}" y="${svgNumber(top)}" width="${svgNumber(x(zone.to) - x(zone.from))}" height="${svgNumber(bottom - top)}" fill="${escapeHtml(zoneTint(zone.tone, strong, palette))}"/>`
    })
    .join("")

  // One dashed line at every inner level bound, across the plot.
  const levelLines = input.contextLevels
    .slice(0, -1)
    .map((level) =>
      line({ x: left, y: y(level.to) }, { x: right, y: y(level.to) }, palette.ink, LEVEL_DASH),
    )
    .join("")

  const axes =
    line({ x: left, y: top }, { x: left, y: bottom }, palette.inkMuted, null) +
    line({ x: left, y: bottom }, { x: right, y: bottom }, palette.inkMuted, null)

  const xBounds = [0, ...input.standZones.map((zone) => zone.to)]
  const xTicks = xBounds
    .map((value) =>
      text(
        { x: x(value), y: bottom + TICK_BASELINE },
        "middle",
        "body",
        palette.inkMuted,
        formatDecimal(value, 0),
      ),
    )
    .join("")
  const bandNames = input.standZones
    .map((zone) =>
      splitLabel(zone.name, NAME_MAX_CHARS)
        .map((part, row) =>
          text(
            { x: (x(zone.from) + x(zone.to)) / 2, y: bottom + NAME_BASELINE + row * NAME_STEP },
            "middle",
            "body",
            palette.ink,
            part,
          ),
        )
        .join(""),
    )
    .join("")

  const yBounds = [0, ...input.contextLevels.map((level) => level.to)]
  const yTicks = yBounds
    .map((value) =>
      text(
        { x: left - GUTTER, y: y(value) + TEXT_DROP },
        "end",
        "body",
        palette.inkMuted,
        formatDecimal(value, 0),
      ),
    )
    .join("")
  const levelNames = input.contextLevels
    .map((level) =>
      text(
        { x: left - GUTTER, y: y((level.from + level.to) / 2) + TEXT_DROP },
        "end",
        "body",
        palette.ink,
        level.name,
      ),
    )
    .join("")

  const titles =
    text(
      { x: Y_TITLE_X, y: header + Y_TITLE_BASELINE },
      "start",
      "label",
      palette.ink,
      input.yTitle,
    ) +
    text({ x: right, y: height - X_TITLE_BASELINE_UP }, "end", "label", palette.ink, input.xTitle)

  // The survey: only when both sub-scores are finite, clamped to the axes, drawn last.
  let marker = ""
  if (isScore(input.stand) && isScore(input.context)) {
    const at = { x: x(input.stand), y: y(input.context) }
    marker =
      line({ x: left, y: at.y }, at, palette.accent, GUIDE_DASH) +
      line(at, { x: at.x, y: bottom }, palette.accent, GUIDE_DASH) +
      `<circle class="plane-marker" cx="${svgNumber(at.x)}" cy="${svgNumber(at.y)}" r="${svgNumber(MARKER_RADIUS)}" fill="${escapeHtml(palette.accent)}" stroke="${escapeHtml(palette.paper)}" stroke-width="${svgNumber(MARKER_RING)}"/>`
  }

  return `<svg class="chart-plane" role="img" aria-label="${escapeHtml(input.label)}" width="${svgNumber(width)}" height="${svgNumber(height)}" viewBox="0 0 ${svgNumber(width)} ${svgNumber(height)}">${panel}${title}${bands}${levelLines}${axes}${xTicks}${yTicks}${bandNames}${levelNames}${titles}${marker}</svg>`
}
