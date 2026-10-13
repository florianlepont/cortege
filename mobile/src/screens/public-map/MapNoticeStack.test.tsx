import React from "react"
import renderer, { act } from "react-test-renderer"

const mockAnnounce = jest.fn()
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
    AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
// The shared Reanimated mock, with a recording entering builder and a host view.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as {
    default: Record<string, unknown>
  }
  const builder = (calls: Record<string, unknown>) => ({
    duration: (ms: number) => builder({ ...calls, durationMs: ms }),
    reduceMotion: (mode: string) => builder({ ...calls, reduceMotion: mode }),
    calls,
  })
  return {
    ...shared,
    __esModule: true,
    default: {
      ...shared.default,
      View: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactRef.createElement("AnimatedView", props, children),
    },
    FadeIn: builder({}),
    ReduceMotion: { System: "system" },
  }
})
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({
      children,
      disableScale: _disableScale,
      disableRipple: _disableRipple,
      ...props
    }: {
      children?: React.ReactNode
      disableScale?: boolean
      disableRipple?: boolean
    }) => ReactRef.createElement("Pressable", props, children),
  }
})
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})

import { brandMotion } from "../../app/brand-tokens"
import type { MapNotice } from "./map-notices"
import { MapNoticeStack } from "./MapNoticeStack"

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
  mockAnnounce.mockClear()
})

const overzoom: MapNotice = {
  id: "overzoom",
  kind: "overzoom",
  text: "Fond peu détaillé à cette échelle",
  icon: "information-circle-outline",
}
const offline: MapNotice = {
  id: "offline-etat-major",
  kind: "offline",
  text: "Carte d'état-major (1820-1866) n'est pas téléchargée pour cette zone.",
  icon: "cloud-offline-outline",
}
const error: MapNotice = {
  id: "error-carte-1950",
  kind: "error",
  text: "Impossible d'afficher Carte de 1950.",
  icon: "alert-circle-outline",
  danger: true,
  retry: true,
}

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function render(notices: readonly MapNotice[], onRetry = jest.fn(), top = 50) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<MapNoticeStack notices={notices} top={top} onRetry={onRetry} />)
  })
  const kinds = () =>
    tree.root
      .findAll(
        (node) =>
          (node.type as unknown) === "AnimatedView" &&
          String(node.props.testID ?? "").startsWith("map-notice-"),
      )
      .map((node) => node.props.testID as string)
      .filter((id) => id !== "map-notice-retry")
  return { tree, kinds, onRetry }
}

describe("MapNoticeStack", () => {
  test("renders nothing without notices", () => {
    const { tree } = render([])
    expect(tree.toJSON()).toBeNull()
  })

  test("one pill per notice, in order, with its test id", () => {
    const { kinds, tree } = render([offline, overzoom])
    expect(kinds()).toEqual(["map-notice-offline", "map-notice-overzoom"])
    const texts = tree.root.findAllByType("Text" as never).map((node) => node.props.children)
    expect(texts).toEqual([offline.text, overzoom.text])
  })

  test("the column is centred, 72 pt clear on both sides, and lets touches through", () => {
    const { tree } = render([overzoom], jest.fn(), 61)
    const column = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.pointerEvents === "box-none",
    )[0]
    expect(flat(column.props.style)).toMatchObject({
      position: "absolute",
      left: 72,
      right: 72,
      top: 61,
      alignItems: "center",
    })
  })

  test("each pill fades in over 160 ms and follows Reduce Motion", () => {
    const { tree } = render([overzoom])
    const item = tree.root.findByProps({ testID: "map-notice-overzoom" })
    expect(item.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
  })

  test("the pill is a polite live region labelled with its text, and carries its glyph", () => {
    const { tree } = render([offline])
    const region = tree.root.findByProps({ accessibilityLiveRegion: "polite" })
    expect(region.props.accessible).toBe(true)
    expect(region.props.accessibilityLabel).toBe(offline.text)
    expect(tree.root.findByType("Ionicons" as never).props.name).toBe("cloud-offline-outline")
  })

  test("an error adds a retry link of at least 44 pt that calls onRetry", () => {
    const onRetry = jest.fn()
    const { tree } = render([error], onRetry)
    const retry = tree.root.findAll(
      (node) => (node.type as unknown) === "Pressable" && node.props.testID === "map-notice-retry",
    )[0]
    expect(retry.props.accessibilityRole).toBe("button")
    expect(retry.props.accessibilityLabel).toBe("Réessayer")
    expect(flat(retry.props.style).minHeight).toBeGreaterThanOrEqual(44)
    act(() => retry.props.onPress())
    expect(onRetry).toHaveBeenCalledTimes(1)
    const item = tree.root.findByProps({ testID: "map-notice-error" })
    expect(item.props.pointerEvents).toBe("box-none")
  })

  test("a notice without retry has no link and ignores touches", () => {
    const { tree } = render([overzoom])
    expect(tree.root.findAllByProps({ testID: "map-notice-retry" })).toHaveLength(0)
    expect(tree.root.findByProps({ testID: "map-notice-overzoom" }).props.pointerEvents).toBe(
      "none",
    )
  })

  test("each new notice is announced once, again only after it has left", () => {
    const onRetry = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<MapNoticeStack notices={[overzoom]} top={0} onRetry={onRetry} />)
    })
    expect(mockAnnounce.mock.calls).toEqual([[overzoom.text]])
    act(() => tree.update(<MapNoticeStack notices={[overzoom]} top={0} onRetry={onRetry} />))
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    act(() =>
      tree.update(<MapNoticeStack notices={[offline, overzoom]} top={0} onRetry={onRetry} />),
    )
    expect(mockAnnounce.mock.calls).toEqual([[overzoom.text], [offline.text]])
    act(() => tree.update(<MapNoticeStack notices={[]} top={0} onRetry={onRetry} />))
    act(() => tree.update(<MapNoticeStack notices={[overzoom]} top={0} onRetry={onRetry} />))
    expect(mockAnnounce).toHaveBeenCalledTimes(3)
  })

  test("hidden draws nothing and announces nothing; on return only new notices are announced", () => {
    const onRetry = jest.fn()
    let tree!: renderer.ReactTestRenderer
    const show = (notices: readonly MapNotice[], hidden: boolean) =>
      act(() =>
        tree.update(<MapNoticeStack notices={notices} top={0} hidden={hidden} onRetry={onRetry} />),
      )
    act(() => {
      tree = renderer.create(
        <MapNoticeStack notices={[overzoom]} top={0} hidden={false} onRetry={onRetry} />,
      )
    })
    expect(mockAnnounce.mock.calls).toEqual([[overzoom.text]])
    show([overzoom], true)
    expect(tree.toJSON()).toBeNull()
    // A notice that appears while hidden is not announced yet.
    show([offline, overzoom], true)
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    // Back: the one already announced is not announced twice, the new one is.
    show([offline, overzoom], false)
    expect(mockAnnounce.mock.calls).toEqual([[overzoom.text], [offline.text]])
    expect(tree.toJSON()).not.toBeNull()
    // One that left while hidden may be announced again if it comes back.
    show([offline, overzoom], true)
    show([offline], true)
    show([offline, overzoom], false)
    expect(mockAnnounce).toHaveBeenCalledTimes(3)
  })
})
