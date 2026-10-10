import { brandInteraction } from "../../app/brand-tokens"
import {
  COMPACT_HEIGHT_THRESHOLD,
  MAP_CONTROLS_ROW,
  PARCEL_BUDGET_DEVICES,
  PARCEL_CARD_COMPACT,
  compactParcelCardHeight,
  isCompactParcelCard,
  parcelMapShare,
} from "./layout-budget"

describe("the compact parcel-selection card (D-08)", () => {
  test("the threshold is 700", () => {
    expect(COMPACT_HEIGHT_THRESHOLD).toBe(700)
  })

  test("small windows are compact, a font scale under 1 counts as 1", () => {
    expect(isCompactParcelCard(667, 1)).toBe(true)
    expect(isCompactParcelCard(640, 1)).toBe(true)
    expect(isCompactParcelCard(667, 0.85)).toBe(true)
    // A large system font shrinks the usable height: 852 / 1.3 is under 700.
    expect(isCompactParcelCard(852, 1.3)).toBe(true)
  })

  test("tall windows keep the full card", () => {
    expect(isCompactParcelCard(852, 1)).toBe(false)
    expect(isCompactParcelCard(812, 1)).toBe(false)
    expect(isCompactParcelCard(700, 1)).toBe(false)
    // A font scale under 1 never makes a window taller than it is.
    expect(isCompactParcelCard(700, 0.5)).toBe(false)
  })

  test("the compact card is 130 pt with one meta line and 148 pt with two", () => {
    expect(compactParcelCardHeight(1)).toBe(130)
    expect(compactParcelCardHeight(2)).toBe(148)
  })

  test("the controls row is the 44 pt control plus the 12 pt gap above the card", () => {
    expect(MAP_CONTROLS_ROW).toBe(56)
  })

  test("the compact constants are on the 4 grid and keep the 44 pt hit area", () => {
    expect(PARCEL_CARD_COMPACT.padding % 4).toBe(0)
    expect(PARCEL_CARD_COMPACT.gap % 4).toBe(0)
    expect(MAP_CONTROLS_ROW % 4).toBe(0)
    expect(PARCEL_CARD_COMPACT.buttonHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(PARCEL_CARD_COMPACT.metaMaxLines).toBe(2)
  })

  test("on every compact device the map keeps at least half of its area", () => {
    const compact = PARCEL_BUDGET_DEVICES.filter((device) => isCompactParcelCard(device.height, 1))
    expect(compact.map((device) => device.height).sort()).toEqual([640, 667])
    for (const device of compact) {
      expect(parcelMapShare(device, compactParcelCardHeight(2))).toBeGreaterThanOrEqual(0.5)
    }
  })

  test("the 393 x 852 iPhone is not compact", () => {
    const tall = PARCEL_BUDGET_DEVICES.find((device) => device.height === 852)
    expect(tall).toBeDefined()
    expect(isCompactParcelCard(tall?.height ?? 0, 1)).toBe(false)
  })

  test("the map share is the part of the map area left by card, inset and controls row", () => {
    const device = { name: "test", height: 600, mapAreaHeight: 500, bottomInset: 40 }
    expect(parcelMapShare(device, 100)).toBeCloseTo(1 - (100 + 40 + MAP_CONTROLS_ROW) / 500, 5)
  })
})
