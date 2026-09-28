import { KNOWN_EVENT_TYPES } from "./event-labels"
import { eventVisual } from "./event-icons"

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
