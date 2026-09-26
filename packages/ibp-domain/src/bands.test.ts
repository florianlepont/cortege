import { IBP_MAX, bandTone, contextBand, standBand, totalBand } from "./bands"

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
