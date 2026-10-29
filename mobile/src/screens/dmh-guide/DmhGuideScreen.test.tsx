import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { selectionLabel } from "../../app/factor-selections"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { DmhGuideScreen } from "./DmhGuideScreen"

const mockAnnounce = jest.fn()
const mockFocus = jest.fn()
const mockScrollTo = jest.fn()
const mockBackHandlers = new Set<() => boolean>()

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}))

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios" },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
    AccessibilityInfo: {
      announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
      setAccessibilityFocus: (...args: unknown[]) => mockFocus(...args),
    },
    Keyboard: { dismiss: () => undefined },
    findNodeHandle: (node: unknown) => (node ? 7 : null),
    BackHandler: {
      addEventListener: (_event: string, handler: () => boolean) => {
        mockBackHandlers.add(handler)
        return { remove: () => mockBackHandlers.delete(handler) }
      },
    },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

const t = fr.dmhGuide

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
  setReducedMotion(true)
})

beforeEach(() => {
  mockAnnounce.mockClear()
  mockFocus.mockClear()
  mockScrollTo.mockClear()
  mockBackHandlers.clear()
})

const mounted: renderer.ReactTestRenderer[] = []

afterEach(() => {
  for (const tree of mounted.splice(0)) act(() => tree.unmount())
})

function render(initialGroup: "dmh_05" | "dmh_12" | null = null) {
  const onClose = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <DmhGuideScreen
        initialGroup={initialGroup}
        methodVersion={IBP_METHOD_V3_2}
        onClose={onClose}
      />,
      {
        createNodeMock: (element) =>
          element.type === "ScrollView" ? { scrollTo: mockScrollTo } : { node: "title" },
      },
    )
  })
  mounted.push(tree)
  return { tree, onClose }
}

const byTestId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.type === "string")

const press = (tree: renderer.ReactTestRenderer, id: string) => {
  const node = byTestId(tree, id)[0]
  act(() => node.props.onPress())
}

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

const allTexts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => (n.type as unknown) === "Text")
    .map((n) => textOf(n))
    .filter(Boolean)

const hardwareBack = (): boolean => {
  let handled = false
  act(() => {
    handled = [...mockBackHandlers][mockBackHandlers.size - 1]()
  })
  return handled
}

const onCatalogue = (tree: renderer.ReactTestRenderer) => byTestId(tree, "dmh-catalogue").length > 0
const onGroup = (tree: renderer.ReactTestRenderer) => byTestId(tree, "dmh-group-page").length > 0
const onSources = (tree: renderer.ReactTestRenderer) =>
  byTestId(tree, "dmh-sources-page").length > 0

describe("DmhGuideScreen", () => {
  test("without a group it opens the catalogue with its title and the close button", () => {
    const { tree, onClose } = render()
    expect(onCatalogue(tree)).toBe(true)
    expect(allTexts(tree)).toContain(t.sheet.title)
    expect(byTestId(tree, "dmh-back")).toHaveLength(0)
    const close = byTestId(tree, "dmh-close")[0]
    expect(close.props.accessibilityLabel).toBe(t.sheet.close)
    act(() => close.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    const sheet = byTestId(tree, "dmh-guide-screen")[0]
    expect(sheet.props.contentInsetAdjustmentBehavior).toBe("never")
    expect(sheet.props.keyboardShouldPersistTaps).toBe("handled")
    expect(sheet.props.automaticallyAdjustKeyboardInsets).toBe(true)
  })

  test("on Android the sheet keeps its bar below the status bar, on iOS it adds nothing", () => {
    const rn = jest.requireMock("react-native") as { Platform: { OS: string } }
    const paddingOf = () => {
      const { tree } = render()
      const style = byTestId(tree, "dmh-guide-screen")[0].props.style as unknown[]
      return style.flat().find((entry) => entry && (entry as { paddingTop?: number }).paddingTop)
    }
    expect(paddingOf()).toBeUndefined()
    rn.Platform.OS = "android"
    try {
      expect(paddingOf()).toEqual({ paddingTop: 24 })
    } finally {
      rn.Platform.OS = "ios"
    }
  })

  test("the header row is the first child of the scroll view and sticks to the top", () => {
    const { tree } = render()
    const sheet = byTestId(tree, "dmh-guide-screen")[0]
    expect(sheet.props.stickyHeaderIndices).toEqual([0])
    const children = sheet.children.filter(
      (child): child is renderer.ReactTestInstance => typeof child !== "string",
    )
    const header = byTestId(tree, "dmh-guide-header")[0]
    // Index 0 of the scroll view holds the header (a wrapper of the host View), the body is next.
    expect(children[0].findAll((n) => n === header)).toHaveLength(1)
    expect(children[1].findAll((n) => n === header)).toHaveLength(0)
    // The close control and the title are inside the sticky header, never in the scrolled body.
    expect(header.findAll((n) => n.props.testID === "dmh-close").length).toBeGreaterThan(0)
    expect(header.findAll((n) => n.props.testID === "dmh-catalogue").length).toBe(0)
    // Opaque canvas background so scrolled text never shows through, above the content.
    const style = header.props.style as { backgroundColor?: string; zIndex?: number }
    expect(style.backgroundColor).toBe(defaultTheme.semanticColors.backgroundCanvas)
    expect(style.backgroundColor).toEqual(expect.any(String))
    expect(style.zIndex).toBe(1)
  })

  test("the header keeps its sticky place on a group page, with the back control", () => {
    const { tree } = render("dmh_05")
    const header = byTestId(tree, "dmh-guide-header")[0]
    expect(header.findAll((n) => n.props.testID === "dmh-back").length).toBeGreaterThan(0)
    expect(header.findAll((n) => n.props.testID === "dmh-close").length).toBeGreaterThan(0)
    expect(byTestId(tree, "dmh-guide-screen")[0].props.stickyHeaderIndices).toEqual([0])
  })

  test("with a group it opens that page with the back control, and says nothing on opening", () => {
    const { tree } = render("dmh_05")
    expect(onGroup(tree)).toBe(true)
    expect(onCatalogue(tree)).toBe(false)
    expect(byTestId(tree, "dmh-back")[0].props.accessibilityLabel).toBe(t.sheet.backA11y)
    expect(mockAnnounce).not.toHaveBeenCalled()
    expect(mockFocus).not.toHaveBeenCalled()
  })

  test("a row opens its page, announced and focused; back returns to the catalogue with the query", () => {
    const { tree } = render()
    const input = tree.root.findByProps({ testID: "search-field" })
    act(() => input.props.onChangeText("gui"))
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    mockAnnounce.mockClear()
    press(tree, "dmh-catalogue-row-dmh_12")
    expect(onGroup(tree)).toBe(true)
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(
      t.sheet.groupAnnounce({ label: selectionLabel("F", "dmh_12", IBP_METHOD_V3_2) as string }),
    )
    expect(mockFocus).toHaveBeenCalledWith(7)
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: false })

    mockAnnounce.mockClear()
    press(tree, "dmh-back")
    expect(onCatalogue(tree)).toBe(true)
    expect(mockAnnounce).toHaveBeenCalledWith(t.sheet.catalogueAnnounce)
    expect(tree.root.findByProps({ testID: "search-field" }).props.value).toBe("gui")
  })

  test("the sources page opens from the catalogue and from a group, and back returns to where it came from", () => {
    const { tree } = render()
    press(tree, "dmh-sources-link")
    expect(onSources(tree)).toBe(true)
    expect(mockAnnounce).toHaveBeenLastCalledWith(t.sources.title)
    press(tree, "dmh-back")
    expect(onCatalogue(tree)).toBe(true)

    press(tree, "dmh-catalogue-row-dmh_03")
    press(tree, "dmh-sources-link")
    expect(onSources(tree)).toBe(true)
    press(tree, "dmh-back")
    expect(onGroup(tree)).toBe(true)
    press(tree, "dmh-back")
    expect(onCatalogue(tree)).toBe(true)
  })

  test("a second press of the sources link on the sources page changes nothing", () => {
    const { tree } = render("dmh_05")
    press(tree, "dmh-sources-link")
    expect(onSources(tree)).toBe(true)
    expect(byTestId(tree, "dmh-sources-link")).toHaveLength(0)
  })

  test("a group opened directly goes back to the catalogue and sources from it return to the group", () => {
    const { tree } = render("dmh_05")
    press(tree, "dmh-sources-link")
    press(tree, "dmh-back")
    expect(onGroup(tree)).toBe(true)
    press(tree, "dmh-back")
    expect(onCatalogue(tree)).toBe(true)
  })

  test("close works from the group page and from the sources page", () => {
    const { tree, onClose } = render("dmh_12")
    press(tree, "dmh-close")
    press(tree, "dmh-sources-link")
    press(tree, "dmh-close")
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test("the hardware back goes one view back inside the sheet and lets the sheet close elsewhere", () => {
    const { tree } = render()
    expect(hardwareBack()).toBe(false)

    press(tree, "dmh-catalogue-row-dmh_05")
    expect(hardwareBack()).toBe(true)
    expect(onCatalogue(tree)).toBe(true)

    press(tree, "dmh-sources-link")
    expect(hardwareBack()).toBe(true)
    expect(onCatalogue(tree)).toBe(true)
    expect(hardwareBack()).toBe(false)
  })

  test("the hardware back closes a group page opened directly, but steps back from its sources page", () => {
    const { tree } = render("dmh_12")
    expect(hardwareBack()).toBe(false)
    expect(onGroup(tree)).toBe(true)
    press(tree, "dmh-sources-link")
    expect(hardwareBack()).toBe(true)
    expect(onGroup(tree)).toBe(true)
    expect(hardwareBack()).toBe(false)
  })

  test("the subscription is removed on unmount", () => {
    const { tree } = render()
    expect(mockBackHandlers.size).toBe(1)
    act(() => tree.unmount())
    expect(mockBackHandlers.size).toBe(0)
  })

  test("typing in the search does not move focus or scroll", () => {
    const { tree } = render()
    const input = tree.root.findByProps({ testID: "search-field" })
    act(() => input.props.onChangeText("pic"))
    expect(mockFocus).not.toHaveBeenCalled()
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("the bar title is centred on the catalogue only; a view with a back has the back, not the title", () => {
    const { tree } = render()
    const header = byTestId(tree, "dmh-guide-header")[0]
    expect(header.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))).toEqual([
      t.sheet.title,
    ])
    press(tree, "dmh-catalogue-row-dmh_05")
    const after = byTestId(tree, "dmh-guide-header")[0]
    expect(after.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))).toEqual([
      t.sheet.back,
    ])
  })

  test("the bottom hairline of the bar shows only once the content has scrolled", () => {
    const { tree } = render()
    const scrollTo = (y: number) =>
      act(() =>
        byTestId(tree, "dmh-guide-screen")[0].props.onScroll({
          nativeEvent: { contentOffset: { y } },
        }),
      )
    expect(byTestId(tree, "dmh-guide-header-hairline")).toHaveLength(0)
    scrollTo(12)
    expect(byTestId(tree, "dmh-guide-header-hairline")).toHaveLength(1)
    scrollTo(-8)
    expect(byTestId(tree, "dmh-guide-header-hairline")).toHaveLength(0)
    scrollTo(0)
    expect(byTestId(tree, "dmh-guide-header-hairline")).toHaveLength(0)
    expect(byTestId(tree, "dmh-guide-screen")[0].props.scrollEventThrottle).toBe(16)
  })

  test("a view change pushes: no entrance at opening, 24 pt from the trailing edge forward, from the leading edge back", () => {
    const { tree } = render()
    const entering = () =>
      tree.root.find((n) => typeof n.type === "string" && "entering" in n.props).props.entering as
        | { definition: { 0: { transform: { translateX: number }[] } } }
        | undefined
    expect(entering()).toBeUndefined()
    press(tree, "dmh-catalogue-row-dmh_05")
    expect(entering()?.definition[0].transform[0].translateX).toBe(24)
    press(tree, "dmh-back")
    expect(entering()?.definition[0].transform[0].translateX).toBe(-24)
    press(tree, "dmh-sources-link")
    expect(entering()?.definition[0].transform[0].translateX).toBe(24)
  })
})
