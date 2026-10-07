import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const mockScrollTo = jest.fn()

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop

  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Image: mockComponent("Image"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: PressableRenderProp<React.ReactNode>
      style?: PressableRenderProp<unknown>
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: resolvePressableProp(style) },
        resolvePressableProp(children),
      ),
    ScrollView: ReactRef.forwardRef(function ScrollView(
      { children, ...props }: { children?: React.ReactNode },
      ref: React.Ref<unknown>,
    ) {
      ReactRef.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }))
      return ReactRef.createElement("ScrollView", props, children)
    }),
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

import { OnboardingCarouselScreen } from "./OnboardingCarouselScreen"

const t = fr.onboarding.carousel

function hasGlassFill(node: renderer.ReactTestInstance): boolean {
  const fill = defaultTheme.visual.glassCta.flat
  return (
    node.findAll((n) => {
      const style = ([] as unknown[]).concat(n.props.style ?? []).flat(Infinity)
      return style.some(
        (entry) => (entry as { backgroundColor?: string } | null)?.backgroundColor === fill,
      )
    }).length > 0
  )
}

function render(props: Partial<React.ComponentProps<typeof OnboardingCarouselScreen>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <OnboardingCarouselScreen onSkip={jest.fn()} onFinish={jest.fn()} {...props} />,
    )
  })
  return tree!
}

describe("OnboardingCarouselScreen (ONB-01: 3-screen carousel)", () => {
  test("renders all three slides (ten factors · offline · member map)", () => {
    const tree = render()
    for (let index = 0; index < t.slides.length; index += 1) {
      expect(
        tree.root.findByProps({
          accessibilityLabel: t.progressLabel({ index: index + 1, count: t.slides.length }),
        }),
      ).toBeTruthy()
    }
  })

  test("one marten belongs to the screen, not to a slide, and is only decoration (OA-01)", () => {
    const tree = render()
    const martens = tree.root.findAllByType("Image" as never)
    expect(martens).toHaveLength(1)
    expect(martens[0].props.accessible).toBe(false)
    expect(tree.root.findByProps({ testID: "onboarding-marten" }).props.pointerEvents).toBe("none")
  })

  test("the big button is the green glass button, the skip stays a small secondary one (D-27c)", () => {
    const tree = render()
    expect(hasGlassFill(tree.root.findByProps({ accessibilityLabel: t.next }))).toBe(true)
    expect(hasGlassFill(tree.root.findByProps({ accessibilityLabel: t.skip }))).toBe(false)
  })

  test("the skip button calls onSkip", () => {
    const onSkip = jest.fn()
    const tree = render({ onSkip })
    const skip = tree.root.findByProps({ accessibilityLabel: t.skip })
    act(() => {
      skip.props.onPress()
    })
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  test("Suivant advances slides; the last slide's button reads Commencer and calls onFinish", () => {
    const onFinish = jest.fn()
    const tree = render({ onFinish })

    expect(tree.root.findByProps({ accessibilityLabel: t.next })).toBeTruthy()

    // Advance through every slide but the last.
    for (let i = 0; i < t.slides.length - 1; i += 1) {
      const next = tree.root.findByProps({ accessibilityLabel: t.next })
      act(() => {
        next.props.onPress()
      })
    }

    const start = tree.root.findByProps({ accessibilityLabel: t.start })
    act(() => {
      start.props.onPress()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  test("a swipe (onMomentumScrollEnd) keeps the active dot in sync", () => {
    const tree = render()
    const scrollView = tree.root.findByType("ScrollView" as unknown as React.ComponentType)
    act(() => {
      scrollView.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 2 } } })
    })
    // On the last slide now, so the primary button should read "Commencer".
    expect(tree.root.findByProps({ accessibilityLabel: t.start })).toBeTruthy()
  })
})
