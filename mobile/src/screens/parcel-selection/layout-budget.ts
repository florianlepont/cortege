import {
  brandComponentTokens,
  brandInteraction,
  brandSpacing4,
  brandTypeScale,
} from "../../app/brand-tokens"

// The vertical budget of the parcel-selection card on small screens (D-08, field feedback: on an
// iPhone SE the card plus the tab bar inset covered more than half of the map). The compact styles
// of `ParcelSelectionCard` read these constants and `parcelMapShare` sums the same numbers, so the
// budget the test asserts is the budget the screen draws. The switch reads the window size, never
// the measured card height: a card that changes its own height from its own height would flip back
// and forth (research Pitfall 10). The tab bar is never hidden here (rule OA-28).

/**
 * Below this window height (divided by the font scale) the card is compact. It covers the iPhone SE
 * 667 pt and the small Androids under 700 dp, and leaves the iPhone 13 mini 812 and the common
 * Androids on the full card.
 */
export const COMPACT_HEIGHT_THRESHOLD = 700

/** The compact card: a one-line title, one meta line of at most two lines, the 50 pt button. */
export const PARCEL_CARD_COMPACT = {
  padding: brandComponentTokens.card.compactPadding,
  gap: brandSpacing4.sm,
  titleLineHeight: brandTypeScale.headline.lineHeight,
  metaLineHeight: brandTypeScale.footnote.lineHeight,
  metaMaxLines: 2,
  /** Kept at the large size for field use, gloves and sunlight. */
  buttonHeight: brandComponentTokens.button.minHeightLarge,
} as const

/** The map controls row above the card: the 44 pt control and the 12 pt gap above the card. */
export const MAP_CONTROLS_ROW = brandInteraction.hitTarget.min + brandSpacing4.smd

export type ParcelBudgetDevice = {
  name: string
  /** The window height. */
  height: number
  /** The part of the window the map is drawn in (an opaque header and an in-flow tab bar reduce it). */
  mapAreaHeight: number
  /** Space under the card: the tab bar or gesture inset plus the 12 pt margin. */
  bottomInset: number
}

/**
 * The smallest supported screens and a tall reference. Token arithmetic from the research, to be
 * confirmed on the simulator and the emulator in plan 26-10.
 */
export const PARCEL_BUDGET_DEVICES: readonly ParcelBudgetDevice[] = [
  // The map is full screen under the transparent header; native tab bar 84 + 12.
  { name: "iPhone SE 375 x 667", height: 667, mapAreaHeight: 667, bottomInset: 96 },
  // The opaque header (56) and the in-flow JS tab bar (64) are taken off; gesture inset 24 + 12.
  { name: "Android 360 x 640 dp", height: 640, mapAreaHeight: 520, bottomInset: 36 },
  // The full card, native tab bar 84 + 12.
  { name: "iPhone 393 x 852", height: 852, mapAreaHeight: 852, bottomInset: 96 },
]

/** Compact when the window height, corrected for a large system font, is under the threshold. */
export function isCompactParcelCard(height: number, fontScale: number): boolean {
  return height / Math.max(1, fontScale) < COMPACT_HEIGHT_THRESHOLD
}

/** The compact card: padding, title, meta lines, button, with the gaps between them. */
export function compactParcelCardHeight(metaLines: 1 | 2): number {
  const c = PARCEL_CARD_COMPACT
  return (
    2 * c.padding +
    c.titleLineHeight +
    c.gap +
    metaLines * c.metaLineHeight +
    c.gap +
    c.buttonHeight
  )
}

/** The share of the map area left once the card, its bottom inset and the controls row are drawn. */
export function parcelMapShare(device: ParcelBudgetDevice, cardHeight: number): number {
  return 1 - (cardHeight + device.bottomInset + MAP_CONTROLS_ROW) / device.mapAreaHeight
}
