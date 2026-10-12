import React from "react"
import renderer, { act } from "react-test-renderer"
import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import { KEYBOARD_CLEARANCE, useScrollIntoViewOnKeyboard } from "./useScrollIntoViewOnKeyboard"

type KeyboardListener = (event: { endCoordinates: { height: number; screenY: number } }) => void

// The listeners the hook registered, by event name, and the platform it runs on.
const mockListeners: Record<string, KeyboardListener | undefined> = {}
const mockRemoved: string[] = []
let mockOs: "ios" | "android" = "ios"

jest.mock("react-native", () => ({
  Keyboard: {
    addListener: (event: string, listener: KeyboardListener) => {
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
const mockScrollTo = jest.fn()

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  // One frame is one synchronous call here.
  Object.assign(globalThis, {
    requestAnimationFrame: (callback: (time: number) => void) => {
      callback(0)
      return 1
    },
    cancelAnimationFrame: () => undefined,
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  for (const key of Object.keys(mockListeners)) delete mockListeners[key]
  mockRemoved.length = 0
  mockScrollTo.mockClear()
  mockOs = "ios"
})

afterEach(() => {
  setReducedMotion(false)
})

type Hook = ReturnType<typeof useScrollIntoViewOnKeyboard>

/** Mounts the hook; the card is `height` high and its top is `cardY` points from the screen top. */
function mount({ cardY = 600, height = 150 }: { cardY?: number; height?: number } = {}) {
  let hook!: Hook
  const scrollRef = { current: { scrollTo: mockScrollTo } }
  function Probe() {
    hook = useScrollIntoViewOnKeyboard(scrollRef as never)
    return null
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(React.createElement(Probe))
  })
  ;(hook.targetRef as { current: unknown }).current = {
    measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, cardY, 320, height),
  }
  const show = (height = 300, screenY = 500) =>
    act(() =>
      mockListeners[mockOs === "ios" ? "keyboardWillShow" : "keyboardDidShow"]?.({
        endCoordinates: { height, screenY },
      }),
    )
  const hide = () =>
    act(() =>
      mockListeners[mockOs === "ios" ? "keyboardWillHide" : "keyboardDidHide"]?.({
        endCoordinates: { height: 0, screenY: 800 },
      }),
    )
  const scrolled = (y: number) =>
    act(() => hook.onScroll({ nativeEvent: { contentOffset: { y } } } as never))
  return { tree, hook: () => hook, show, hide, scrolled }
}

describe("useScrollIntoViewOnKeyboard", () => {
  test("listens to the will events on iOS and the did events on Android, and lets go on unmount", () => {
    const ios = mount()
    expect(Object.keys(mockListeners).sort()).toEqual(["keyboardWillHide", "keyboardWillShow"])
    act(() => ios.tree.unmount())
    expect(mockRemoved.sort()).toEqual(["keyboardWillHide", "keyboardWillShow"])

    for (const key of Object.keys(mockListeners)) delete mockListeners[key]
    mockOs = "android"
    mount()
    expect(Object.keys(mockListeners).sort()).toEqual(["keyboardDidHide", "keyboardDidShow"])
  })

  test("the content gets the keyboard's height as bottom room while it is up, and loses it when it hides", () => {
    const { hook, show, hide } = mount()
    expect(hook().keyboardInset).toBe(0)
    show(336)
    expect(hook().keyboardInset).toBe(336)
    hide()
    expect(hook().keyboardInset).toBe(0)
  })

  test("a focus waits for the keyboard: no scroll before it is shown, one scroll by what hides the card", () => {
    // The card ends at 750, the keyboard starts at 500: 250 points hidden, plus the clearance.
    const { hook, show, scrolled } = mount({ cardY: 600, height: 150 })
    scrolled(40)
    act(() => hook().onFieldFocus())
    expect(mockScrollTo).not.toHaveBeenCalled()

    show(300, 500)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledWith({
      y: 40 + 250 + KEYBOARD_CLEARANCE,
      animated: true,
    })
  })

  test("the offset may be negative (native large title): the scroll is a delta from it", () => {
    const { hook, show, scrolled } = mount({ cardY: 520, height: 100 })
    scrolled(-96)
    act(() => hook().onFieldFocus())
    show(300, 500)
    expect(mockScrollTo).toHaveBeenCalledWith({
      y: -96 + (620 - 500) + KEYBOARD_CLEARANCE,
      animated: true,
    })
  })

  test("without Reduce Motion the scroll is animated, with it the page jumps", () => {
    setReducedMotion(true)
    const { hook, show } = mount()
    act(() => hook().onFieldFocus())
    show()
    expect(mockScrollTo.mock.calls[0][0].animated).toBe(false)
  })

  test("a card already clear of the keyboard is left where it is", () => {
    const { hook, show } = mount({ cardY: 100, height: 150 })
    act(() => hook().onFieldFocus())
    show(300, 500)
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("the keyboard showing with no field focused scrolls nothing", () => {
    const { show } = mount()
    show()
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("a focus while the keyboard is already up scrolls at once, and only once per focus", () => {
    const { hook, show } = mount({ cardY: 600, height: 150 })
    show(300, 500)
    expect(mockScrollTo).not.toHaveBeenCalled()
    act(() => hook().onFieldFocus())
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
    // The same keyboard answering again does not replay an old focus.
    show(300, 500)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
  })

  test("a keyboard that hides before it showed cancels the pending focus", () => {
    const { hook, show, hide } = mount()
    act(() => hook().onFieldFocus())
    hide()
    show()
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("Android scrolls once the keyboard has appeared (keyboardDidShow)", () => {
    mockOs = "android"
    const { hook, show } = mount({ cardY: 600, height: 150 })
    act(() => hook().onFieldFocus())
    show(280, 520)
    expect(mockScrollTo).toHaveBeenCalledWith({
      y: 0 + (750 - 520) + KEYBOARD_CLEARANCE,
      animated: true,
    })
  })

  test("nothing is measured when the card is not mounted", () => {
    const { hook, show } = mount()
    ;(hook().targetRef as { current: unknown }).current = null
    act(() => hook().onFieldFocus())
    show()
    expect(mockScrollTo).not.toHaveBeenCalled()
  })
})
