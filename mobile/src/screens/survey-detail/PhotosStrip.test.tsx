import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalAttachment, LocalSurvey } from "../../storage"
import { PhotosStrip } from "./PhotosStrip"
import { createPhotoStyles, PHOTO_LAYOUT, resolvePhotoSize } from "./photos.styles"
import { createSummaryScreenStyles } from "./summary-screen.styles"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Alert: { alert: jest.fn() },
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})
jest.mock("../survey-screen-helpers", () => ({
  isPhotoAttachment: (attachment: { mime_type: string }) =>
    attachment.mime_type.startsWith("image/"),
}))
jest.mock("./PhotoTile", () => ({
  PhotoTile: "PhotoTile",
  photoTileStatusText: (attachment: { file_state: string }) =>
    attachment.file_state === "missing" ? "missing" : undefined,
}))

const t = fr.surveyDetail.photos

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(photoCount: number, fileState = "local", canEdit = true): ReactTestRenderer {
  const attachments = Array.from({ length: photoCount }, (_, index) => ({
    id: `a${index}`,
    mime_type: "image/jpeg",
    file_state: fileState,
  })) as unknown as LocalAttachment[]
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <PhotosStrip
        survey={{ id: "s1" } as LocalSurvey}
        attachments={attachments}
        canEdit={canEdit}
        onTakePhoto={jest.fn()}
        onPickPhoto={jest.fn()}
        onDeleteAttachment={jest.fn()}
      />,
    )
  })
  return tree
}

const heading = (tree: ReactTestRenderer): ReactTestInstance =>
  tree.root.findAll(
    (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
  )[0]

describe("PhotosStrip heading (D-24)", () => {
  test("is a header with the card title role, the one of AppSectionHeader", () => {
    const tree = render(2)
    const title = heading(tree)
    expect(title.props.children[0]).toBe(t.title)
    expect(flatten(title.props.style)).toMatchObject({
      fontFamily: brandTypography.sectionHeader.fontFamily,
      fontSize: brandTypography.sectionHeader.fontSize,
      lineHeight: brandTypography.sectionHeader.lineHeight,
      color: defaultTheme.colors.textPrimary,
    })
  })

  test("is not the legacy 28 pt section title, and the count stays the same size", () => {
    const styles = createSummaryScreenStyles(defaultTheme)
    expect(styles.cardTitle.fontSize).toBeLessThan(brandTypography.sectionTitle.fontSize)
    expect(styles.cardTitle.fontSize).toBe(13)
    expect(styles.cardTitleCount.fontSize).toBe(styles.cardTitle.fontSize)
    expect(styles.cardTitleCount.lineHeight).toBe(styles.cardTitle.lineHeight)
    const count = heading(render(3)).props.children[1]
    expect(flatten(count.props.style).fontSize).toBe(13)
    expect(count.props.children).toBe(t.countSuffix(3))
  })

  test("the Ajouter pill is a 44 pt target around a glass pill, with its label and catalogue text", () => {
    const styles = createPhotoStyles(defaultTheme)
    const tree = render(2)
    const add = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        n.props.accessibilityLabel === fr.surveyDetail.a11y.addPhoto,
    )
    expect(add).toHaveLength(1)
    expect(add[0].props.style).toEqual(styles.addHit)
    expect(styles.addHit.minHeight).toBeGreaterThanOrEqual(44)
    expect(add[0].findAllByType("GlassSurface" as never)).toHaveLength(1)
    expect(add[0].findAllByType("Ionicons" as never)[0].props.name).toBe("add-outline")
    expect(
      add[0].findAll((n) => (n.type as unknown) === "Text").map((n) => n.props.children),
    ).toEqual([t.add])
  })

  test("a submitted survey has no Ajouter pill", () => {
    const tree = render(2, "local", false)
    expect(
      tree.root.findAll((n) => n.props.accessibilityLabel === fr.surveyDetail.a11y.addPhoto),
    ).toHaveLength(0)
  })
})

describe("PhotosStrip block (D-27b, second round)", () => {
  const styles = createPhotoStyles(defaultTheme)
  const views = (tree: ReactTestRenderer) =>
    tree.root.findAll((n) => (n.type as unknown) === "View")

  test("is a section of the page: no framing card around it", () => {
    const tree = render(1)
    const root = tree.root.findAll((n) => (n.type as unknown) === "View")[0]
    expect(root.props.style).toEqual(styles.block)
    expect(styles.block).not.toHaveProperty("backgroundColor")
    expect(styles.block).not.toHaveProperty("borderWidth")
    expect(styles.block).not.toHaveProperty("boxShadow")
    expect(createSummaryScreenStyles(defaultTheme)).not.toHaveProperty("photosCard")
    expect(views(tree).some((n) => n.props.testID === "photo-gallery-single")).toBe(true)
  })

  test("one photo is one full-width tile at 16:10, with no strip", () => {
    const tree = render(1)
    const size = resolvePhotoSize(1, 390)
    expect(tree.root.findAllByType("ScrollView" as never)).toHaveLength(0)
    const [tile] = tree.root.findAllByType("PhotoTile" as never)
    expect(tile.props.size).toEqual(size)
    expect(size.width).toBe(390 - 2 * PHOTO_LAYOUT.inset)
    expect(size.width / size.height).toBeCloseTo(1.6)
  })

  test("several photos are a snapping strip of 4:3 tiles at 78 percent, bleeding to the edges", () => {
    const tree = render(3)
    const size = resolvePhotoSize(3, 390)
    const scroll = tree.root.findByType("ScrollView" as never)
    expect(scroll.props.horizontal).toBe(true)
    expect(scroll.props.snapToInterval).toBe(size.width + PHOTO_LAYOUT.gap)
    expect(scroll.props.decelerationRate).toBe("fast")
    expect(scroll.props.showsHorizontalScrollIndicator).toBe(false)
    expect(scroll.props.style).toEqual(styles.strip)
    expect(scroll.props.contentContainerStyle).toEqual(styles.stripContent)
    const tiles = tree.root.findAllByType("PhotoTile" as never)
    expect(tiles).toHaveLength(3)
    for (const tile of tiles) expect(tile.props.size).toEqual(size)
    expect(size.width).toBeCloseTo((390 - 32) * 0.78)
    expect(size.width / size.height).toBeCloseTo(4 / 3)
  })

  test("a draft without photo shows a dashed add tile that asks to add one", () => {
    const tree = render(0)
    const tile = tree.root.findByProps({ testID: "photos-empty-tile" })
    expect(tile.props.style).toEqual(styles.emptyTile)
    expect(tile.props.accessibilityRole).toBe("button")
    expect(tile.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.addPhoto)
    expect(
      tile.findAll((n) => (n.type as unknown) === "Text").map((n) => n.props.children),
    ).toEqual([t.emptyAdd])
    expect(tile.findByType("Ionicons" as never).props.name).toBe("camera-outline")
    expect(t.emptyAdd).not.toContain("—")
    expect(tree.root.findAllByType("PhotoTile" as never)).toHaveLength(0)
  })

  test("the dashed tile adds a photo like the pill (same choice of camera or gallery)", () => {
    const tree = render(0)
    const { Alert } = jest.requireMock("react-native") as { Alert: { alert: jest.Mock } }
    act(() => tree.root.findByProps({ testID: "photos-empty-tile" }).props.onPress())
    expect(Alert.alert).toHaveBeenCalledWith(
      fr.surveyDetail.alerts.addPhotoTitle,
      fr.surveyDetail.alerts.addPhotoMessage,
      expect.any(Array),
    )
  })

  test("a submitted survey without photo renders nothing at all", () => {
    expect(render(0, "local", false).toJSON()).toBeNull()
  })
})

describe("PhotosStrip tiles (D-27b)", () => {
  const pressables = (tree: ReactTestRenderer) =>
    tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" && n.props.accessibilityLabel?.startsWith("Photo "),
    )

  test("every photo is a press target of the tile's own size, a tile inside, 44 pt or more", () => {
    const styles = createPhotoStyles(defaultTheme)
    for (const count of [1, 3]) {
      const size = resolvePhotoSize(count, 390)
      const targets = pressables(render(count))
      expect(targets).toHaveLength(count)
      for (const target of targets) {
        expect(target.props.style).toEqual([
          styles.photoPress,
          { width: size.width, height: size.height },
        ])
        expect(target.findAllByType("PhotoTile" as never)).toHaveLength(1)
        expect(size.width).toBeGreaterThanOrEqual(44)
        expect(size.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test("a tap on a photo of a draft offers to delete it, and does nothing when read-only", () => {
    const { Alert } = jest.requireMock("react-native") as { Alert: { alert: jest.Mock } }
    Alert.alert.mockClear()
    const draftPhoto = pressables(render(2, "local", true))[1]
    act(() => draftPhoto.props.onPress())
    expect(Alert.alert).toHaveBeenCalledWith(
      fr.surveyDetail.alerts.deletePhotoTitle,
      fr.surveyDetail.alerts.deletePhotoMessage,
      expect.any(Array),
    )
    Alert.alert.mockClear()
    const readOnly = pressables(render(2, "local", false))[1]
    expect(readOnly.props.accessibilityRole).toBe("image")
    act(() => readOnly.props.onPress())
    expect(Alert.alert).not.toHaveBeenCalled()
  })

  test("the labels come from the catalogue and a photo without picture adds its status as value", () => {
    const tree = render(2, "missing")
    const [first] = pressables(tree)
    expect(first.props.accessibilityLabel).toBe(
      fr.surveyDetail.a11y.photo({ position: 1, total: 2 }),
    )
    expect(first.props.accessibilityValue).toEqual({ text: "missing" })
    expect(first.props.accessibilityRole).toBe("button")
    const loaded = pressables(render(1))[0]
    expect(loaded.props.accessibilityValue).toEqual({ text: undefined })
  })
})
