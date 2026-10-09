import { parseParcelQuery } from "../src/surveys/parcel-query"

describe("parseParcelQuery", () => {
  describe("a commune code, section and number", () => {
    it.each([
      "77186000AB0123",
      "77186 000 AB 0123",
      "77186000ab0123",
      "77186 AB 0123",
      "77186 ab 123",
      "77186AB123",
      "parcelle 77186 AB n° 123",
    ])("reads %j", (text) => {
      expect(parseParcelQuery(text)).toEqual({
        kind: "key",
        communeCode: "77186",
        section: "AB",
        number: "0123",
      })
    })

    it("keeps a numbered section of Alsace-Moselle", () => {
      expect(parseParcelQuery("67392 09 0001")).toEqual({
        kind: "key",
        communeCode: "67392",
        section: "09",
        number: "0001",
      })
    })

    it("keeps the arrondissement code of Paris", () => {
      expect(parseParcelQuery("75112 BL 10")).toEqual({
        kind: "key",
        communeCode: "75112",
        section: "BL",
        number: "0010",
      })
    })

    it("reads a one-letter section of an IDU", () => {
      expect(parseParcelQuery("77186000 0A 0012")).toEqual({
        kind: "key",
        communeCode: "77186",
        section: "A",
        number: "0012",
      })
      expect(parseParcelQuery("77186 A 12")).toEqual({
        kind: "key",
        communeCode: "77186",
        section: "A",
        number: "0012",
      })
    })

    it("is not fooled by a run of digits that is not an IDU", () => {
      expect(parseParcelQuery("00000000000000")).toBeNull()
    })
  })

  describe("a commune name, section and number", () => {
    it.each([
      ["Fontainebleau AB 123", "Fontainebleau"],
      ["AB 123 Fontainebleau", "Fontainebleau"],
      ["parcelle AB 123 Fontainebleau", "Fontainebleau"],
      ["Saint-Martin-d'Hères AB 12", "Saint Martin d'Hères"],
      ["Fontainebleau section AB numéro 123", "Fontainebleau"],
    ])("reads %j", (text, communeName) => {
      const parsed = parseParcelQuery(text)
      expect(parsed).toMatchObject({ kind: "communeName", communeName })
      expect(parsed).toHaveProperty("section", "AB")
    })

    it("pads the number to four digits", () => {
      expect(parseParcelQuery("Fontainebleau AB 123")).toEqual({
        kind: "communeName",
        communeName: "Fontainebleau",
        section: "AB",
        number: "0123",
      })
    })

    it("keeps a section called NO when a name comes before it", () => {
      expect(parseParcelQuery("Fontainebleau NO 12")).toEqual({
        kind: "communeName",
        communeName: "Fontainebleau",
        section: "NO",
        number: "0012",
      })
    })

    it("drops the word NO after a section", () => {
      expect(parseParcelQuery("Fontainebleau AB no 12")).toEqual({
        kind: "communeName",
        communeName: "Fontainebleau",
        section: "AB",
        number: "0012",
      })
    })

    it("is not a commune name when the only other word looks like a section", () => {
      expect(parseParcelQuery("BL AB 12")).toBeNull()
    })
  })

  describe("a section and number alone", () => {
    it.each(["AB 0123", "ab 123", "section AB n° 123", "parcelle AB-123"])("reads %j", (text) => {
      expect(parseParcelQuery(text)).toEqual({
        kind: "sectionNumber",
        section: "AB",
        number: "0123",
        departmentPrefix: null,
      })
    })

    it("keeps the department typed before it", () => {
      expect(parseParcelQuery("77 AB 0123")).toEqual({
        kind: "sectionNumber",
        section: "AB",
        number: "0123",
        departmentPrefix: "77",
      })
      expect(parseParcelQuery("2A AB 12")).toMatchObject({ departmentPrefix: "2A" })
      expect(parseParcelQuery("971 AB 12")).toMatchObject({ departmentPrefix: "971" })
    })

    it("prefers the section and number over a number that follows", () => {
      expect(parseParcelQuery("AB 12 34")).toBeNull()
    })
  })

  describe("anything else", () => {
    it.each([
      "",
      "   ",
      "Fontainebleau",
      "12 rue de la paix",
      "1234",
      "AB",
      "AB Fontainebleau",
      "00000 00 0000",
      "a".repeat(101),
      "01 23 45 67 89",
    ])("is null for %j", (text) => {
      expect(parseParcelQuery(text)).toBeNull()
    })

    it("reads a text of exactly 100 characters", () => {
      const text = `${"a".repeat(80)} AB 123`
      expect(parseParcelQuery(text)).toMatchObject({ kind: "communeName", number: "0123" })
    })
  })
})
