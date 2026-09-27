import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { SurveyProgressCard } from "./SurveyProgressCard"
import { brandColors } from "../app/brand-tokens"
import { fr } from "../i18n"
import type { LocalSurvey } from "../storage/types"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop

  return {
    // AppPressable renders Pressable's `children`/`style` in their function-of-pressed-state form.
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: PressableRenderProp<React.ReactNode>
      style?: PressableRenderProp<unknown>
    }) =>
      ReactActual.createElement(
        "Pressable",
        { ...props, style: resolvePressableProp(style) },
        resolvePressableProp(children),
      ),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: {
      OS: "ios",
      select: <T,>(options: { ios?: T; android?: T; default?: T }): T | undefined =>
        options.ios ?? options.default,
    },
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

function makeSurvey(completionRate: number, overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "survey-1",
    site_name: "Parcelle A",
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: new Date().toISOString(),
    completion_rate: completionRate,
    ...overrides,
  }
}

type FlatStyle = { width?: string; backgroundColor?: string }

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
}

function render(completionRate: number, overrides: Partial<LocalSurvey> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  const onPress = jest.fn()
  act(() => {
    tree = renderer.create(
      <SurveyProgressCard survey={makeSurvey(completionRate, overrides)} onPress={onPress} />,
    )
  })
  const root = tree!.root
  const fill = flattenStyle(root.findByProps({ testID: "survey-progress-fill" }).props.style)
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  const pressable = root.findByType("Pressable" as never)
  return { fill, texts, onPress, pressable }
}

describe("SurveyProgressCard treats completion_rate as 0-100 (01.9 D-03)", () => {
  test("40 renders a 40% bar, 4/10 factors and the in-progress colour", () => {
    const { fill, texts } = render(40)
    expect(fill?.width).toBe("40%")
    expect(texts).toContain(fr.components.surveyProgressCard.factorCount({ count: 4 }))
    expect(fill?.backgroundColor).toBe(brandColors.ochre)
    expect(fill?.backgroundColor).not.toBe(brandColors.moss)
  })

  test("100 renders a 100% bar, 10/10 factors and the moss colour", () => {
    const { fill, texts } = render(100)
    expect(fill?.width).toBe("100%")
    expect(texts).toContain(fr.components.surveyProgressCard.factorCount({ count: 10 }))
    expect(fill?.backgroundColor).toBe(brandColors.moss)
  })

  test("0 renders a 0% bar and 0/10 factors", () => {
    const { fill, texts } = render(0)
    expect(fill?.width).toBe("0%")
    expect(texts).toContain(fr.components.surveyProgressCard.factorCount({ count: 0 }))
    expect(fill?.backgroundColor).toBe(brandColors.ochre)
  })

  test("out-of-range values are clamped to 0-100", () => {
    expect(render(140).fill?.width).toBe("100%")
    expect(render(-5).fill?.width).toBe("0%")
  })
})

describe("SurveyProgressCard reads its text from the catalogue (01.9 D-06)", () => {
  test("renders the progress label, the site name and the just-now time", () => {
    const { texts } = render(40)
    expect(texts).toContain(fr.components.surveyProgressCard.progressLabel)
    expect(texts).toContain("Parcelle A")
    expect(texts).toContain(fr.common.justNow)
  })

  test("falls back to the untitled survey text", () => {
    expect(render(40, { site_name: "" }).texts).toContain(fr.common.untitledSurvey)
  })

  test("shows the blocked sync text when the survey is blocked", () => {
    const { texts } = render(40, { sync_blocked: 1 })
    expect(texts).toContain(fr.components.surveyProgressCard.syncBlocked)
  })

  test("formats older updates in hours, yesterday and days", () => {
    const hoursAgo = new Date(Date.now() - 3 * 3600000).toISOString()
    const yesterday = new Date(Date.now() - 30 * 3600000).toISOString()
    const daysAgo = new Date(Date.now() - 5 * 24 * 3600000).toISOString()
    expect(render(40, { updated_at: hoursAgo }).texts).toContain(
      fr.components.surveyProgressCard.hoursAgo({ count: 3 }),
    )
    expect(render(40, { updated_at: yesterday }).texts).toContain(
      fr.components.surveyProgressCard.yesterday,
    )
    expect(render(40, { updated_at: daysAgo }).texts).toContain(
      fr.components.surveyProgressCard.daysAgo({ count: 5 }),
    )
  })
})

describe("SurveyProgressCard calls onPress", () => {
  test("tapping the card calls onPress", () => {
    const { pressable, onPress } = render(40)
    act(() => {
      pressable.props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
