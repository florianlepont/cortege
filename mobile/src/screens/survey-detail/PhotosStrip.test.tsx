import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalAttachment, LocalSurvey } from "../../storage"
import { PhotosStrip } from "./PhotosStrip"
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
    StyleSheet: { create: <T,>(styles: T) => styles },
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
jest.mock("./AttachmentPhotoPreview", () => ({ AttachmentPhotoPreview: "AttachmentPhotoPreview" }))

const t = fr.surveyDetail.photos

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(photoCount: number): ReactTestRenderer {
  const attachments = Array.from({ length: photoCount }, (_, index) => ({
    id: `a${index}`,
    mime_type: "image/jpeg",
    file_state: "local",
  })) as unknown as LocalAttachment[]
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <PhotosStrip
        survey={{ id: "s1" } as LocalSurvey}
        attachments={attachments}
        canEdit
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

  test("the add button keeps its 44 pt hit area next to the title", () => {
    const styles = createSummaryScreenStyles(defaultTheme)
    expect(styles.addButton.minHeight).toBeGreaterThanOrEqual(44)
  })
})
