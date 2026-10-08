// Geometry and timing of Accueil's forest card hero (12.2-19 fourth round, sketch 010, A + F). The
// colours live in `visual-tokens.ts` (`forestAurora`). Lengths are points in the card's space.

export type AuroraDiscKey = "moss" | "teal" | "ochre"

export type AuroraDisc = {
  key: AuroraDiscKey
  /** Diameter of the disc. */
  size: number
  /** Where the disc rests, from the card's edges (it overflows them and the card clips it). */
  anchor: { left?: number; right?: number; top?: number; bottom?: number }
  /** How far it drifts from its rest and back, and its scale at rest and at the far end. */
  travel: { x: number; y: number; scale: readonly [number, number] }
  /** One way of the drift; the disc then comes back (an alternate cycle of twice this). */
  halfCycleMs: number
}

/**
 * The three discs of the aurora (sketch A): moss from the top left drifting right and down, teal
 * from the bottom right drifting left and up, the faint ochre from the top right drifting left and
 * down. 14, 17 and 20 s one way, so they never line up the same way twice in a short while.
 */
export const AURORA_DISCS: readonly AuroraDisc[] = [
  {
    key: "moss",
    size: 240,
    anchor: { left: -80, top: -110 },
    travel: { x: 170, y: 55, scale: [1, 1.2] },
    halfCycleMs: 14000,
  },
  {
    key: "teal",
    size: 220,
    anchor: { right: -70, bottom: -120 },
    travel: { x: -180, y: -45, scale: [1, 1.15] },
    halfCycleMs: 17000,
  },
  {
    key: "ochre",
    size: 170,
    anchor: { right: 40, top: -100 },
    travel: { x: -150, y: 70, scale: [1, 0.8] },
    halfCycleMs: 20000,
  },
]

/** The traced contours (sketch F), drawn bottom-left aligned in the area right of the text. */
export const TRACE_VIEWBOX = { width: 200, height: 150 } as const

/** Four lines, cubic segments only, so their control polygons bound their lengths (tested). */
export const TRACE_PATHS: readonly string[] = [
  "M20 140 C60 110 90 120 120 80 C150 40 170 40 200 30",
  "M0 120 C50 95 80 100 110 62 C140 24 160 24 200 12",
  "M40 150 C80 128 110 138 140 100 C170 62 185 62 200 52",
  "M60 150 C100 140 130 150 160 118 C190 86 190 90 200 80",
]

export const traceMotion = {
  /** Dash and gap of each line, longer than any of them: an offset of `dash` hides it whole. */
  dash: 260,
  /** Share of the viewBox's width over which a line fades in from the left. */
  fadeEnd: 0.45,
  /** One line draws itself in `drawMs`, each `staggerMs` after the one before. */
  drawMs: 2400,
  staggerMs: 450,
  /** The slow breathing once drawn: one way in `breatheHalfMs`, down to `breatheLow` of its alpha. */
  breatheHalfMs: 9000,
  breatheLow: 0.55,
} as const

/** The time all the lines take to be drawn, the last one starting after the others' staggers. */
export const TRACE_TOTAL_MS = traceMotion.drawMs + traceMotion.staggerMs * (TRACE_PATHS.length - 1)
