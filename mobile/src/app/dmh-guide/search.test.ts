import { DMH_GROUP_CODES } from "@cortege/ibp-domain"

import { searchDmhGroups } from "./search"

describe("searchDmhGroups", () => {
  test("an empty or blank query returns the fifteen groups in IBP order", () => {
    expect(searchDmhGroups("")).toEqual([...DMH_GROUP_CODES])
    expect(searchDmhGroups("   ")).toEqual([...DMH_GROUP_CODES])
  })

  test("accent and case do not matter", () => {
    expect(searchDmhGroups("Écorce")).toEqual(searchDmhGroups("ecorce"))
    expect(searchDmhGroups("ECORCE")).toEqual(searchDmhGroups("écorce"))
    expect(searchDmhGroups("ecorce")).toContain("dmh_05")
  })

  test("finds groups by common words", () => {
    expect(searchDmhGroups("gui")).toContain("dmh_12")
    expect(searchDmhGroups("pic")).toContain("dmh_01")
    expect(searchDmhGroups("lierre")).toContain("dmh_12")
    expect(searchDmhGroups("résine")).toContain("dmh_15")
    expect(searchDmhGroups("polypore")).toEqual(expect.arrayContaining(["dmh_10", "dmh_11"]))
  })

  test("finds a group by its label and by a counted type name", () => {
    expect(searchDmhGroups("loupes")).toContain("dmh_09")
    expect(searchDmhGroups("dendrotelme")).toContain("dmh_04")
    expect(searchDmhGroups("flûte")).toContain("dmh_01")
  })

  test("the result stays in IBP order", () => {
    const found = searchDmhGroups("champignon")
    expect(found).toEqual(DMH_GROUP_CODES.filter((code) => found.includes(code)))
  })

  test("a word that matches nothing returns an empty list", () => {
    expect(searchDmhGroups("zzzxqk")).toEqual([])
  })
})
