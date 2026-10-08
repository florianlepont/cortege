// Phase 12.2 (variant I): static colour stops, gradient and shadow builders and chart geometry.
// Hex and rgba literals are allowed here and in `theme-visual.ts` only (ESLint colour rule). The
// per-scheme resolution of these stops lives in `theme-visual.ts` (`BrandTheme.visual`). Values come
// from `12.2-UI-SPEC.md`, never from the sketch: the spec overrides sketch colours where contrast fails.

import { brandColors } from "./brand-tokens"

export type GradientStop = readonly [colour: string, percent: number]

/** The three stops of the forest card gradient (a = start, b = mid, c = end). */
export const forestStops = {
  a: "#1D3418",
  b: "#334E2B",
  c: "#0E2210",
} as const

// Halo core of the forest card. Dark keeps the variant I look with a dimmer core (D-14): one token
// to retune after the owner's phone check.
export const forestHaloCore = {
  light: "#6F9A3C",
  dark: "rgba(111, 154, 60, 0.55)",
} as const

// Green wave of a pressed list row (D-21): a moss tint on the surface, a little lighter and greener
// in dark so it reads on the Graphite card. One token to retune after the owner's phone check.
export const pressWaveFill = {
  light: "rgba(137, 163, 58, 0.26)",
  dark: "rgba(155, 194, 106, 0.22)",
} as const

export const forestHaloEnd = "rgba(111, 154, 60, 0)"

function joinStops(stops: readonly GradientStop[]): string {
  return stops.map(([colour, percent]) => `${colour} ${percent}%`).join(", ")
}

export function buildLinearGradient(angleDeg: number, stops: readonly GradientStop[]): string {
  return `linear-gradient(${angleDeg}deg, ${joinStops(stops)})`
}

export function buildRadialGradient(shape: string, stops: readonly GradientStop[]): string {
  return `radial-gradient(${shape}, ${joinStops(stops)})`
}

/**
 * A 1 pt hairline drawn as an inset box-shadow ring (12.2-17). Used instead of `borderWidth` on a
 * view that carries `experimental_backgroundImage`: RN sizes the gradient to the padding box and
 * tiles it, so a border ring would show the opposite edge of the gradient under the hairline.
 */
export function buildInsetRing(colour: string): string {
  return `inset 0 0 0 1px ${colour}`
}

/** Compact forest card ("Reprendre"): halo top right over the 140deg base. */
export function buildForestImage(haloCore: string): string {
  return [
    buildRadialGradient("120% 150% at 88% -10%", [
      [haloCore, 0],
      [forestHaloEnd, 58],
    ]),
    buildLinearGradient(140, [
      [forestStops.a, 0],
      [forestStops.b, 55],
      [forestStops.c, 100],
    ]),
  ].join(", ")
}

/** Survey score card: same family at 150deg with a slightly tighter halo. */
export function buildForestHeroImage(haloCore: string): string {
  return [
    buildRadialGradient("110% 130% at 100% -10%", [
      [haloCore, 0],
      [forestHaloEnd, 55],
    ]),
    buildLinearGradient(150, [
      [forestStops.a, 0],
      [forestStops.b, 60],
      [forestStops.c, 100],
    ]),
  ].join(", ")
}

function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function channelHex(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()
}

/** Lighten `#RRGGBB` toward white by `amount` (0 to 1); returns `#RRGGBB`. */
export function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const mix = (channel: number) => channel + (255 - channel) * amount
  return `#${channelHex(mix(r))}${channelHex(mix(g))}${channelHex(mix(b))}`
}

/** `#RRGGBB` at `alpha` as `rgba(r, g, b, a)` (alpha written with a leading digit). */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Glass fills of floating controls. `control` equals the literals `GlassSurface` carried before
// 12.2 (iOS unchanged); `android` is the higher-alpha flat fill because expo-blur draws no real
// blur there (D-17). Keyed statically because `tone="dark"` overrides the app scheme.
export const brandGlassFills = {
  control: {
    light: "rgba(247, 246, 240, 0.38)",
    dark: "rgba(8, 13, 19, 0.38)",
  },
  android: {
    light: "rgba(247, 246, 240, 0.92)",
    dark: "rgba(24, 25, 28, 0.90)",
  },
} as const

// Glass of the controls floating over a map (12.2-19 fix round, owner: "En dark mode les boutons
// de explorer sont difficiles à voir"). The basemaps do not follow the app scheme (the plan and the
// orthophoto look the same in light and dark), so the 38% dark glass of `brandGlassFills` turned
// into a muddy grey over the light plan, with thin green icons that nearly vanished. Over a map the
// glass is therefore a near opaque forest graphite in dark, with a light hairline, light moss icons
// and near white text; in light it is a denser frosted paper (the 38% light glass, modelled over a
// dark orthophoto, left the forest icon under 3:1). `tint` tints the Liquid Glass (iOS 26, the
// system keeps its refraction and rim), `fill` lies over the real blur (older iOS), `android` is the
// flat fill where expo-blur draws no blur (D-17). The light hairline is the theme's divider, set in
// `theme-visual.ts`. Checked at 3:1 (icons) and 4.5:1 (text) over the plan and the orthophoto in
// `visual-tokens.test.ts`.
export const mapControlGlass = {
  light: {
    tint: "rgba(247, 246, 240, 0.76)",
    fill: "rgba(247, 246, 240, 0.76)",
    android: "rgba(247, 246, 240, 0.92)",
    icon: brandColors.forest,
    text: "#24311F",
    textMuted: "#3D4B37",
  },
  dark: {
    tint: "rgba(16, 24, 14, 0.84)",
    fill: "rgba(16, 24, 14, 0.84)",
    android: "rgba(16, 24, 14, 0.94)",
    hairline: "rgba(255, 255, 255, 0.28)",
    icon: "#D2E8A8",
    text: "#F2F3F1",
    textMuted: "#C9CED3",
  },
} as const

/** Glyph size of a map control (was 22): a heavier glyph that reads over any basemap. */
export const mapControlIconSize = 24

// The Explorer's bottom sheet (12.2-19 fix round, owner's dark screenshot of "Zones hors connexion":
// the subtitle, the size estimate and the close glyph nearly vanished). The sheet's dark blur over
// the light basemap gave a mid grey under the grey secondary text, so a fill now lies over the blur,
// dense enough for the theme's own text tokens at 4.5:1 over the plan and the orthophoto. The close
// button is a 44 pt glass circle: `closeFill` tints it (Liquid Glass) or fills it (fallback), with a
// `closeHairline` outline; `handle` is the drag indicator, which the dark divider made invisible.
export const explorerSheetGlass = {
  light: {
    fill: "rgba(247, 246, 240, 0.88)",
    handle: "rgba(36, 49, 31, 0.24)",
    closeFill: "rgba(36, 49, 31, 0.08)",
    closeHairline: "rgba(36, 49, 31, 0.16)",
  },
  dark: {
    fill: "rgba(17, 18, 20, 0.88)",
    handle: "rgba(255, 255, 255, 0.32)",
    closeFill: "rgba(255, 255, 255, 0.14)",
    closeHairline: "rgba(255, 255, 255, 0.24)",
  },
} as const

// Label colour of the glow pill (kept as a named constant: an object key called `label` holding a
// string literal is read as user-facing text by the structure gate).
export const pillLabelColor = "#14210F"

// Forest glass of the big call-to-action buttons (D-27c, D-28). The owner first saw the saturated
// moss and found it too light ("je m'imaginais un plus foncé"), then chose, from a board of four
// greens, the charter's forest: so both schemes use `brandColors.forest` (#334E2B) with a white
// label (9.3:1). `tint` is the opaque green the native iOS 26 glass button is tinted with
// (`buttonStyle("glassProminent")`): the system adds its own glass material, specular highlight and
// press response on top. `flat` is the translucent fill of the fallback (Android, iOS before 26): no
// blur, see-through. `flatOff` is the disabled fallback, a pale neutral glass clearly less saturated
// than the green (the native button uses the system disabled look instead).
export const glassCtaFills = {
  light: {
    tint: brandColors.forest,
    flat: withAlpha(brandColors.forest, 0.94),
    flatOff: "rgba(36, 49, 31, 0.09)",
  },
  dark: {
    tint: brandColors.forest,
    flat: withAlpha(brandColors.forest, 0.96),
    flatOff: "rgba(242, 243, 241, 0.12)",
  },
} as const

// Text colour on the forest (white, both schemes) and on the disabled fallback. Named constants for
// the same structure-gate reason as `pillLabelColor`.
export const glassCtaInk = {
  light: { on: brandColors.white, off: "#3D4B37" },
  dark: { on: brandColors.white, off: "#B4B8BD" },
} as const

// Edge of the fallback button: a crisp light hairline, then in one `boxShadow` a soft green halo, a
// marked top rim highlight and a faint lower rim shade, so the pill reads as a lit glass bead. The
// `sheen` is a white reflection over the top half of the fill, kept light enough for the white
// label. The native glass draws its own edge and light, so none of this is used on iOS 26. The
// hairline is drawn as an inset ring (`buildInsetRing`, in `theme-visual.ts`), not a border, because
// the button also carries the `sheen` gradient; the rims are 2 pt bands so their inner point sits
// just inside the ring, where they sat inside the old 1 pt border.
export const glassCtaEdges = {
  light: {
    hairline: "rgba(255, 255, 255, 0.55)",
    shadow:
      "0 8px 22px rgba(51, 78, 43, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.75), inset 0 -2px 0 rgba(14, 34, 16, 0.3)",
    sheen: buildLinearGradient(180, [
      ["rgba(255, 255, 255, 0.16)", 0],
      ["rgba(255, 255, 255, 0.05)", 46],
      ["rgba(255, 255, 255, 0)", 56],
    ]),
    hairlineOff: "rgba(36, 49, 31, 0.14)",
  },
  dark: {
    hairline: "rgba(255, 255, 255, 0.6)",
    shadow:
      "0 8px 22px rgba(137, 163, 58, 0.26), inset 0 2px 0 rgba(255, 255, 255, 0.7), inset 0 -2px 0 rgba(0, 0, 0, 0.3)",
    sheen: buildLinearGradient(180, [
      ["rgba(255, 255, 255, 0.16)", 0],
      ["rgba(255, 255, 255, 0.05)", 46],
      ["rgba(255, 255, 255, 0)", 56],
    ]),
    hairlineOff: "rgba(255, 255, 255, 0.14)",
  },
} as const

// Secondary glass button (the system `glass` style natively, an outlined translucent pill in the
// fallback), for the second action next to a forest primary: neutral, no tint, the label in the
// app's primary text colour. `flat` and `hairline` draw the fallback only (the fill and the border
// of the button itself). Nothing is drawn over the native glass (12.2-17: an overlaid hairline
// showed as a green outline of another size than the system capsule).
export const glassCtaSecondary = {
  light: {
    flat: "rgba(255, 255, 255, 0.5)",
    hairline: "rgba(51, 78, 43, 0.38)",
  },
  dark: {
    flat: "rgba(255, 255, 255, 0.08)",
    hairline: "rgba(255, 255, 255, 0.3)",
  },
} as const

// Download mode of the Explorer (12.2-19, owner: "le bord de l'écran s'illumine en vert, avec un
// pulse"): the edge glows green, so the area shown reads as the one to download. The first fix round
// (owner: "l'effet pulsé en téléchargement n'est pas assez intense encore") made it much stronger:
// a crisp 3 pt line, a tight band for definition and a wide halo, in saturated greens brighter than
// the brand moss. The second (owner: "je m'attendais à avoir un truc qui fasse tout le tour de
// l'écran") moved it round the whole screen, over the panel and the tab bar, with the screen's
// rounded corners. The third (owner: "j'aurais préféré juste un pulse plus fort, pas le truc qui
// tourne") took the travelling light out and made the pulse itself stronger: a deeper halo swells in
// at the top of each beat. Over the white panel the halo stays light enough for the panel's text to
// keep 4.5:1; the line keeps 3:1 against the white plan and the dark orthophoto alike. The basemaps
// do not follow the scheme, so both schemes draw the same glow. Inset shadows only, no border
// (12.2-17).
export const edgeGlowGreens = {
  line: "#4E9620",
  band: "#6DB52E",
  halo: "#7BC234",
} as const

export const edgeGlowGeometry = {
  line: 3,
  band: { blur: 12, spread: 4, alpha: 0.85 },
  halo: { blur: 28, spread: 8, alpha: 0.45 },
  /** The deeper halo that swells in at the top of each beat: 52 pt deep (spread plus blur). */
  deep: { blur: 38, spread: 14, alpha: 0.22 },
  /** Corner radius of the glow, near the iPhone display radius (about 47 to 55 pt). */
  corner: 52,
} as const

/** The three inset layers of the download glow, the line first. */
export function buildEdgeGlow(): string {
  const { line, band, halo } = edgeGlowGeometry
  return [
    `inset 0 0 0 ${line}px ${edgeGlowGreens.line}`,
    `inset 0 0 ${band.blur}px ${band.spread}px ${withAlpha(edgeGlowGreens.band, band.alpha)}`,
    `inset 0 0 ${halo.blur}px ${halo.spread}px ${withAlpha(edgeGlowGreens.halo, halo.alpha)}`,
  ].join(", ")
}

/** The deeper halo of the glow, a layer of its own so it can swell in at the top of the beat. */
export function buildEdgeGlowDeep(): string {
  const { deep } = edgeGlowGeometry
  return `inset 0 0 ${deep.blur}px ${deep.spread}px ${withAlpha(edgeGlowGreens.halo, deep.alpha)}`
}

export const downloadEdgeGlow = buildEdgeGlow()
export const downloadEdgeGlowDeep = buildEdgeGlowDeep()

/** Strong pulse of that glow: opacity from `minOpacity` to 1 and back, `halfCycleMs` each way (a
 * 1.5 s cycle), the deeper halo following from nothing to full; both still at the full strength
 * (`stillOpacity`) under Reduce Motion. */
export const edgePulseMotion = { halfCycleMs: 750, minOpacity: 0.35, stillOpacity: 1 } as const

// Geometry of the chart and score components (not spacing).
export const scoreRingGeometry = { size: 38, stroke: 4, dash: "3 4" } as const
export const factorBarGeometry = { gap: 6, radius: 6, maxHeight: 64, stub: 4 } as const
export const glowBarGeometry = { height: 6, radius: 6, delayMs: 120 } as const
export const contourDrift = {
  durationMs: 26000,
  translateX: [-6, 8],
  translateY: [2, -4],
  scale: [1.04, 1.1],
  inset: -12,
  sageOpacity: 0.55,
  mossOpacity: 1,
  sageWidth: 1,
  mossWidth: 1.4,
} as const
// The flowing waves of Accueil's forest card (12.2-19 fix round, owner: "je m'attendais à un truc un
// peu dynamique comme les vagues sur l'écran de connexion"). The sign-in waves are three organic
// ripples that spread from the logo and fade, one every third of a 10 s linear cycle; the card takes
// that rhythm: three wave lines a third of a wavelength apart, drifting one wavelength in a linear
// `travelMs` and breathing (rising and falling by `breatheY` pt, swelling by `breatheScaleY`) on a
// sine over the sign-in's 10 s cycle. One SVG path, sage, faint enough that the title, the factors
// line and the button keep AA over it.
export const forestWaves = {
  travelMs: 12000,
  breatheMs: 10000,
  /** Wavelength, as a share of the card width. */
  periodRatio: 0.8,
  /** Baselines of the three lines, as shares of the card height (the lower half of the card). */
  baselines: [0.56, 0.72, 0.88],
  /** Crest height of the first line, as a share of the card height; each next line is lower. */
  amplitudeRatio: 0.07,
  breatheY: 3,
  breatheScaleY: 0.14,
  width: 1.8,
  /** The most the body text (4.5:1 on the gradient's mid stop) allows where a line crosses it. */
  opacity: 0.2,
} as const
// The static contours behind Accueil's "Nouveau relevé" glass card (12.2-19 fix round): a faint
// texture under the text, never the forest card's full strength. The lines are drawn for the forest,
// so the light glass takes a little more of them than the dark one to show at all.
export const glassContourOpacity = { light: 0.3, dark: 0.2 } as const
export const tabDot = { size: 4 } as const
// The card numeral is `brandTypography.numeralCard` (56). `unitGap` is the clear gap between the last
// digit and the unit: the negative letter spacing already pulls the unit in, so it is added back.
export const numeralGeometry = {
  digitWidth: 35,
  unitWidth: 64,
  unitGap: 10,
  height: 62,
  baseline: 51,
} as const
