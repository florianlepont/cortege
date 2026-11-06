import React from "react"
import renderer, { act } from "react-test-renderer"
import { AccessibilityInfo } from "react-native"
import { fr } from "../../i18n"
import { feedback } from "../../ui/feedback"
import { MAX_SCORE_TOAST_MS, MaxScoreToast, useMaxScoreToast } from "./MaxScoreToast"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    StyleSheet: { create: <T,>(styles: T) => styles },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({
  feedback: { selection: jest.fn(), notify: { success: jest.fn() } },
}))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

beforeEach(() => {
  jest.useFakeTimers()
  jest.mocked(feedback.notify.success).mockClear()
  jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear()
})

afterEach(() => {
  jest.useRealTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
})

type Props = { active: boolean; atTop: boolean }

function mountHook(initial: Props) {
  const out: { current: ReturnType<typeof useMaxScoreToast> | null } = { current: null }
  function Harness(props: Props) {
    out.current = useMaxScoreToast(props)
    return null
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Harness {...initial} />)
  })
  return {
    result: out as { current: ReturnType<typeof useMaxScoreToast> },
    set: (next: Props) =>
      act(() => {
        tree.update(<Harness {...next} />)
      }),
    unmount: () => act(() => tree.unmount()),
  }
}

describe("useMaxScoreToast, the crossing logic", () => {
  test("not on mount, even when the score is already at the top", () => {
    const h = mountHook({ active: true, atTop: true })
    expect(h.result.current.visible).toBe(false)
    expect(feedback.notify.success).not.toHaveBeenCalled()
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  test("from below to the top: shows, with a success haptic and an announcement", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    expect(h.result.current.visible).toBe(true)
    expect(feedback.notify.success).toHaveBeenCalledTimes(1)
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      fr.factorPager.maxScoreToast,
    )
  })

  test("counting on above the top does not show it again", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    h.set({ active: true, atTop: true })
    h.set({ active: true, atTop: true })
    expect(feedback.notify.success).toHaveBeenCalledTimes(1)
  })

  test("it goes after 4 seconds, not before", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    act(() => {
      jest.advanceTimersByTime(MAX_SCORE_TOAST_MS - 1)
    })
    expect(h.result.current.visible).toBe(true)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(h.result.current.visible).toBe(false)
    expect(jest.getTimerCount()).toBe(0)
  })

  test("dismiss closes it at once and cancels the timer", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    act(() => h.result.current.dismiss())
    expect(h.result.current.visible).toBe(false)
    expect(jest.getTimerCount()).toBe(0)
  })

  test("a drop under the top closes it; the next crossing shows it again", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    h.set({ active: true, atTop: false })
    expect(h.result.current.visible).toBe(false)
    h.set({ active: true, atTop: true })
    expect(h.result.current.visible).toBe(true)
    expect(feedback.notify.success).toHaveBeenCalledTimes(2)
  })

  test("a second crossing restarts the 4 seconds", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    h.set({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(h.result.current.visible).toBe(true)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(h.result.current.visible).toBe(false)
  })

  test("arriving on the factor already at the top, or leaving it, shows nothing and closes it", () => {
    const h = mountHook({ active: false, atTop: true })
    h.set({ active: true, atTop: true })
    expect(h.result.current.visible).toBe(false)
    const crossing = mountHook({ active: true, atTop: false })
    crossing.set({ active: true, atTop: true })
    crossing.set({ active: false, atTop: true })
    expect(crossing.result.current.visible).toBe(false)
  })

  test("unmounting clears the timer", () => {
    const h = mountHook({ active: true, atTop: false })
    h.set({ active: true, atTop: true })
    h.unmount()
    expect(jest.getTimerCount()).toBe(0)
  })
})

describe("MaxScoreToast", () => {
  const render = (visible: boolean, onDismiss = jest.fn()) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<MaxScoreToast visible={visible} onDismiss={onDismiss} bottom={120} />)
    })
    const toast = () => tree.root.findAll((n) => n.props.testID === "dmh-max-toast")[0]
    return { tree, toast, onDismiss }
  }

  test("nothing when hidden", () => {
    expect(render(false).toast()).toBeUndefined()
  })

  test("a floating pill with the sentence, no 'classe', a polite live region, closed by a tap", () => {
    const { toast, onDismiss, tree } = render(true)
    expect(toast().props.accessibilityLabel).toBe(
      "Score maximal atteint : inutile de compter davantage.",
    )
    expect(toast().props.accessibilityLabel).not.toMatch(/classe|—/i)
    expect(toast().props.accessibilityLiveRegion).toBe("polite")
    expect(toast().props.accessibilityHint).toBe(fr.factorPager.maxScoreToastHint)
    act(() => toast().props.onPress())
    expect(onDismiss).toHaveBeenCalledTimes(1)
    const host = tree.root.findAll((n) => n.props.pointerEvents === "box-none")[0]
    const style = (Array.isArray(host.props.style) ? host.props.style : [host.props.style]).reduce(
      (acc: Record<string, unknown>, part: Record<string, unknown>) => ({ ...acc, ...part }),
      {},
    )
    expect(style.position).toBe("absolute")
    expect(style.bottom).toBe(120)
  })
})
