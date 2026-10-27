import { DMH_GROUP_CODES } from "@cortege/ibp-domain"

import {
  DMH_FORM_IDS,
  DMH_GUIDE_STRUCTURE,
  DMH_LIST_ORDER,
  DMH_UNGROUPED_TYPES_SHOWN_ON,
  DMH_WSL_EDITION,
  DMH_WSL_TYPES_WITHOUT_IBP_GROUP,
  DMH_WSL_TYPE_COUNT,
  formOf,
  groupsOf,
} from "./structure"

describe("DMH_GUIDE_STRUCTURE", () => {
  test("has exactly the fifteen IBP groups, each in one of the seven forms", () => {
    expect(Object.keys(DMH_GUIDE_STRUCTURE)).toEqual([...DMH_GROUP_CODES])
    for (const code of DMH_GROUP_CODES) {
      expect(DMH_FORM_IDS).toContain(DMH_GUIDE_STRUCTURE[code].form)
      expect(formOf(code)).toBe(DMH_GUIDE_STRUCTURE[code].form)
    }
  })

  test("every form holds at least one group, listed in IBP order", () => {
    for (const form of DMH_FORM_IDS) {
      const codes = groupsOf(form)
      expect(codes.length).toBeGreaterThan(0)
      expect(codes).toEqual(DMH_GROUP_CODES.filter((code) => formOf(code) === form))
    }
    expect(DMH_FORM_IDS.flatMap((form) => groupsOf(form)).sort()).toEqual([...DMH_GROUP_CODES])
  })

  test("the forms are contiguous in IBP order (the list is cut by form)", () => {
    const seen: string[] = []
    for (const code of DMH_GROUP_CODES) {
      const form = formOf(code)
      if (seen[seen.length - 1] !== form) seen.push(form)
    }
    expect(seen).toEqual([...DMH_FORM_IDS])
  })

  test("counted, not counted and without-group type numbers are disjoint and cover 1 to 52", () => {
    const counted = DMH_GROUP_CODES.flatMap((code) => [...DMH_GUIDE_STRUCTURE[code].wslTypes])
    const notCounted = DMH_GROUP_CODES.flatMap((code) => [
      ...DMH_GUIDE_STRUCTURE[code].wslTypesOutsideIbp,
    ])
    const without = [...DMH_WSL_TYPES_WITHOUT_IBP_GROUP]
    const all = [...counted, ...notCounted, ...without]
    expect(new Set(all).size).toBe(all.length)
    expect(all.every((number) => number >= 1 && number <= DMH_WSL_TYPE_COUNT)).toBe(true)
    expect(all.sort((a, b) => a - b)).toEqual(
      Array.from({ length: DMH_WSL_TYPE_COUNT }, (_, index) => index + 1),
    )
    expect(counted).toHaveLength(43)
    expect(notCounted).toHaveLength(7)
    expect(without).toEqual([31, 50])
  })

  test("the edition and the type count are the 2024 guide", () => {
    expect(DMH_WSL_EDITION).toBe(2024)
    expect(DMH_WSL_TYPE_COUNT).toBe(52)
  })

  test("the galls are shown on group 9 only, the alluvial deposit nowhere", () => {
    expect(DMH_UNGROUPED_TYPES_SHOWN_ON).toEqual({ dmh_09: [31] })
  })
})

describe("DMH_LIST_ORDER", () => {
  test("is a permutation of the fifteen codes", () => {
    expect([...DMH_LIST_ORDER].sort()).toEqual([...DMH_GROUP_CODES])
    expect(new Set(DMH_LIST_ORDER).size).toBe(15)
  })
})
