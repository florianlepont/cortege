import type { DisplayedFactorResult } from "../screens/survey-detail/useLocalDraftSummary"
import { attachFactorAnnotations } from "./factor-annotations"

const entry = (points: number | null): DisplayedFactorResult => ({
  selected_class: "S2",
  warnings: [],
  score_points: points,
})

describe("attachFactorAnnotations (D-13, D-14)", () => {
  it("adds the doubt and the note only on the annotated factor", () => {
    const entries: Array<[string, DisplayedFactorResult]> = [
      ["A", entry(2)],
      ["B", entry(3)],
    ]

    const result = attachFactorAnnotations(entries, { A: { doubt: true, note: "x" } })

    expect(result[0]).toEqual(["A", { ...entry(2), doubt: true, note: "x" }])
    expect(result[1]).toEqual(["B", entry(3)])
    expect("doubt" in result[1][1]).toBe(false)
    expect("note" in result[1][1]).toBe(false)
  })

  it("adds a doubt alone or a note alone", () => {
    const result = attachFactorAnnotations(
      [
        ["C", entry(1)],
        ["D", entry(null)],
      ],
      { C: { doubt: true }, D: { note: "souches" } },
    )

    expect(result[0][1]).toEqual({ ...entry(1), doubt: true })
    expect("note" in result[0][1]).toBe(false)
    expect(result[1][1]).toEqual({ ...entry(null), note: "souches" })
    expect("doubt" in result[1][1]).toBe(false)
  })

  it("never changes the points, the class or the warnings", () => {
    const [[, annotated]] = attachFactorAnnotations([["E", entry(4)]], {
      E: { doubt: true, note: "n" },
    })

    expect(annotated.score_points).toBe(4)
    expect(annotated.selected_class).toBe("S2")
    expect(annotated.warnings).toEqual([])
  })

  it("returns the same entries when there is no annotation", () => {
    const entries: Array<[string, DisplayedFactorResult]> = [["A", entry(2)]]

    expect(attachFactorAnnotations(entries, {})).toEqual(entries)
  })

  it("does not mutate its input", () => {
    const original = entry(2)
    const entries: Array<[string, DisplayedFactorResult]> = [["A", original]]

    attachFactorAnnotations(entries, { A: { doubt: true, note: "x" } })

    expect(original).toEqual(entry(2))
    expect(entries).toEqual([["A", entry(2)]])
  })

  it("ignores annotations of a factor that has no entry", () => {
    expect(attachFactorAnnotations([["A", entry(2)]], { J: { doubt: true } })).toEqual([
      ["A", entry(2)],
    ])
  })
})
