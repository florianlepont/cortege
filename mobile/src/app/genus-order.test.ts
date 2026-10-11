import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import {
  compareGenusCodes,
  createGenusComparator,
  genusSortKey,
  sortGenusCodes,
} from "./genus-order"

describe("genus-order", () => {
  it("builds a folded, space-separated sort key", () => {
    expect(genusSortKey("Quercus_deciduae")).toBe("quercus deciduae")
    expect(genusSortKey("Abies")).toBe("abies")
  })

  it("sorts the 34 codes by strictly ascending Latin key, supplementary genera interleaved", () => {
    const sorted = sortGenusCodes(CNPF_FACTOR_A_GENUS_CODES)
    expect(sorted).toHaveLength(34)
    expect(sorted[0]).toBe("Abies")
    expect(sorted[sorted.length - 1]).toBe("Ulmus")
    const keys = sorted.map(genusSortKey)
    for (let i = 1; i < keys.length; i += 1) {
      expect(keys[i - 1] < keys[i]).toBe(true)
    }
    const ceratonia = sorted.indexOf("Ceratonia")
    expect(sorted[ceratonia - 1]).toBe("Celtis")
    expect(sorted[ceratonia + 1]).toBe("Cercis")
    expect(sorted.indexOf("Quercus_deciduae")).toBeLessThan(sorted.indexOf("Quercus_sempervirens"))
  })

  it("returns a copy and leaves the package constant in its own order", () => {
    const input = [...CNPF_FACTOR_A_GENUS_CODES]
    const sorted = sortGenusCodes(input)
    expect(sorted).not.toBe(input)
    expect(input).toEqual([...CNPF_FACTOR_A_GENUS_CODES])
    expect(CNPF_FACTOR_A_GENUS_CODES[0]).toBe("Abies")
    expect(CNPF_FACTOR_A_GENUS_CODES[CNPF_FACTOR_A_GENUS_CODES.length - 1]).toBe("Pistacia")
  })

  it("orders the same without Intl as with the default collator", () => {
    const plain = createGenusComparator(null)
    const viaPlain = [...CNPF_FACTOR_A_GENUS_CODES].sort(plain)
    const viaDefault = [...CNPF_FACTOR_A_GENUS_CODES].sort(compareGenusCodes)
    expect(viaPlain).toEqual(viaDefault)
  })

  it("plain comparison returns -1, 1 and 0", () => {
    const plain = createGenusComparator(null)
    expect(plain("Abies", "Acer")).toBe(-1)
    expect(plain("Acer", "Abies")).toBe(1)
    expect(plain("Acer", "acer")).toBe(0)
  })

  it("uses the collator when given", () => {
    const compare = jest.fn(() => 7)
    const comparator = createGenusComparator({ compare })
    expect(comparator("Abies", "Acer")).toBe(7)
    expect(compare).toHaveBeenCalledWith("abies", "acer")
  })

  it("falls back to the plain comparison when Intl.Collator is missing", () => {
    jest.isolateModules(() => {
      const original = Intl.Collator
      Object.defineProperty(Intl, "Collator", { value: undefined, configurable: true })
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const isolated = require("./genus-order") as typeof import("./genus-order")
        expect(isolated.compareGenusCodes("Abies", "Acer")).toBe(-1)
      } finally {
        Object.defineProperty(Intl, "Collator", { value: original, configurable: true })
      }
    })
  })
})

describe("fr.genus.latinLabel", () => {
  it("puts the Latin name first and the French name in parentheses", () => {
    expect(fr.genus.latinLabel("Abies")).toBe("Abies (Sapin)")
    expect(fr.genus.latinLabel("Quercus_deciduae")).toBe(
      "Quercus deciduae (Chêne à feuilles caduques)",
    )
  })

  it("falls back to the Latin name alone when no French name is known", () => {
    expect(fr.genus.latinLabel("Unknown_genus" as never)).toBe("Unknown genus")
  })
})
