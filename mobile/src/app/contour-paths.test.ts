import { CONTOUR_PATHS, CONTOUR_VIEWBOX, buildContourPaths } from "./contour-paths"

function subpaths(path: string): string[] {
  return path.split("Z").filter((part) => part.trim().length > 0)
}

describe("buildContourPaths", () => {
  it("builds a sage group of 9 rings and a moss group of 2 (every fourth ring)", () => {
    const { sage, moss } = buildContourPaths()

    expect(subpaths(sage)).toHaveLength(9)
    expect(subpaths(moss)).toHaveLength(2)
  })

  it("closes every subpath and never produces NaN", () => {
    const { sage, moss } = buildContourPaths()

    for (const path of [sage, moss]) {
      for (const ring of subpaths(path)) {
        expect(ring.trim().startsWith("M")).toBe(true)
      }
      expect(path.endsWith("Z")).toBe(true)
      expect(path).not.toContain("NaN")
    }
  })

  it("is identical on every call", () => {
    expect(buildContourPaths()).toEqual(buildContourPaths())
  })

  it("exports the module-level paths and the viewbox", () => {
    expect(CONTOUR_PATHS).toEqual(buildContourPaths())
    expect(CONTOUR_VIEWBOX).toBe("0 0 320 180")
  })

  it("honours a custom ring count", () => {
    const { sage, moss } = buildContourPaths(4)

    expect(subpaths(sage)).toHaveLength(3)
    expect(subpaths(moss)).toHaveLength(1)
  })
})
