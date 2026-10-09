import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { androidHeaderTitleStyle } from "../app/header-title-style"
import { FrameLargeTitleContext } from "./frame-large-title"
import { TITLE_COLLAPSE_OFFSET, TitledScrollView } from "./TitledScrollView"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ScrollView: ReactRef.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode }, _ref: unknown) =>
        ReactRef.createElement("ScrollView", props, children),
    ),
  }
})
jest.mock("@react-navigation/native", () => ({
  NavigationContext: (require("react") as typeof import("react")).createContext(undefined),
}))

const { NavigationContext } = jest.requireMock("@react-navigation/native") as {
  NavigationContext: React.Context<unknown>
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalConsoleError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

function mount({ nativeTitle = false, withNavigation = true } = {}) {
  const setOptions = jest.fn()
  const onScroll = jest.fn()
  let tree!: renderer.ReactTestRenderer
  const scroll = (
    <TitledScrollView collapsingTitle="Check_Barre" onScroll={onScroll}>
      {null}
    </TitledScrollView>
  )
  const withFrame = (
    <FrameLargeTitleContext.Provider value={nativeTitle}>{scroll}</FrameLargeTitleContext.Provider>
  )
  act(() => {
    tree = renderer.create(
      withNavigation ? (
        <NavigationContext.Provider value={{ setOptions }}>{withFrame}</NavigationContext.Provider>
      ) : (
        withFrame
      ),
    )
  })
  const scrollTo = (y: number): void => {
    act(() => {
      tree.root.findByType("ScrollView" as never).props.onScroll({
        nativeEvent: { contentOffset: { x: 0, y } },
      })
    })
  }
  return { setOptions, onScroll, scrollTo }
}

describe("TitledScrollView", () => {
  test("puts the page title in the bar once the page has scrolled past it, and takes it back", () => {
    const { setOptions, scrollTo } = mount()
    scrollTo(TITLE_COLLAPSE_OFFSET)
    expect(setOptions).not.toHaveBeenCalled()

    scrollTo(TITLE_COLLAPSE_OFFSET + 1)
    expect(setOptions).toHaveBeenLastCalledWith({
      headerTitle: "Check_Barre",
      headerTitleStyle: androidHeaderTitleStyle(defaultTheme),
    })

    scrollTo(0)
    expect(setOptions).toHaveBeenLastCalledWith({
      headerTitle: "",
      headerTitleStyle: androidHeaderTitleStyle(defaultTheme),
    })
    expect(setOptions).toHaveBeenCalledTimes(2)
  })

  test("sets the options once per crossing, not on every scroll event", () => {
    const { setOptions, scrollTo } = mount()
    for (const y of [60, 120, 400, 900]) scrollTo(y)
    expect(setOptions).toHaveBeenCalledTimes(1)
  })

  test("still calls the page's own onScroll", () => {
    const { onScroll, scrollTo } = mount()
    scrollTo(10)
    expect(onScroll).toHaveBeenCalledTimes(1)
  })

  test("leaves the bar to the system under the native iOS large title", () => {
    const { setOptions, scrollTo } = mount({ nativeTitle: true })
    scrollTo(500)
    expect(setOptions).not.toHaveBeenCalled()
  })

  test("is a plain scroll view outside a navigator", () => {
    const { scrollTo } = mount({ withNavigation: false })
    expect(() => scrollTo(500)).not.toThrow()
  })
})
