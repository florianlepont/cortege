import React from "react"
import renderer, { act } from "react-test-renderer"
import { usePagerChromeStyle, usePagerKeyboard } from "./usePagerKeyboard"

type Listener = () => void

// The listeners the hook registered, by event name, and the platform it runs on.
const mockListeners: Record<string, Listener | undefined> = {}
const mockRemoved: string[] = []
let mockOs: "ios" | "android" = "ios"

jest.mock("react-native", () => ({
  Keyboard: {
    addListener: (event: string, listener: () => void) => {
      mockListeners[event] = listener
      return { remove: () => mockRemoved.push(event) }
    },
  },
  Platform: {
    get OS() {
      return mockOs
    },
  },
  // The Reanimated mock re-exports host components from react-native.
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  for (const key of Object.keys(mockListeners)) delete mockListeners[key]
  mockRemoved.length = 0
  mockOs = "ios"
})

function mount() {
  let visible = false
  function Probe() {
    visible = usePagerKeyboard()
    return null
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(React.createElement(Probe))
  })
  return { tree, visible: () => visible }
}

describe("usePagerKeyboard (UI-SPEC 2.4)", () => {
  test("is false at first", () => {
    expect(mount().visible()).toBe(false)
  })

  test("iOS: true after keyboardWillShow, false after keyboardWillHide", () => {
    const { visible } = mount()
    expect(Object.keys(mockListeners).sort()).toEqual(["keyboardWillHide", "keyboardWillShow"])
    act(() => mockListeners.keyboardWillShow?.())
    expect(visible()).toBe(true)
    act(() => mockListeners.keyboardWillHide?.())
    expect(visible()).toBe(false)
  })

  test("Android: true after keyboardDidShow, false after keyboardDidHide", () => {
    mockOs = "android"
    const { visible } = mount()
    expect(Object.keys(mockListeners).sort()).toEqual(["keyboardDidHide", "keyboardDidShow"])
    act(() => mockListeners.keyboardDidShow?.())
    expect(visible()).toBe(true)
    act(() => mockListeners.keyboardDidHide?.())
    expect(visible()).toBe(false)
  })

  test("removes both listeners on unmount", () => {
    const { tree } = mount()
    act(() => tree.unmount())
    expect(mockRemoved.sort()).toEqual(["keyboardWillHide", "keyboardWillShow"])
  })
})

describe("usePagerChromeStyle", () => {
  const opacityFor = (hidden: boolean) => {
    let style: { opacity: number } | undefined
    function Probe() {
      style = usePagerChromeStyle(hidden) as unknown as { opacity: number }
      return null
    }
    act(() => {
      renderer.create(React.createElement(Probe))
    })
    return style?.opacity
  }

  test("is opaque while the keyboard is down and 0 while it is up", () => {
    expect(opacityFor(false)).toBe(1)
    expect(opacityFor(true)).toBe(0)
  })
})
