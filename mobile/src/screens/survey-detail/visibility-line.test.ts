import { resolveVisibilityLine } from "./visibility-line"

describe("resolveVisibilityLine (D-15)", () => {
  test("a finished shared survey", () => {
    expect(resolveVisibilityLine({ status: "submitted", visibility: "public" })).toEqual({
      icon: "people-outline",
      text: "Partagé avec l'association",
      accessibilityLabel: "Visibilité : partagé avec l'association. Ne peut plus être modifiée.",
    })
  })

  test("a finished private survey", () => {
    expect(resolveVisibilityLine({ status: "submitted", visibility: "private" })).toEqual({
      icon: "lock-closed-outline",
      text: "Privé",
      accessibilityLabel: "Visibilité : privé. Ne peut plus être modifiée.",
    })
  })

  test("a draft has no line, the finish sheet shows the choice", () => {
    expect(resolveVisibilityLine({ status: "draft", visibility: "public" })).toBeNull()
    expect(resolveVisibilityLine({ status: "draft", visibility: "private" })).toBeNull()
  })

  test("any status other than submitted has no line either", () => {
    expect(resolveVisibilityLine({ status: "pending", visibility: "private" })).toBeNull()
  })
})
