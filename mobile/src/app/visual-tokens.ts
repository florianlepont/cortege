// Phase 12.2 (variant I): static colour stops, gradient and shadow builders and chart geometry.
// Hex and rgba literals are allowed here and in `theme-visual.ts` only (ESLint colour rule). The
// per-scheme resolution of these stops lives in `theme-visual.ts` (`BrandTheme.visual`). Values come
// from `12.2-UI-SPEC.md`, never from the sketch: the spec overrides sketch colours where contrast fails.

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
export const tabDot = { size: 4 } as const
export const numeralGeometry = { digitWidth: 42, unitWidth: 64, height: 76, baseline: 62 } as const
