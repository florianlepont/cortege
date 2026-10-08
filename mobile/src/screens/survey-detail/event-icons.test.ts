jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { contrastRatio } from "../../app/contrast"
import { buildTheme } from "../../app/theme"
import { eventToneColors, eventVisual, type EventTone } from "./event-icons"
import { KNOWN_EVENT_TYPES } from "./event-labels"

describe("eventVisual", () => {
  test.each(KNOWN_EVENT_TYPES)("gives a known icon and tone for %s", (type) => {
    const visual = eventVisual(type)
    expect(visual.icon).toEqual(expect.any(String))
    expect(["neutral", "success", "warning", "danger"]).toContain(visual.tone)
  })

  test("danger events are the sync failure and the deletions", () => {
    expect(eventVisual("sync_failed").tone).toBe("danger")
    expect(eventVisual("deleted").tone).toBe("danger")
    expect(eventVisual("attachment_deleted").tone).toBe("danger")
  })

  test("returns the generic neutral visual for an unknown type, never a raw lookup", () => {
    expect(eventVisual("some_new_type")).toEqual({ icon: "ellipse-outline", tone: "neutral" })
    expect(eventVisual("toString")).toEqual({ icon: "ellipse-outline", tone: "neutral" })
    expect(eventVisual("")).toEqual({ icon: "ellipse-outline", tone: "neutral" })
  })
})

describe.each(["light", "dark"] as const)("eventToneColors, %s scheme", (scheme) => {
  const theme = buildTheme(scheme)
  const tones: EventTone[] = ["neutral", "success", "warning", "danger"]

  test.each(tones)("the %s icon clears 3:1 against its tile", (tone) => {
    const { background, icon } = eventToneColors(theme, tone)
    expect(contrastRatio(icon, background)).toBeGreaterThanOrEqual(3)
  })

  test("the success check of Relevé soumis is clearly readable on its tile (4.5:1)", () => {
    const { background, icon } = eventToneColors(theme, eventVisual("submitted").tone)
    expect(eventVisual("submitted").tone).toBe("success")
    expect(contrastRatio(icon, background)).toBeGreaterThanOrEqual(4.5)
    expect(icon).toBe(theme.onSurface.success)
    expect(background).toBe(theme.colors.successSoft)
  })

  test("every known event type resolves to a passing pair", () => {
    for (const type of KNOWN_EVENT_TYPES) {
      const { background, icon } = eventToneColors(theme, eventVisual(type).tone)
      expect(contrastRatio(icon, background)).toBeGreaterThanOrEqual(3)
    }
  })

  test("the brand forest fails on the dark success tile, which is why the icon does not use it", () => {
    if (scheme !== "dark") return
    expect(contrastRatio("#334E2B", theme.colors.successSoft)).toBeLessThan(3)
    expect(eventToneColors(theme, "success").icon).not.toBe("#334E2B")
  })
})
