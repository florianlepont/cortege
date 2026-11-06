import {
  CONTEXT_BAND_CUT_OFFS,
  IBP_MAX,
  STAND_BAND_CUT_OFFS,
  bandTone,
  contextBand,
  standBand,
  totalBand,
} from "./bands"

describe("IBP_MAX", () => {
  it("is 35 + 15 = 50 (GS-1)", () => {
    expect(IBP_MAX).toEqual({ stand: 35, context: 15, total: 50 })
  })
})

describe("standBand (/35, CNPF chart)", () => {
  it.each([
    [0, "faible"],
    [6, "faible"],
    [7, "assez_faible"],
    [13, "assez_faible"],
    [14, "moyenne"],
    [20, "moyenne"],
    [21, "assez_forte"],
    [27, "assez_forte"],
    [28, "forte"],
    [35, "forte"],
  ])("%p -> %p", (score, band) => {
    expect(standBand(score)).toBe(band)
  })
})

describe("contextBand (/15, CNPF chart)", () => {
  it.each([
    [0, "faible"],
    [4, "faible"],
    [5, "moyenne"],
    [9, "moyenne"],
    [10, "forte"],
    [15, "forte"],
  ])("%p -> %p", (score, band) => {
    expect(contextBand(score)).toBe(band)
  })
})

describe("totalBand (/50, app convention)", () => {
  it.each([
    [0, "faible"],
    [9, "faible"],
    [10, "assez_faible"],
    [19, "assez_faible"],
    [20, "moyenne"],
    [29, "moyenne"],
    [30, "assez_forte"],
    [39, "assez_forte"],
    [40, "forte"],
    [50, "forte"],
  ])("%p -> %p", (score, band) => {
    expect(totalBand(score)).toBe(band)
  })
})

describe("bandTone", () => {
  it("maps the five bands to three tones", () => {
    expect(bandTone("faible")).toBe("low")
    expect(bandTone("assez_faible")).toBe("low")
    expect(bandTone("moyenne")).toBe("mid")
    expect(bandTone("assez_forte")).toBe("high")
    expect(bandTone("forte")).toBe("high")
  })
})

describe("band cut-off constants (phase 33, D-28)", () => {
  it("pins the CNPF chart ticks", () => {
    expect(STAND_BAND_CUT_OFFS).toEqual([7, 14, 21, 28])
    expect(CONTEXT_BAND_CUT_OFFS).toEqual([5, 10])
  })

  it("is the boundary of the band functions: a cut starts a new band, the point below does not", () => {
    for (const cut of STAND_BAND_CUT_OFFS) {
      expect(standBand(cut)).not.toBe(standBand(cut - 1))
    }
    for (const cut of CONTEXT_BAND_CUT_OFFS) {
      expect(contextBand(cut)).not.toBe(contextBand(cut - 1))
    }
  })

  it("stays inside the maxima", () => {
    expect(Math.max(...STAND_BAND_CUT_OFFS)).toBeLessThan(IBP_MAX.stand)
    expect(Math.max(...CONTEXT_BAND_CUT_OFFS)).toBeLessThan(IBP_MAX.context)
  })
})
