import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { useSurveyDetailHeader } from "./useSurveyDetailHeader"

const mockPlatform = { OS: "ios" as "ios" | "android" }

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Pressable: mockComponent("Pressable"),
    Platform: {
      get OS() {
        return mockPlatform.OS
      },
    },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

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

beforeEach(() => {
  mockPlatform.OS = "ios"
})

type Item = {
  type: string
  label: string
  onPress?: () => void
  menu?: { items: { type: string; label: string; destructive?: boolean; onPress: () => void }[] }
}
type Options = Record<string, unknown> & { unstable_headerRightItems?: () => Item[] }

function run(params: Partial<Parameters<typeof useSurveyDetailHeader>[0]> = {}) {
  const setOptions = jest.fn()
  const callbacks = {
    onShare: jest.fn(),
    onDelete: jest.fn(),
    onOpenMenu: jest.fn(),
  }
  function Probe() {
    useSurveyDetailHeader({
      navigation: { setOptions },
      siteName: "Lisière de la Marne",
      ...callbacks,
      ...params,
    })
    return null
  }
  act(() => {
    renderer.create(<Probe />)
  })
  return { options: setOptions.mock.calls[0][0] as Options, callbacks }
}

describe("useSurveyDetailHeader under the native large title (12.2-17)", () => {
  test("the header's title is the survey's name, so it stays on screen as the page scrolls", () => {
    const { options } = run({ largeTitle: true, onRename: jest.fn() })
    expect(options.title).toBe("Lisière de la Marne")
  })

  test("the menu offers Renommer first, then Supprimer; Partager stays its own button", () => {
    const onRename = jest.fn()
    const { options, callbacks } = run({ largeTitle: true, onRename })
    const [share, menu] = options.unstable_headerRightItems!()
    expect(share.label).toBe(fr.surveyDetail.menu.share)
    const labels = menu.menu!.items.map((item) => item.label)
    expect(labels).toEqual([fr.surveyDetail.menu.rename, fr.surveyDetail.menu.delete])
    menu.menu!.items[0].onPress()
    expect(onRename).toHaveBeenCalledTimes(1)
    menu.menu!.items[1].onPress()
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1)
  })

  test("a finished survey (no rename offered) keeps the menu to Supprimer", () => {
    const { options } = run({ largeTitle: true })
    expect(options.title).toBe("Lisière de la Marne")
    const [, menu] = options.unstable_headerRightItems!()
    expect(menu.menu!.items.map((item) => item.label)).toEqual([fr.surveyDetail.menu.delete])
  })
})

describe("useSurveyDetailHeader without the large title", () => {
  test("iOS (Expo Go): no title set, the page draws the name; the menu holds Supprimer only", () => {
    const { options } = run()
    expect(options).not.toHaveProperty("title")
    const [, menu] = options.unstable_headerRightItems!()
    expect(menu.menu!.items.map((item) => item.label)).toEqual([fr.surveyDetail.menu.delete])
  })

  test("Android: the two 44 pt icon buttons, no title", () => {
    mockPlatform.OS = "android"
    const { options, callbacks } = run()
    expect(options).not.toHaveProperty("title")
    const header = (options.headerRight as () => React.ReactElement)()
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(header)
    })
    const buttons = tree!.root.findAll((n) => (n.type as unknown) === "Pressable")
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.props.style).toEqual(expect.objectContaining({ width: 44, height: 44 }))
    }
    buttons[0].props.onPress()
    buttons[1].props.onPress()
    expect(callbacks.onShare).toHaveBeenCalledTimes(1)
    expect(callbacks.onOpenMenu).toHaveBeenCalledTimes(1)
  })
})
