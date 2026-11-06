import { escapeHtml, svgNumber } from "./html"

// The static print ring of the cover tiles and the summary score card (phase 33, D-02, UI-SPEC B.5).
// Pure: two circles, no gradient, no opacity, no import of the screen `ScoreRing`. The arc starts
// at 12 o'clock through an SVG `rotate(-90)` (probe item P-2): should the device probe of 33-14
// reject the rotate, only this function changes, to a path arc. Every number goes through
// `svgNumber`, the label and the two colours through `escapeHtml`.

export type RingOptions = {
  /** Width and height of the svg, in design units. */
  size: number
  /** Stroke width of the track and the arc. */
  stroke: number
  /** Share of the ring that is filled, from 0 to 1; out-of-range values are clamped. */
  ratio: number
  /** Track colour (a palette value). */
  track: string
  /** Arc colour (a palette value). */
  arc: string
  /** The spoken label of the ring (`role="img"`). */
  label: string
}

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return ratio === Number.POSITIVE_INFINITY ? 1 : 0
  return Math.min(1, Math.max(0, ratio))
}

/** The ring as one `svg` element: a full track circle and, when the ratio is above 0, the arc. */
export function buildRingSvg(options: RingOptions): string {
  const { size, stroke } = options
  const radius = Math.max(1, (size - stroke) / 2)
  const centre = size / 2
  const circumference = 2 * Math.PI * radius
  const ratio = clampRatio(options.ratio)
  const track = escapeHtml(options.track)
  const arc = escapeHtml(options.arc)
  const common = `cx="${svgNumber(centre)}" cy="${svgNumber(centre)}" r="${svgNumber(radius)}" fill="none" stroke-width="${svgNumber(stroke)}"`

  const trackCircle = `<circle class="ring-track" ${common} stroke="${track}"/>`
  // An arc whose printed length rounds to 0 would leave a round-cap dot: it is not drawn.
  const filled = svgNumber(circumference * ratio)
  const arcCircle =
    ratio > 0 && filled !== "0"
      ? `<circle class="ring-arc" ${common} stroke="${arc}" stroke-linecap="round" stroke-dasharray="${filled} ${svgNumber(circumference)}" transform="rotate(-90 ${svgNumber(centre)} ${svgNumber(centre)})"/>`
      : ""

  return `<svg class="ring-svg" role="img" aria-label="${escapeHtml(options.label)}" width="${svgNumber(size)}" height="${svgNumber(size)}" viewBox="0 0 ${svgNumber(size)} ${svgNumber(size)}">${trackCircle}${arcCircle}</svg>`
}
