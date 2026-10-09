import { toHistoryRow } from "./history-row"

describe("toHistoryRow", () => {
  test("no parcel: a value but no press", () => {
    expect(toHistoryRow({ kind: "noParcel" })).toEqual({
      value: "Aucune parcelle",
      accessibilityLabel: "Historique de la parcelle. Aucune parcelle",
      pressable: false,
    })
  })

  test("unavailable (offline or error): opens the page", () => {
    expect(toHistoryRow({ kind: "unavailable" })).toEqual({
      value: "Indisponible",
      accessibilityLabel: "Historique de la parcelle. Indisponible",
      pressable: true,
    })
  })

  test("first survey", () => {
    expect(toHistoryRow({ kind: "first" })).toEqual({
      value: "Premier relevé",
      accessibilityLabel: "Historique de la parcelle. Premier relevé",
      pressable: true,
    })
  })

  test("count: singular and plural", () => {
    expect(toHistoryRow({ kind: "count", count: 1 }).value).toBe("1 relevé")
    expect(toHistoryRow({ kind: "count", count: 3 })).toEqual({
      value: "3 relevés",
      accessibilityLabel: "Historique de la parcelle. 3 relevés",
      pressable: true,
    })
  })

  test("loading: no value, the label alone is spoken", () => {
    expect(toHistoryRow({ kind: "loading" })).toEqual({
      value: undefined,
      accessibilityLabel: "Historique de la parcelle",
      pressable: true,
    })
  })

  test("range: the arrow is seen, the words are spoken", () => {
    expect(toHistoryRow({ kind: "range", first: 21, latest: 34 })).toEqual({
      value: "21 → 34",
      accessibilityLabel: "Historique de la parcelle. de 21 à 34 sur 50",
      pressable: true,
    })
  })
})
