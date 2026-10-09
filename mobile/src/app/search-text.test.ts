import { foldSearchText, normalizeSearchQuery } from "./search-text"

const FIXTURE_LETTERS: Array<[string, string]> = [
  ["é", "e"],
  ["è", "e"],
  ["ê", "e"],
  ["ë", "e"],
  ["à", "a"],
  ["â", "a"],
  ["ç", "c"],
  ["ï", "i"],
  ["î", "i"],
  ["ô", "o"],
  ["ù", "u"],
  ["û", "u"],
  ["ü", "u"],
  ["ÿ", "y"],
  ["œ", "oe"],
  ["æ", "ae"],
]

describe("foldSearchText", () => {
  it("strips accents and lowercases", () => {
    expect(foldSearchText("Éléphant")).toBe("elephant")
  })

  it("expands the oe and ae ligatures", () => {
    expect(foldSearchText("ŒUVRE")).toBe("oeuvre")
    expect(foldSearchText("Cæsar")).toBe("caesar")
  })

  it.each(FIXTURE_LETTERS)("folds %s to %s in lower and upper case", (letter, base) => {
    expect(foldSearchText(letter)).toBe(base)
    expect(foldSearchText(letter.toUpperCase())).toBe(base)
  })

  it("keeps plain text, digits and spaces", () => {
    expect(foldSearchText("AB 0123 rue")).toBe("ab 0123 rue")
  })
})

describe("foldSearchText without runtime decomposition", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("folds the fixture list through the fallback table", () => {
    jest.spyOn(String.prototype, "normalize").mockImplementation(function (this: string) {
      return String(this)
    })
    jest.isolateModules(() => {
      const isolated = jest.requireActual("./search-text") as typeof import("./search-text")
      for (const [letter, base] of FIXTURE_LETTERS) {
        expect(isolated.foldSearchText(letter)).toBe(base)
        expect(isolated.foldSearchText(letter.toUpperCase())).toBe(base)
      }
      expect(isolated.foldSearchText("Éléphant ŒUVRE Cæsar")).toBe("elephant oeuvre caesar")
    })
  })
})

describe("normalizeSearchQuery", () => {
  it("trims and collapses whitespace, keeping accents", () => {
    expect(normalizeSearchQuery("  forêt   de  Rambouillet ")).toBe("forêt de Rambouillet")
  })

  it("collapses tabs and newlines", () => {
    expect(normalizeSearchQuery("a\t\nb")).toBe("a b")
  })

  it("returns an empty string for blank input", () => {
    expect(normalizeSearchQuery("   ")).toBe("")
  })
})
