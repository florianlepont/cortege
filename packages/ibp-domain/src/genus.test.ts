import {
  allowedFactorAGenusCodes,
  CNPF_FACTOR_A_GENUS_CODES,
  CNPF_FACTOR_A_MAIN_GENERA,
  CNPF_FACTOR_A_SUPPLEMENTARY_GENERA,
  isCnpfFactorAGenusCode,
  isSupplementaryFactorAGenus,
} from "./genus"

describe("genus", () => {
  it("has 29 main taxa and 5 supplementary genera, 34 codes total, no overlap", () => {
    expect(CNPF_FACTOR_A_MAIN_GENERA).toHaveLength(29)
    expect(CNPF_FACTOR_A_SUPPLEMENTARY_GENERA).toHaveLength(5)
    expect(CNPF_FACTOR_A_GENUS_CODES).toHaveLength(34)
    expect(new Set(CNPF_FACTOR_A_GENUS_CODES).size).toBe(34)
  })

  it("splits Quercus into deciduous and evergreen classes, never a bare Quercus", () => {
    expect(CNPF_FACTOR_A_GENUS_CODES).toContain("Quercus_deciduae")
    expect(CNPF_FACTOR_A_GENUS_CODES).toContain("Quercus_sempervirens")
    expect(CNPF_FACTOR_A_GENUS_CODES).not.toContain("Quercus")
  })

  it("recognizes every listed code and rejects Ficus, an unlisted genus and non-strings", () => {
    for (const code of CNPF_FACTOR_A_GENUS_CODES) {
      expect(isCnpfFactorAGenusCode(code)).toBe(true)
    }
    expect(isCnpfFactorAGenusCode("Ficus")).toBe(false)
    expect(isCnpfFactorAGenusCode("Not_A_Genus")).toBe(false)
    expect(isCnpfFactorAGenusCode(42)).toBe(false)
    expect(isCnpfFactorAGenusCode(null)).toBe(false)
  })

  it("flags exactly the 5 supplementary genera", () => {
    for (const code of CNPF_FACTOR_A_SUPPLEMENTARY_GENERA) {
      expect(isSupplementaryFactorAGenus(code)).toBe(true)
    }
    expect(isSupplementaryFactorAGenus("Fagus")).toBe(false)
  })

  it("allows the main list only for cas 1 and 3, and for a null (v3.0) cas", () => {
    expect(allowedFactorAGenusCodes(1)).toEqual(CNPF_FACTOR_A_MAIN_GENERA)
    expect(allowedFactorAGenusCodes(3)).toEqual(CNPF_FACTOR_A_MAIN_GENERA)
    expect(allowedFactorAGenusCodes(null)).toEqual(CNPF_FACTOR_A_MAIN_GENERA)
  })

  it("adds the supplementary genera for cas 2 and cas 4", () => {
    expect(allowedFactorAGenusCodes(2)).toEqual(CNPF_FACTOR_A_GENUS_CODES)
    expect(allowedFactorAGenusCodes(4)).toEqual(CNPF_FACTOR_A_GENUS_CODES)
  })
})
