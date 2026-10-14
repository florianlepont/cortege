import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"
import { routeAdviceFor, ROUTE_WARNING_CODES } from "@cortege/ibp-domain"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    Pressable: mockComponent("Pressable"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))

import { formatDurationRange, ROUTE_WARNING_TEXT } from "../../app/route-text"
import { fr } from "../../i18n"
import { RouteAdvice, RouteNotices } from "./RouteNotices"

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

const guide = fr.routeGuide

function mount(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  const byId = (id: string): ReactTestInstance[] =>
    tree.root.findAll((node) => node.props.testID === id && typeof node.type === "string")
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  const icons = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Ionicons")
      .map((node) => node.props.name as string)
  return { tree, byId, texts, icons }
}

describe("RouteNotices", () => {
  it("renders each package warning from its catalogue sentence, with its testID", () => {
    const { byId, texts, icons } = mount(
      React.createElement(RouteNotices, { warnings: ["small_stand", "partial_over_half"] }),
    )
    expect(byId("route-notice-small_stand")).toHaveLength(1)
    expect(byId("route-notice-partial_over_half")).toHaveLength(1)
    expect(texts()).toEqual([ROUTE_WARNING_TEXT.small_stand, ROUTE_WARNING_TEXT.partial_over_half])
    expect(icons().every((name) => name === "alert-circle-outline")).toBe(true)
  })

  it("has a sentence for every warning code of the package", () => {
    const { texts } = mount(
      React.createElement(RouteNotices, { warnings: [...ROUTE_WARNING_CODES] }),
    )
    expect(texts()).toHaveLength(ROUTE_WARNING_CODES.length)
  })

  it("announces a warning politely", () => {
    const { byId } = mount(React.createElement(RouteNotices, { warnings: ["small_stand"] }))
    expect(byId("route-notice-small_stand")[0].props.accessibilityLiveRegion).toBe("polite")
  })

  it("draws nothing without a warning", () => {
    const { tree } = mount(React.createElement(RouteNotices, { warnings: [] }))
    expect(tree.toJSON()).toBeNull()
  })
})

describe("RouteAdvice", () => {
  it("shows the duration range as an indication, under the title 'Conseil', in the info tone", () => {
    const advice = routeAdviceFor({
      method: "full",
      counting: "capped",
      zoneHa: 2.4,
      answers: {},
    })
    const { byId, texts, icons } = mount(React.createElement(RouteAdvice, { advice }))
    expect(byId("route-advice")).toHaveLength(1)
    const range = formatDurationRange(advice.estimated_minutes!)
    const all = texts()
    expect(all).toContain(guide.suggestion.adviceTitle)
    expect(all.some((text) => text.includes(range))).toBe(true)
    expect(all.some((text) => text.includes(guide.advice.durationNote))).toBe(true)
    expect(icons()).toContain("information-circle-outline")
  })

  it("adds the beginner, uncapped and short-time advice as information", () => {
    const advice = routeAdviceFor({
      method: "partial_plot",
      counting: "uncapped",
      zoneHa: 5,
      answers: { experience: "beginner", hours_available: 1 },
    })
    expect(advice.advice).toEqual(["duration", "time_short", "beginner", "uncapped_longer"])
    const { texts } = mount(React.createElement(RouteAdvice, { advice }))
    const joined = texts().join("\n")
    expect(joined).toContain(guide.advice.timeShort)
    expect(joined).toContain(guide.advice.beginner)
    expect(joined).toContain(guide.advice.uncappedLonger)
  })

  it("never offers an action: advice does not move the selection (O-04)", () => {
    const advice = routeAdviceFor({
      method: "full",
      counting: "capped",
      zoneHa: 2.4,
      answers: { experience: "beginner" },
    })
    const { tree } = mount(React.createElement(RouteAdvice, { advice }))
    const pressables = tree.root.findAll(
      (node) => (node.type as unknown) === "Pressable" || typeof node.props.onPress === "function",
    )
    expect(pressables).toHaveLength(0)
  })

  it("draws nothing without advice", () => {
    const { tree } = mount(
      React.createElement(RouteAdvice, { advice: { advice: [], estimated_minutes: null } }),
    )
    expect(tree.toJSON()).toBeNull()
  })

  it("falls back to the note when a duration comes with no range", () => {
    const { texts } = mount(
      React.createElement(RouteAdvice, {
        advice: { advice: ["duration"], estimated_minutes: null },
      }),
    )
    expect(texts().join("\n")).toContain(guide.advice.durationNote)
  })
})
