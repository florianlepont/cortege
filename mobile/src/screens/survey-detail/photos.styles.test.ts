import { brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { createPhotoStyles, PHOTO_LAYOUT, resolvePhotoSize } from "./photos.styles"

jest.mock("react-native", () => ({
  StyleSheet: {
    create: <T>(styles: T): T => styles,
    absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  },
}))

describe("photo layout (D-27b, second round)", () => {
  test.each([375, 390, 430])("one photo is the full content width at 16:10 on %i pt", (window) => {
    const size = resolvePhotoSize(1, window)
    expect(size.mode).toBe("single")
    expect(size.width).toBe(window - 2 * PHOTO_LAYOUT.inset)
    expect(size.width / size.height).toBeCloseTo(16 / 10, 5)
  })

  test.each([375, 390, 430])(
    "several photos are 4:3 tiles of 78 percent of the content width on %i pt, with a peek",
    (window) => {
      const content = window - 2 * PHOTO_LAYOUT.inset
      for (const count of [2, 3, 9]) {
        const size = resolvePhotoSize(count, window)
        expect(size.mode).toBe("strip")
        expect(size.width).toBeCloseTo(content * 0.78, 5)
        expect(size.width / size.height).toBeCloseTo(4 / 3, 5)
        // The next tile starts inside the window: at least 40 pt of it shows at the right edge.
        const nextTileLeft = PHOTO_LAYOUT.inset + size.width + PHOTO_LAYOUT.gap
        expect(window - nextTileLeft).toBeGreaterThanOrEqual(40)
      }
    },
  )

  test("no photo is the single layout (the add tile spans the content width)", () => {
    expect(resolvePhotoSize(0, 390).mode).toBe("single")
  })

  test("constants sit on the 4 grid where they are spacing", () => {
    expect(PHOTO_LAYOUT.inset).toBe(brandSpacing4.md)
    expect(PHOTO_LAYOUT.radius).toBe(20)
    expect(PHOTO_LAYOUT.gap).toBe(12)
    expect(PHOTO_LAYOUT.emptyHeight).toBe(96)
    expect(PHOTO_LAYOUT.hitTarget).toBe(44)
  })
})

describe("photo block styles", () => {
  const styles = createPhotoStyles(defaultTheme)

  test("no framing card: no fill, border or shadow around the block", () => {
    expect(styles.block).not.toHaveProperty("backgroundColor")
    expect(styles.block).not.toHaveProperty("borderWidth")
    expect(styles.block).not.toHaveProperty("boxShadow")
    expect(styles.block).not.toHaveProperty("padding")
    expect(styles.header).not.toHaveProperty("backgroundColor")
  })

  test("the Ajouter pill is glass inside a 44 pt press target", () => {
    expect(styles.addHit.minHeight).toBeGreaterThanOrEqual(44)
    expect(styles.addHit.minWidth).toBeGreaterThanOrEqual(44)
    expect(styles.header.minHeight).toBeGreaterThanOrEqual(44)
    expect(styles.addPill.height).toBeLessThan(styles.addHit.minHeight)
    expect(styles.addPill.borderRadius).toBe(999)
    expect(styles.addPill.borderColor).toBe(defaultTheme.colors.divider)
  })

  test("the strip bleeds to the screen edges: the page padding is taken back and given back", () => {
    expect(styles.strip.marginHorizontal).toBe(-PHOTO_LAYOUT.inset)
    expect(styles.stripContent.paddingHorizontal).toBe(PHOTO_LAYOUT.inset)
    expect(styles.stripContent.gap).toBe(12)
  })

  test("the empty tile is a dashed glass tile of about 96 pt with the tile radius", () => {
    expect(styles.emptyTile).toMatchObject({
      minHeight: 96,
      borderStyle: "dashed",
      borderRadius: PHOTO_LAYOUT.radius,
      borderCurve: "continuous",
      backgroundColor: defaultTheme.visual.glass.cardFill,
      borderColor: defaultTheme.colors.inputBorder,
    })
  })
})
