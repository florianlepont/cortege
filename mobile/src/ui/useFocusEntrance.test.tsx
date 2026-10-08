import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import { brandMotion } from "../app/brand-tokens"
import { ScreenCoverContext } from "./screen-cover-context"
import { EntranceView } from "./EntranceView"
import { ENTRANCE_REWIND_DELAY_MS, useFocusEntrance } from "./useFocusEntrance"

// The real navigation package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})
jest.mock("react-native", () => ({ View: "View" }))

// A recording stand-in for Reanimated: timings are described as data instead of being run, so the
// test reads what the hook asked for (delay, duration, target) and replays it by hand.
type Timing = { kind: "timing"; to: number; config: Record<string, unknown> }
type Delayed = { kind: "delay"; delayMs: number; inner: Timing }
const mockState: { reduced: boolean; cancelled: number; shared: { value: unknown } | undefined } = {
  reduced: false,
  cancelled: 0,
  shared: undefined,
}
jest.mock("react-native-reanimated", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const View = "View"
  return {
    __esModule: true,
    default: { View },
    ReduceMotion: { System: "system" },
    Easing: { out: (fn: unknown) => fn, cubic: "cubic" },
    useReducedMotion: () => mockState.reduced,
    useSharedValue: <T,>(initial: T) => {
      const shared = ReactRef.useRef({ value: initial as unknown }).current
      mockState.shared = shared
      return shared
    },
    useAnimatedStyle: <T,>(factory: () => T) => factory(),
    cancelAnimation: () => {
      mockState.cancelled += 1
    },
    withTiming: (to: number, config: Record<string, unknown>) => ({ kind: "timing", to, config }),
    withDelay: (delayMs: number, inner: unknown) => ({ kind: "delay", delayMs, inner }),
  }
})

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

afterEach(() => {
  mockState.reduced = false
  mockState.cancelled = 0
})

type Listener = () => void

function createFakeNavigation(initiallyFocused = true) {
  const listeners: Record<string, Listener[]> = { focus: [], blur: [] }
  let focused = initiallyFocused
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, listener: Listener) => {
      listeners[event].push(listener)
      return () => undefined
    },
  }
  const emit = (event: "focus" | "blur") => {
    focused = event === "focus"
    act(() => listeners[event].forEach((listener) => listener()))
  }
  return { navigation, emit }
}

// Mounts a section and exposes its shared value through the style the hook returns.
function mountSection(options: {
  index?: number
  navigation?: ReturnType<typeof createFakeNavigation>["navigation"]
  covered?: boolean
}) {
  const probe: { style?: { opacity: unknown; transform: unknown } } = {}
  function Section({ index }: { index: number }) {
    probe.style = useFocusEntrance(index) as never
    return null
  }
  const element = (index: number, covered: boolean) => (
    <ScreenCoverContext.Provider value={covered}>
      {options.navigation ? (
        <NavigationContext.Provider value={options.navigation as never}>
          <Section index={index} />
        </NavigationContext.Provider>
      ) : (
        <Section index={index} />
      )}
    </ScreenCoverContext.Provider>
  )
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(options.index ?? 0, options.covered ?? false))
  })
  return {
    probe,
    update: (index: number, covered = false) => act(() => tree!.update(element(index, covered))),
    unmount: () => act(() => tree!.unmount()),
  }
}

// What the hook last wrote to its shared value: the pending animation, as data (the mock does not
// run it).
function lastWrite(_probe?: unknown): unknown {
  return mockState.shared?.value
}

describe("useFocusEntrance (12.2-10)", () => {
  test("a visible screen slides its section up: staggered delay, 360 ms, 20 pt of travel", () => {
    const section = mountSection({ index: 2 })
    const written = lastWrite(section.probe) as Delayed
    expect(written.kind).toBe("delay")
    expect(written.delayMs).toBe(2 * brandMotion.staggerMs)
    expect(written.inner.to).toBe(1)
    expect(written.inner.config).toMatchObject({
      duration: brandMotion.durations.slow,
      reduceMotion: "system",
    })
    // Travel: starts the 20 pt below, which is what the owner can see.
    expect(brandMotion.sectionEntranceTravel).toBe(20)
    expect(brandMotion.sectionEntranceTravel).toBeGreaterThanOrEqual(16)
    expect(brandMotion.sectionEntranceTravel).toBeLessThanOrEqual(24)
    section.unmount()
  })

  test("the stagger is capped like the lists", () => {
    const section = mountSection({ index: 40 })
    const written = lastWrite(section.probe) as Delayed
    expect(written.delayMs).toBe(brandMotion.staggerMax * brandMotion.staggerMs)
    section.unmount()
  })

  test("under an overlay nothing plays; it plays once the overlay is gone", () => {
    const section = mountSection({ covered: true })
    // Covered: hidden, with a rewind queued (a no-op, it is already hidden).
    const hidden = lastWrite(section.probe) as Delayed
    expect(hidden.delayMs).toBe(ENTRANCE_REWIND_DELAY_MS)
    expect(hidden.inner.to).toBe(0)
    section.update(0, false)
    const shown = lastWrite(section.probe) as Delayed
    expect(shown.inner.to).toBe(1)
    section.unmount()
  })

  test("it replays each time the screen regains focus, and rewinds after a blur", () => {
    const { navigation, emit } = createFakeNavigation(true)
    const section = mountSection({ navigation })
    expect((lastWrite(section.probe) as Delayed).inner.to).toBe(1)

    emit("blur")
    section.update(0)
    const rewind = lastWrite(section.probe) as Delayed
    // The rewind waits for a push transition to finish, so the screen does not blank while sliding.
    expect(rewind.delayMs).toBe(ENTRANCE_REWIND_DELAY_MS)
    expect(rewind.inner.to).toBe(0)
    expect(rewind.inner.config.duration).toBe(0)

    emit("focus")
    section.update(0)
    const replay = lastWrite(section.probe) as Delayed
    expect(replay.inner.to).toBe(1)
    expect(replay.inner.config.duration).toBe(brandMotion.durations.slow)
    section.unmount()
  })

  test("a section whose index shifts does not replay", () => {
    const section = mountSection({ index: 0 })
    const first = lastWrite(section.probe)
    section.update(1)
    expect(lastWrite(section.probe)).toBe(first)
    section.unmount()
  })

  test("under Reduce Motion the section is shown at once, with no animation", () => {
    mockState.reduced = true
    const section = mountSection({ index: 3 })
    expect(section.probe.style).toEqual({
      opacity: 1,
      transform: [{ translateY: 0 }],
    })
    expect(mockState.cancelled).toBeGreaterThan(0)
    section.unmount()
  })

  test("before it plays the section is hidden 20 pt below its place", () => {
    const section = mountSection({})
    // The style read on the first render, before the effect starts the animation.
    expect(section.probe.style).toEqual({
      opacity: 0,
      transform: [{ translateY: brandMotion.sectionEntranceTravel }],
    })
    section.unmount()
  })
})

describe("EntranceView", () => {
  test("renders its children in an animated view that carries the caller style and the entrance", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <EntranceView index={1} style={{ marginTop: 8 }}>
          <></>
        </EntranceView>,
      )
    })
    const view = tree!.root.findByType("View" as never)
    const styles = [view.props.style].flat()
    expect(styles[0]).toEqual({ marginTop: 8 })
    expect(styles[1]).toHaveProperty("opacity")
    expect(styles[1]).toHaveProperty("transform")
    act(() => tree!.unmount())
  })
})
