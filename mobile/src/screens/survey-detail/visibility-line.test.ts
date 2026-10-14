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

  test("a draft that will be shared", () => {
    expect(resolveVisibilityLine({ status: "draft", visibility: "public" })).toEqual({
      icon: "people-outline",
      text: "Sera partagé avec l'association (choix à la fin)",
      accessibilityLabel: "Visibilité : sera partagé avec l'association, choix à la fin.",
    })
  })

  test("a draft that will stay private", () => {
    expect(resolveVisibilityLine({ status: "draft", visibility: "private" })).toEqual({
      icon: "lock-closed-outline",
      text: "Restera privé (choix à la fin)",
      accessibilityLabel: "Visibilité : restera privé, choix à la fin.",
    })
  })

  test("any status other than submitted is read as a draft", () => {
    expect(resolveVisibilityLine({ status: "pending", visibility: "private" }).text).toBe(
      "Restera privé (choix à la fin)",
    )
  })
})
