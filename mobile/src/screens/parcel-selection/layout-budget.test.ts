import { brandInteraction } from "../../app/brand-tokens"
import {
  MAP_CONTROLS_ROW,
  OFFLINE_SLIM_HEIGHT,
  PARCEL_BUDGET_DEVICES,
  PARCEL_CARD,
  PARCEL_CARD_ROW_HEIGHT,
  parcelCardHeight,
  parcelMapShare,
} from "./layout-budget"

describe("the slim parcel-selection card", () => {
  test("it is one fixed row, the same 82 pt with or without a parcel (it does not jump)", () => {
    expect(PARCEL_CARD_ROW_HEIGHT).toBe(58)
    expect(parcelCardHeight()).toBe(82)
    expect(parcelCardHeight()).toBeLessThan(90)
  })

  test("the controls row is the 44 pt control plus the 12 pt gap above the card", () => {
    expect(MAP_CONTROLS_ROW).toBe(56)
  })

  test("the constants are on the 4 grid and keep the 44 pt hit area", () => {
    expect(PARCEL_CARD.padding % 4).toBe(0)
    expect(PARCEL_CARD.gap % 4).toBe(0)
    expect(MAP_CONTROLS_ROW % 4).toBe(0)
    expect(PARCEL_CARD.buttonHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
  })

  test("the slim offline line is about 42 pt", () => {
    expect(OFFLINE_SLIM_HEIGHT).toBe(42)
  })

  test("owner target: 60 % of the screen is map with a parcel chosen, 50 % with the slim line", () => {
    for (const device of PARCEL_BUDGET_DEVICES) {
      const bare = parcelMapShare(device, parcelCardHeight())
      // The slim line sits at the top of the same area, so it takes its height from the map.
      const withLine = bare - OFFLINE_SLIM_HEIGHT / device.mapAreaHeight
      expect(bare).toBeGreaterThanOrEqual(0.6)
      expect(withLine).toBeGreaterThanOrEqual(0.5)
    }
  })

  test("the map share is the part of the map area left by card, inset and controls row", () => {
    const device = { name: "test", height: 600, mapAreaHeight: 500, bottomInset: 40 }
    expect(parcelMapShare(device, 100)).toBeCloseTo(1 - (100 + 40 + MAP_CONTROLS_ROW) / 500, 5)
  })
})
