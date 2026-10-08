import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

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

// The real navigation package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Image: mockComponent("Image"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    FlatList: mockComponent("FlatList"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))

import { NavigationContext } from "@react-navigation/native"
import { createFakeNavigation } from "../../../test/fake-navigation"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { brandMotion } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { ScreenCoverContext } from "../../ui/screen-cover-context"
import { ENTRANCE_REWIND_DELAY_MS } from "../../ui/useFocusEntrance"
import { ListEmptyState } from "./ListEmptyState"

const withTimingSpy = jest.spyOn(reanimated, "withTiming")
const withSpringSpy = jest.spyOn(reanimated, "withSpring")
const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")

let tree: ReactTestRenderer

function mount() {
  act(() => {
    tree = renderer.create(<ListEmptyState />)
  })
  const illustration = tree.root.findAll(
    (node) => (node.type as unknown) === "View" && Boolean(node.props.style?.transform),
  )[0]
  return { illustration }
}

afterEach(() => {
  act(() => tree.unmount())
  reanimated.setReducedMotion(false)
  withTimingSpy.mockClear()
  withSpringSpy.mockClear()
  withRepeatSpy.mockClear()
})

describe("ListEmptyState (12.2-11)", () => {
  test("keeps its copy inside a glass card", () => {
    mount()
    const card = tree.root.findByType("AppCard" as never)
    expect(card.props.variant).toBe("glass")
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => node.props.children)
    expect(texts).toEqual([fr.surveyList.empty.none.title, fr.surveyList.empty.none.body])
  })

  test("the illustration starts transparent and small, then fades and springs in once", () => {
    const { illustration } = mount()
    expect(illustration.props.style).toEqual({ opacity: 0, transform: [{ scale: 0.9 }] })
    expect(withTimingSpy).toHaveBeenCalledTimes(1)
    expect(withTimingSpy).toHaveBeenCalledWith(1, {
      duration: brandMotion.durations.base,
      reduceMotion: reanimated.ReduceMotion.System,
    })
    expect(withSpringSpy).toHaveBeenCalledTimes(1)
    expect(withSpringSpy).toHaveBeenCalledWith(1, {
      ...brandMotion.springs.snappy,
      reduceMotion: reanimated.ReduceMotion.System,
    })
  })

  test("under an overlay nothing plays; the animation starts when the screen is visible", () => {
    const element = (covered: boolean) => (
      <ScreenCoverContext.Provider value={covered}>
        <ListEmptyState />
      </ScreenCoverContext.Provider>
    )
    act(() => {
      tree = renderer.create(element(true))
    })
    // Hidden: only the zero-duration rewind (already hidden), no fade and no spring.
    expect(withSpringSpy).not.toHaveBeenCalled()
    const calls = withTimingSpy.mock.calls as unknown as [number, { duration: number }][]
    expect(calls.every(([, config]) => config.duration === 0)).toBe(true)
    withTimingSpy.mockClear()
    act(() => tree.update(element(false)))
    expect(withSpringSpy).toHaveBeenCalledTimes(1)
    expect(withTimingSpy).toHaveBeenCalledWith(1, {
      duration: brandMotion.durations.base,
      reduceMotion: reanimated.ReduceMotion.System,
    })
  })

  test("it replays on each return to the screen and rewinds after a blur", () => {
    const { navigation, emit } = createFakeNavigation(true)
    act(() => {
      tree = renderer.create(
        <NavigationContext.Provider value={navigation as never}>
          <ListEmptyState />
        </NavigationContext.Provider>,
      )
    })
    expect(withSpringSpy).toHaveBeenCalledTimes(1)
    const delaySpy = jest.spyOn(reanimated, "withDelay")
    emit("blur")
    // Two rewinds (opacity and scale), each delayed so a page sliding away is not blanked.
    expect(delaySpy.mock.calls.map(([delay]) => delay)).toEqual([
      ENTRANCE_REWIND_DELAY_MS,
      ENTRANCE_REWIND_DELAY_MS,
    ])
    delaySpy.mockRestore()
    emit("focus")
    expect(withSpringSpy).toHaveBeenCalledTimes(2)
  })

  test("it never loops", () => {
    mount()
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("under Reduce Motion the illustration is drawn at its final state and nothing starts", () => {
    reanimated.setReducedMotion(true)
    const { illustration } = mount()
    expect(illustration.props.style).toEqual({ opacity: 1, transform: [{ scale: 1 }] })
    expect(withTimingSpy).not.toHaveBeenCalled()
    expect(withSpringSpy).not.toHaveBeenCalled()
  })
})
