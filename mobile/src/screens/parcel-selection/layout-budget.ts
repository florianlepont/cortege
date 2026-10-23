import {
  brandComponentTokens,
  brandInteraction,
  brandSpacing4,
  brandTypeScale,
} from "../../app/brand-tokens"

// The vertical budget of the parcel-selection card (D-08, then the owner check on the iPhone 17e,
// where the offline card, the pill, the chip and a 6-line bottom card left half of the map). The
// styles of `ParcelSelectionCard` read these constants and `parcelMapShare` sums the same numbers,
// so the budget the test asserts is the budget the screen draws. The tab bar is never hidden here
// (rule OA-28).

/** One slim row: the title (and a line of help without a parcel) beside the 50 pt button. */
export const PARCEL_CARD = {
  padding: brandComponentTokens.card.compactPadding,
  gap: brandSpacing4.smd,
  titleLineHeight: brandTypeScale.headline.lineHeight,
  metaLineHeight: brandTypeScale.footnote.lineHeight,
  metaMaxLines: 2,
  /** Kept at the large size for field use, gloves and sunlight. */
  buttonHeight: brandComponentTokens.button.minHeightLarge,
} as const

/**
 * The row is always as tall as the no-parcel row (title, two help lines): the card keeps one size
 * whether or not a parcel is chosen, so it does not jump when the first parcel is touched (owner
 * check, Phase 30, 2026-10-23).
 */
export const PARCEL_CARD_ROW_HEIGHT = Math.max(
  PARCEL_CARD.buttonHeight,
  PARCEL_CARD.titleLineHeight + PARCEL_CARD.metaMaxLines * PARCEL_CARD.metaLineHeight,
)

/** The map controls row above the card: the 44 pt control and the 12 pt gap above the card. */
export const MAP_CONTROLS_ROW = brandInteraction.hitTarget.min + brandSpacing4.smd

/** The slim offline line under the step pill (a 32 pt row, 4 pt above and below, its hairline). */
export const OFFLINE_SLIM_HEIGHT = 32 + 2 * brandSpacing4.xs + 2

export type ParcelBudgetDevice = {
  name: string
  /** The window height. */
  height: number
  /** The part of the window the map is drawn in (an opaque header and an in-flow tab bar reduce it). */
  mapAreaHeight: number
  /** Space under the card: the tab bar or gesture inset plus the 12 pt margin. */
  bottomInset: number
}

/** The smallest supported screens and a tall reference. */
export const PARCEL_BUDGET_DEVICES: readonly ParcelBudgetDevice[] = [
  // The map is full screen under the transparent header; native tab bar 84 + 12.
  { name: "iPhone SE 375 x 667", height: 667, mapAreaHeight: 667, bottomInset: 96 },
  // The opaque header (56) and the in-flow JS tab bar (64) are taken off; gesture inset 24 + 12.
  { name: "Android 360 x 640 dp", height: 640, mapAreaHeight: 520, bottomInset: 36 },
  { name: "iPhone 393 x 852", height: 852, mapAreaHeight: 852, bottomInset: 96 },
]

/** The card: padding around the one fixed row, with or without a parcel. */
export function parcelCardHeight(): number {
  return 2 * PARCEL_CARD.padding + PARCEL_CARD_ROW_HEIGHT
}

/** The share of the map area left once the card, its bottom inset and the controls row are drawn. */
export function parcelMapShare(device: ParcelBudgetDevice, cardHeight: number): number {
  return 1 - (cardHeight + device.bottomInset + MAP_CONTROLS_ROW) / device.mapAreaHeight
}
