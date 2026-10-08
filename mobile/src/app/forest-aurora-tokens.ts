// The forest card's backdrop (12.2-19), as the owner validated it in sketch 010 `round5.html`
// ("spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1"): a mist of three soft discs drifting behind the
// content, four diagonal contour lines over the whole card with a dash of light flowing along
// them, and around each block of text a soft shield, as light as the text's contrast allows. Colours only; the geometry and timing live in
// `forest-aurora-shape.ts`. Same values in both schemes, the card is always forest. Hex and rgba
// literals are allowed in this file (ESLint).
//
// No layer may draw a flat zone or a hard edge (owner: "le fond devient uni en vert"): every
// shield is a gradient from nothing, tested in `forest-aurora-tokens.test.ts` with the contrast of
// each block of text with the mist at its worst and a dash of light passing right behind it.

import { buildRadialGradient, forestStops, withAlpha } from "./visual-tokens"

/** The owner's "Intensité de la brume" (fogA) applied to the sketch's base alphas. */
const FOG = 1.6

export const forestAurora = {
  /** Colour at a disc's centre and its opacity there; it fades to nothing at its rim. */
  moss: { colour: "#6EBE3C", peak: 0.42 * FOG },
  teal: { colour: "#1EAA8C", peak: 0.38 * FOG },
  ochre: { colour: "#DCAA3C", peak: 0.26 * FOG },
  /** The contours: faint base lines and a short bright dash with a soft glow under it. */
  lines: {
    base: "#8CB950",
    baseOpacity: 0.18,
    light: "#D7F096",
    lightOpacity: 1,
    glow: "#C8EC78",
    glowOpacity: 0.3,
    width: 1.2,
    glowWidth: 4,
  },
  /** The share of a card's width its text is taken to fill when it gives no blocks of its own. */
  textReach: 0.64,
  /** Filled progress segments of Accueil's card: the pale forest green, 3:1 at the mist's worst. */
  progressDone: "#C8DDA0",
} as const

export type AuroraTone = "moss" | "teal" | "ochre"

/**
 * The shield: around each block of text, a soft ellipse of the card's darkest green, `core` at the
 * block's centre, `edge` at its corners, nothing at the ellipse's rim (`textEllipse`, at least
 * `feather` points out in every direction). Never flat: it falls from the centre out. Each is as
 * light as its text allows with the mist at its worst and a dash of light right behind (the lines
 * are not masked): `standard` for Accueil's and Mes Relevés' text, `score` for the score card's
 * (its sage unit and glass tiles need more), `graphic` for a graphic at 3:1 (Accueil's segments).
 */
export const forestShield = {
  colour: forestStops.c,
  feather: 40,
  standard: { core: 0.72, edge: 0.69 },
  score: { core: 0.79, edge: 0.76 },
  graphic: { core: 0.6, edge: 0.57 },
} as const

export type ForestShieldKey = "standard" | "score" | "graphic"

/** The shield of one block, for a view the size of its ellipse; `inner` is where its corners lie. */
export function buildTextShield(key: ForestShieldKey, inner: number): string {
  const { colour } = forestShield
  const { core, edge } = forestShield[key]
  return buildRadialGradient("50% 50% at 50% 50%", [
    [withAlpha(colour, core), 0],
    [withAlpha(colour, edge), Math.round(inner * 10000) / 100],
    [withAlpha(colour, 0), 100],
  ])
}
