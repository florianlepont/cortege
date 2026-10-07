import { brandInteraction, brandSpacing4 } from "../../app/brand-tokens"
import {
  BUDGET_ASSUMPTIONS,
  BUDGET_DEVICES,
  HOME_GAPS,
  MAP_MIN_HEIGHT,
  MIN_VISIBLE_NEARBY,
  RECENT_LAYOUT,
  RESUME_LAYOUT,
  SECTION_HEADER_HEIGHT,
  TOOL_ROW_MIN_HEIGHT,
  homeMapVisible,
  nearbyMapHeight,
  recentSectionHeight,
  resumeCardHeight,
  toolsSectionHeight,
} from "./layout-budget"

// The pre-12.2-14 numbers: three Mes Relevés cards (12 + 22 + 4 + 28 + 12 = 78 pt each, 8 pt apart),
// 24 pt between the sections, a 240 pt minimum map.
const OLD_RECENT_ROW = 2 * 12 + 22 + 4 + (2 * 5 + 2 + 16)
const OLD_SECTION_GAP = 24

describe("the vertical budget of Accueil (12.2-14)", () => {
  test("everything is on the 4 grid, and no row is below a 44 pt hit area", () => {
    const grid = [
      HOME_GAPS.contentTop,
      HOME_GAPS.section,
      HOME_GAPS.recent,
      HOME_GAPS.sectionHeader,
      RESUME_LAYOUT.padding,
      RESUME_LAYOUT.progressGap,
      RECENT_LAYOUT.rowHeight,
      RECENT_LAYOUT.rowPaddingY * 2,
      RECENT_LAYOUT.ringSize,
      TOOL_ROW_MIN_HEIGHT,
      MAP_MIN_HEIGHT,
    ]
    for (const value of grid) expect(value % 4).toBe(0)
    expect(RECENT_LAYOUT.rowHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(RECENT_LAYOUT.headerHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(TOOL_ROW_MIN_HEIGHT).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(RESUME_LAYOUT.buttonHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
  })

  test("a recent row is about 52 to 56 pt: two 20 pt lines between two 6 pt paddings", () => {
    const lines = 20 + 20
    expect(2 * RECENT_LAYOUT.rowPaddingY + lines).toBe(RECENT_LAYOUT.rowHeight)
    expect(RECENT_LAYOUT.rowHeight).toBeGreaterThanOrEqual(52)
    expect(RECENT_LAYOUT.rowHeight).toBeLessThanOrEqual(56)
    // A 1 pt chip padding makes the chip as tall as the 20 pt line it sits on (label 16, two 1 pt
    // paddings and its two 1 pt borders).
    expect(RECENT_LAYOUT.chipPaddingY * 2 + 2 + 16).toBe(20)
    // The ring fits its row with room around it.
    expect(RECENT_LAYOUT.ringSize).toBeLessThan(
      RECENT_LAYOUT.rowHeight - 2 * RECENT_LAYOUT.rowPaddingY,
    )
  })

  test("the section is much shorter than three Mes Relevés cards", () => {
    const oldHeight =
      OLD_SECTION_GAP + 44 + brandSpacing4.xs + 3 * OLD_RECENT_ROW + 2 * brandSpacing4.sm
    expect(OLD_RECENT_ROW).toBe(78)
    expect(recentSectionHeight(3)).toBe(HOME_GAPS.recent + 44 + (2 + 3 * 52 + 2))
    expect(recentSectionHeight(3)).toBeLessThan(oldHeight - 100)
    expect(recentSectionHeight(0)).toBe(0)
    expect(recentSectionHeight(1)).toBe(HOME_GAPS.recent + 44 + (2 + 52))
  })

  test("the map card has no taller a minimum than its overlays need", () => {
    // The score badge (about 56 pt) and the summary (about 56 pt) with their 12 pt edges.
    expect(MAP_MIN_HEIGHT).toBeLessThan(240)
    expect(MAP_MIN_HEIGHT).toBeGreaterThanOrEqual(56 + 56 + 3 * 12)
    expect(nearbyMapHeight(852)).toBe(290)
    expect(nearbyMapHeight(812)).toBe(276)
    expect(nearbyMapHeight(500)).toBe(MAP_MIN_HEIGHT)
  })

  test("the heights add up as drawn (a draft, one line of title and body)", () => {
    expect(resumeCardHeight(true, 1, 1)).toBe(161)
    expect(resumeCardHeight(true, 2, 1)).toBe(189)
    expect(resumeCardHeight(false, 1, 2)).toBe(2 + 32 + 28 + 4 + 40 + 0)
    expect(toolsSectionHeight()).toBe(
      HOME_GAPS.section + SECTION_HEADER_HEIGHT + HOME_GAPS.sectionHeader + TOOL_ROW_MIN_HEIGHT,
    )
  })

  describe.each(BUDGET_DEVICES)("on $name", (device) => {
    const base = { windowHeight: device.height, safeTop: device.safeTop }

    test("the assumptions are the ones the budget states", () => {
      expect(BUDGET_ASSUMPTIONS).toEqual({ headerBar: 44, tabBar: 90 })
    })

    test("a draft, three recent surveys, no alert: the nearby section shows at launch", () => {
      const { section, map, sectionTop } = homeMapVisible(base)
      expect(sectionTop).toBe(503)
      expect(section).toBeGreaterThanOrEqual(MIN_VISIBLE_NEARBY)
      // Its header row (18 + 8) and a real piece of the map.
      expect(map).toBeGreaterThanOrEqual(MIN_VISIBLE_NEARBY - SECTION_HEADER_HEIGHT - 8)
      expect(map).toBeGreaterThan(0)
    })

    test("still holds when the resume title wraps to two lines", () => {
      expect(homeMapVisible({ ...base, resumeTitleLines: 2 }).section).toBeGreaterThanOrEqual(
        MIN_VISIBLE_NEARBY,
      )
    })

    test("holds with the start card (no draft, a two-line body) and with fewer surveys", () => {
      expect(
        homeMapVisible({ ...base, hasDraft: false, resumeBodyLines: 2 }).section,
      ).toBeGreaterThanOrEqual(MIN_VISIBLE_NEARBY)
      expect(homeMapVisible({ ...base, recentCount: 1 }).section).toBeGreaterThan(
        homeMapVisible(base).section,
      )
      expect(homeMapVisible({ ...base, recentCount: 0 }).section).toBeGreaterThanOrEqual(
        MIN_VISIBLE_NEARBY,
      )
    })

    test("the old budget hid it: three Mes Relevés cards left under 40 pt", () => {
      const oldBefore =
        brandSpacing4.md +
        161 +
        OLD_SECTION_GAP +
        44 +
        brandSpacing4.xs +
        3 * OLD_RECENT_ROW +
        2 * brandSpacing4.sm +
        OLD_SECTION_GAP +
        SECTION_HEADER_HEIGHT +
        brandSpacing4.sm +
        56 +
        OLD_SECTION_GAP
      // The old resume footer also had 4 pt padding above and below its link.
      const room = device.height - BUDGET_ASSUMPTIONS.tabBar - device.safeTop - 44
      expect(oldBefore + 8).toBe(637)
      expect(Math.max(0, room - (oldBefore + 8))).toBeLessThan(40)
    })

    test("the visible part never exceeds the section, even with room to spare", () => {
      const tall = homeMapVisible({ windowHeight: 3000, safeTop: device.safeTop })
      expect(tall.section).toBe(SECTION_HEADER_HEIGHT + 8 + tall.mapHeight)
      expect(tall.map).toBe(tall.mapHeight)
    })

    test("an alert notice above the resume card gives the room to it first", () => {
      expect(homeMapVisible({ ...base, alertHeight: 100 }).section).toBeLessThan(
        homeMapVisible(base).section,
      )
    })
  })
})
