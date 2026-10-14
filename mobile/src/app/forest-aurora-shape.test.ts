import { textEllipse } from "./forest-aurora-shape"

describe("textEllipse at degenerate measures", () => {
  const sizes = [0, -40, Number.NaN, Number.NEGATIVE_INFINITY, 0.001]
  it.each(sizes)("keeps both radii above zero for a block of %p", (size) => {
    const e = textEllipse({ x: 0, y: 0, width: size, height: size })
    expect(e.rx).toBeGreaterThan(0)
    expect(e.ry).toBeGreaterThan(0)
    expect(e.inner).toBeGreaterThan(0)
    expect(e.inner).toBeLessThanOrEqual(1)
  })

  it("keeps a tall text block's radii positive at an extreme font scale", () => {
    const e = textEllipse({ x: 10, y: 10, width: 0, height: 2.0 * 96 })
    expect(e.rx).toBeGreaterThan(0)
    expect(e.ry).toBeGreaterThan(0)
  })
})
