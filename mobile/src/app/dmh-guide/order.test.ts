import { DMH_GROUP_CODES } from "@cortege/ibp-domain"

import { orderDmhRows } from "./order"
import { DMH_FORM_IDS, DMH_LIST_ORDER, formOf } from "./structure"

const none = { ticked: null, counts: {} } as const

describe("orderDmhRows with nothing ticked or counted", () => {
  test("gives the seven sections in form order, all closed, rows in the validated order", () => {
    const sections = orderDmhRows(none)
    expect(sections.map((section) => section.form)).toEqual([...DMH_FORM_IDS])
    expect(sections.every((section) => !section.defaultExpanded)).toBe(true)
    for (const section of sections) {
      expect(section.codes).toEqual(DMH_LIST_ORDER.filter((code) => formOf(code) === section.form))
    }
    expect(sections.flatMap((section) => [...section.codes])).toEqual([...DMH_GROUP_CODES])
  })

  test("an empty tick list behaves like none", () => {
    expect(orderDmhRows({ ticked: [], counts: {} })).toEqual(orderDmhRows(none))
  })
})

describe("orderDmhRows with ticked groups", () => {
  test("the section of a ticked group comes first and open, the others follow collapsed", () => {
    const sections = orderDmhRows({ ticked: ["dmh_12"], counts: {} })
    expect(sections.map((section) => section.form)).toEqual([
      "epiphytic",
      "cavities",
      "wounds",
      "crown_deadwood",
      "growths",
      "fruiting_bodies",
      "exudates",
    ])
    expect(sections.map((section) => section.defaultExpanded)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
    expect(sections[0]?.codes).toEqual(["dmh_12", "dmh_13", "dmh_14"])
  })

  test("inside a section the ticked groups come first, then the rest in order", () => {
    const sections = orderDmhRows({ ticked: ["dmh_04", "dmh_02"], counts: {} })
    expect(sections[0]).toEqual({
      form: "cavities",
      codes: ["dmh_02", "dmh_04", "dmh_01", "dmh_03"],
      defaultExpanded: true,
    })
  })

  test("two active sections keep the form order between them", () => {
    const sections = orderDmhRows({ ticked: ["dmh_15", "dmh_06"], counts: {} })
    expect(sections.slice(0, 2).map((section) => section.form)).toEqual(["wounds", "exudates"])
    expect(sections.slice(0, 2).every((section) => section.defaultExpanded)).toBe(true)
    expect(sections.slice(2).every((section) => !section.defaultExpanded)).toBe(true)
  })
})

describe("orderDmhRows with counts", () => {
  test("a counted group without a tick is active", () => {
    const sections = orderDmhRows({ ticked: [], counts: { dmh_07: 2 } })
    expect(sections[0]).toEqual({
      form: "crown_deadwood",
      codes: ["dmh_07"],
      defaultExpanded: true,
    })
    expect(sections[1]?.defaultExpanded).toBe(false)
  })

  test("a count of 0 is not active", () => {
    expect(orderDmhRows({ ticked: null, counts: { dmh_07: 0 } })).toEqual(orderDmhRows(none))
  })
})

describe("orderDmhRows robustness", () => {
  test("unknown codes are ignored", () => {
    expect(orderDmhRows({ ticked: ["dmh_99", "other"], counts: {} })).toEqual(orderDmhRows(none))
  })

  test("does not mutate its input and is deterministic", () => {
    const ticked = ["dmh_12", "dmh_01"]
    const counts = { dmh_07: 1 }
    const first = orderDmhRows({ ticked, counts })
    const second = orderDmhRows({ ticked, counts })
    expect(second).toEqual(first)
    expect(ticked).toEqual(["dmh_12", "dmh_01"])
    expect(counts).toEqual({ dmh_07: 1 })
  })

  test("always lists the fifteen groups once", () => {
    const sections = orderDmhRows({ ticked: ["dmh_10", "dmh_03"], counts: { dmh_14: 3 } })
    expect(sections.flatMap((section) => [...section.codes]).sort()).toEqual([...DMH_GROUP_CODES])
  })
})
