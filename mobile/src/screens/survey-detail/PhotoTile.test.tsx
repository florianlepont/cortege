import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalAttachment } from "../../storage"
import { PHOTO_FADE_MS, PhotoTile, photoTileStatusText } from "./PhotoTile"
import { createPhotoStyles, PHOTO_LAYOUT, type PhotoSize } from "./photos.styles"

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

const mockReduced = { value: false }

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: {
      create: <T,>(styles: T): T => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})
jest.mock("expo-image", () => ({ Image: "ExpoImage" }))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("react-native-reanimated", () => ({ useReducedMotion: () => mockReduced.value }))
jest.mock("../../ui/Skeleton", () => ({ Skeleton: "Skeleton" }))
jest.mock("../../ui/AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})
jest.mock("../../storage/attachment-files", () => ({
  resolveAttachmentUri: (uri: string) => `resolved:${uri}`,
}))

const t = fr.surveyDetail.photos
const preview = fr.labels.attachmentPreview

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function attachment(overrides: Partial<LocalAttachment> = {}): LocalAttachment {
  return {
    id: "a1",
    mime_type: "image/jpeg",
    file_state: "local",
    local_uri: "file:///photos/a1.jpg",
    ...overrides,
  } as unknown as LocalAttachment
}

// The two sizes a tile has on a 390 pt window (`resolvePhotoSize`): full width 16:10, or a strip tile.
const SINGLE: PhotoSize = { mode: "single", width: 358, height: 223.75 }
const STRIP: PhotoSize = { mode: "strip", width: 279.24, height: 209.43 }

let tree: ReactTestRenderer

function mount(item: LocalAttachment, size: PhotoSize = STRIP): ReactTestInstance {
  act(() => {
    tree = renderer.create(<PhotoTile attachment={item} size={size} />)
  })
  return tree.root
}

const types = (root: ReactTestInstance, type: string) =>
  root.findAll((node) => (node.type as unknown) === type)

afterEach(() => {
  mockReduced.value = false
  act(() => tree?.unmount())
})

describe("photo tile box (D-27b)", () => {
  test("one radius on the 4 grid with continuous corners, and a glass hairline, whatever the size", () => {
    const styles = createPhotoStyles(defaultTheme)
    expect(PHOTO_LAYOUT.radius).toBe(20)
    expect(PHOTO_LAYOUT.radius % 4).toBe(0)
    expect(PHOTO_LAYOUT.radius).toBeLessThan(brandRadius.card)
    expect(PHOTO_LAYOUT.gap % 4).toBe(0)
    expect(styles.photo).toMatchObject({
      borderRadius: PHOTO_LAYOUT.radius,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: defaultTheme.visual.glass.cardBorder,
      overflow: "hidden",
    })
    // The size is the caller's: the style itself has none.
    expect(styles.photo).not.toHaveProperty("width")
    expect(styles.photo).not.toHaveProperty("height")
    expect(styles.photoPress.borderRadius).toBe(PHOTO_LAYOUT.radius)
    expect(styles.stripContent.gap).toBe(PHOTO_LAYOUT.gap)
  })

  test.each([
    ["a single photo", SINGLE],
    ["a strip tile", STRIP],
  ] as const)("takes the box of %s", (_label, size) => {
    const root = mount(attachment(), size)
    expect(flatten(root.findByProps({ testID: "photo-tile-image" }).props.style)).toMatchObject({
      width: size.width,
      height: size.height,
    })
  })

  test.each([
    ["an image", attachment(), "photo-tile-image"],
    [
      "a photo to download",
      attachment({ file_state: "remote", local_uri: undefined }),
      "photo-tile-loading",
    ],
    ["a missing file", attachment({ file_state: "missing" }), "photo-tile-missing"],
    ["an unavailable file", attachment({ file_state: "unavailable" }), "photo-tile-unavailable"],
  ] as const)("%s sits in the same fixed box", (_label, item, testID) => {
    const root = mount(item)
    const box = root.findByProps({ testID })
    expect(flatten(box.props.style)).toMatchObject({
      width: STRIP.width,
      height: STRIP.height,
    })
  })
})

describe("photo tile states", () => {
  test("a local file shows the cover image over a calm skeleton until it has loaded", () => {
    const root = mount(attachment())
    const image = types(root, "ExpoImage")[0]
    expect(image.props.source).toEqual({ uri: "resolved:file:///photos/a1.jpg" })
    expect(image.props.contentFit).toBe("cover")
    expect(image.props.recyclingKey).toBe("a1")
    expect(flatten(image.props.style)).toMatchObject({ position: "absolute" })
    expect(types(root, "Skeleton")).toHaveLength(1)
    act(() => image.props.onLoad())
    expect(types(root, "Skeleton")).toHaveLength(0)
    expect(types(root, "ExpoImage")).toHaveLength(1)
  })

  test("the skeleton fills the tile, so the image arriving moves nothing", () => {
    const root = mount(attachment())
    const skeleton = types(root, "Skeleton")[0]
    expect(skeleton.props.width).toBe(STRIP.width)
    expect(skeleton.props.height).toBe(STRIP.height)
    expect(skeleton.props.borderRadius).toBe(0)
    act(() => tree.unmount())
    const single = types(mount(attachment(), SINGLE), "Skeleton")[0]
    expect(single.props.width).toBe(SINGLE.width)
    expect(single.props.height).toBe(SINGLE.height)
  })

  test("the picture fades in, and does not under Reduce Motion", () => {
    expect(types(mount(attachment()), "ExpoImage")[0].props.transition).toBe(PHOTO_FADE_MS)
    act(() => tree.unmount())
    mockReduced.value = true
    expect(types(mount(attachment()), "ExpoImage")[0].props.transition).toBe(0)
  })

  test("a photo still to download shows only the skeleton, no text and no spinner", () => {
    const root = mount(attachment({ file_state: "remote", local_uri: undefined }))
    expect(types(root, "Skeleton")).toHaveLength(1)
    expect(types(root, "ExpoImage")).toHaveLength(0)
    expect(types(root, "Text")).toHaveLength(0)
  })

  test("a file that fails to load turns into the neutral fallback", () => {
    const root = mount(attachment())
    act(() => types(root, "ExpoImage")[0].props.onError())
    expect(types(root, "ExpoImage")).toHaveLength(0)
    expect(types(root, "Skeleton")).toHaveLength(0)
    expect(types(root, "Ionicons")[0].props.name).toBe("image-outline")
    expect(String(types(root, "Text")[0].props.children)).toBe(t.tileUnavailable)
  })

  test("a new file in the same tile starts from the skeleton again", () => {
    const root = mount(attachment())
    act(() => types(root, "ExpoImage")[0].props.onLoad())
    expect(types(root, "Skeleton")).toHaveLength(0)
    act(() =>
      tree.update(
        <PhotoTile attachment={attachment({ local_uri: "file:///photos/b.jpg" })} size={STRIP} />,
      ),
    )
    expect(types(tree.root, "Skeleton")).toHaveLength(1)
  })

  test.each([
    ["missing", t.tileMissing],
    ["unavailable", t.tileUnavailable],
  ] as const)("a %s file shows an outline icon and one short word", (file_state, word) => {
    const root = mount(attachment({ file_state }))
    expect(types(root, "Ionicons")[0].props.name).toBe("image-outline")
    const label = types(root, "Text")[0]
    expect(label.props.children).toBe(word)
    expect(label.props.numberOfLines).toBe(1)
    expect(word.length).toBeLessThanOrEqual(12)
    expect(word).not.toContain("—")
    expect(types(root, "Skeleton")).toHaveLength(0)
  })

  test("the fallback is a neutral face: centred, on the muted surface, in the secondary text colour", () => {
    const styles = createPhotoStyles(defaultTheme)
    expect(styles.photo.backgroundColor).toBe(defaultTheme.colors.panelMuted)
    expect(styles.photoFallback).toMatchObject({ alignItems: "center", justifyContent: "center" })
    expect(styles.photoFallbackText.color).toBe(defaultTheme.colors.textSecondary)
    const root = mount(attachment({ file_state: "missing" }))
    expect(types(root, "Ionicons")[0].props.color).toBe(defaultTheme.colors.textSecondary)
  })
})

describe("photo tile accessibility text", () => {
  test("a picture has no status text, the other states read the catalogue sentence", () => {
    expect(photoTileStatusText(attachment())).toBeUndefined()
    expect(photoTileStatusText(attachment({ file_state: "missing" }))).toBe(preview.missing)
    expect(photoTileStatusText(attachment({ file_state: "unavailable" }))).toBe(preview.unavailable)
    expect(photoTileStatusText(attachment({ file_state: "remote", local_uri: undefined }))).toBe(
      preview.loading,
    )
  })
})
