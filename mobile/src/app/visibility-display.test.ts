import { fr } from "../i18n"
import {
  visibilityCaption,
  visibilityIcon,
  visibilityKey,
  visibilityLabel,
} from "./visibility-display"

describe("visibility display (D-02)", () => {
  test("the wire value public is the catalogue key shared", () => {
    expect(visibilityKey("public")).toBe("shared")
    expect(visibilityKey("private")).toBe("private")
  })

  test("an unknown value fails closed to private", () => {
    expect(visibilityKey("something" as never)).toBe("private")
  })

  test("labels and captions come from the catalogue", () => {
    expect(visibilityLabel("public")).toBe(fr.surveyFinish.options.shared.label)
    expect(visibilityLabel("private")).toBe(fr.surveyFinish.options.private.label)
    expect(visibilityCaption("public")).toBe(fr.surveyFinish.options.shared.caption)
    expect(visibilityCaption("private")).toBe(fr.surveyFinish.options.private.caption)
  })

  test("glyphs are outline and never a globe", () => {
    expect(visibilityIcon("public")).toBe("people-outline")
    expect(visibilityIcon("private")).toBe("lock-closed-outline")
  })
})
