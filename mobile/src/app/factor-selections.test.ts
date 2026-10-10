import {
  SELECTION_KEYS,
  readSelection,
  selectionLabel,
  selectionOptionsFor,
} from "./factor-selections"

const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"
const V3_0 = "cnpf_ibp_fr_v3_0_2023-03-23"

describe("factor-selections", () => {
  it("names the key each factor stores its detail under", () => {
    expect(SELECTION_KEYS).toEqual({
      B: "strata",
      F: "dmh_groups",
      H: "evidence",
      I: "types",
      J: "types",
    })
  })

  describe("selectionOptionsFor", () => {
    it("offers 11 aquatic types for v3.2, ending with the sea", () => {
      const options = selectionOptionsFor("I", V3_2, null)
      expect(options).toHaveLength(11)
      expect(options[10]?.value).toBe("sea")
    })

    it("treats a null method as v3.0: 10 aquatic and 9 rocky types", () => {
      expect(selectionOptionsFor("I", null, null)).toHaveLength(10)
      expect(selectionOptionsFor("I", V3_0, null)).toHaveLength(10)
      const rocky = selectionOptionsFor("J", null, null)
      expect(rocky).toHaveLength(9)
      expect(rocky.map((option) => option.value)).toContain("lower_rock")
    })

    it("offers 12 rocky types for v3.2", () => {
      expect(selectionOptionsFor("J", V3_2, null)).toHaveLength(12)
    })

    it("keeps a selected code of the other method visible, with its own label", () => {
      const options = selectionOptionsFor("J", V3_2, ["lower_rock", "slab"])
      expect(options).toHaveLength(13)
      expect(options[12]).toEqual({
        value: "lower_rock",
        label: "Rocher plus bas que le peuplement (gros blocs, paroi basse, affleurement)",
      })
    })

    it("appends a v3.2 only code when the survey follows v3.0", () => {
      const options = selectionOptionsFor("I", null, ["sea"])
      expect(options).toHaveLength(11)
      expect(options[10]?.value).toBe("sea")
    })

    it("ignores unknown selected codes", () => {
      expect(selectionOptionsFor("I", V3_2, ["bogus"])).toHaveLength(11)
    })

    it("lists the strata, the 15 groups and the 3 sources", () => {
      expect(selectionOptionsFor("B", V3_2, null)).toHaveLength(5)
      expect(selectionOptionsFor("F", V3_2, null)).toHaveLength(15)
      expect(selectionOptionsFor("H", null, null)).toHaveLength(3)
    })
  })

  describe("readSelection", () => {
    it("reads the stored list", () => {
      expect(readSelection({ strata_count: 2, strata: ["low", "high"] }, "B")).toEqual([
        "low",
        "high",
      ])
    })

    it("gives null for a missing key, a non-array value or a non-object factor", () => {
      expect(readSelection({ strata_count: 2 }, "B")).toBeNull()
      expect(readSelection({ strata: "low" }, "B")).toBeNull()
      expect(readSelection(null, "B")).toBeNull()
      expect(readSelection("x", "F")).toBeNull()
      expect(readSelection([], "F")).toBeNull()
    })

    it("drops unknown codes and non-strings and removes duplicates, first kept", () => {
      expect(readSelection({ strata: ["low", "bogus", 3, "high", "low"] }, "B")).toEqual([
        "low",
        "high",
      ])
    })

    it("keeps a code of either method", () => {
      expect(readSelection({ types: ["lower_rock", "cliff_high"] }, "J")).toEqual([
        "lower_rock",
        "cliff_high",
      ])
      expect(readSelection({ types: ["sea"] }, "I")).toEqual(["sea"])
    })

    it("returns an empty list for a recorded zero", () => {
      expect(readSelection({ type_count: 0, types: [] }, "I")).toEqual([])
    })

    it("does not accept a code that belongs to another factor", () => {
      expect(readSelection({ types: ["sea"] }, "J")).toEqual([])
    })
  })

  describe("selectionLabel", () => {
    it("labels a code of either method", () => {
      expect(selectionLabel("I", "sea")).toBe("Mer ou océan")
      expect(selectionLabel("J", "lower_rock")).toBe(
        "Rocher plus bas que le peuplement (gros blocs, paroi basse, affleurement)",
      )
      expect(selectionLabel("F", "dmh_01")).toBe("1. Loges de pic")
    })

    it("prefers the wording of the survey's own method", () => {
      expect(selectionLabel("J", "cliff_high", V3_0)).toBe("Falaise plus haute que le peuplement")
      expect(selectionLabel("J", "cliff_high", null)).toBe("Falaise plus haute que le peuplement")
      expect(selectionLabel("J", "cliff_high", V3_2)).toBe(
        "Falaise ou paroi plus haute que les arbres adultes",
      )
    })

    it("gives null for an unknown code", () => {
      expect(selectionLabel("I", "bogus")).toBeNull()
      expect(selectionLabel("J", "sea")).toBeNull()
    })
  })
})
