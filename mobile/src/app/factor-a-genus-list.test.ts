import {
  addGenusToListValue,
  parseGenusListValue,
  serializeGenusListValue,
  toggleGenusInListValue,
} from "./factor-a-genus-list"

describe("factor-a-genus-list", () => {
  describe("parseGenusListValue", () => {
    it("parses a comma-joined value into deduplicated valid codes, order preserved", () => {
      expect(parseGenusListValue("Fagus,Quercus_deciduae,Fagus")).toEqual([
        "Fagus",
        "Quercus_deciduae",
      ])
    })

    it("returns an empty list for an empty string", () => {
      expect(parseGenusListValue("")).toEqual([])
    })

    it("drops blanks, whitespace and unlisted codes (e.g. Ficus)", () => {
      expect(parseGenusListValue(" Fagus , ,Ficus,Acer ")).toEqual(["Fagus", "Acer"])
    })
  })

  describe("serializeGenusListValue", () => {
    it("round-trips through parseGenusListValue", () => {
      const value = serializeGenusListValue(["Fagus", "Acer"])
      expect(parseGenusListValue(value)).toEqual(["Fagus", "Acer"])
    })

    it("serializes an empty list as an empty string", () => {
      expect(serializeGenusListValue([])).toBe("")
    })
  })

  describe("toggleGenusInListValue", () => {
    it("adds a genus not yet present", () => {
      expect(toggleGenusInListValue("Fagus", "Acer")).toBe("Fagus,Acer")
    })

    it("removes a genus already present", () => {
      expect(toggleGenusInListValue("Fagus,Acer", "Fagus")).toBe("Acer")
    })
  })

  describe("addGenusToListValue", () => {
    it("adds a genus not yet present", () => {
      expect(addGenusToListValue("Fagus", "Acer")).toBe("Fagus,Acer")
    })

    it("is idempotent: confirming the same suggestion twice does not duplicate it", () => {
      expect(addGenusToListValue("Fagus,Acer", "Acer")).toBe("Fagus,Acer")
    })

    it("adds to an empty list", () => {
      expect(addGenusToListValue("", "Tilia")).toBe("Tilia")
    })
  })
})
