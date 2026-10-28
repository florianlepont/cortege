/**
 * Follow-up 32-26 (owner, 2026-10-29: "quand je dépasse les 8, je ne vois pas d'info comme quoi le
 * max est atteint"). The flow of the phone, end to end: the real useSurveyForm feeds the real
 * FactorPager and FactorDetailScreen (no hand-built retained score), and the counters are pressed
 * through the real stepper until the sum goes past 8.
 *
 * Root cause of the missing information: the evaluation was right all along (the form retains
 * score 5 from a sum of 8, pinned below) and the 32-24 note did render, but as a footnote-sized
 * line in the input card at the top of the page, while the observer works on the counters further
 * down the list, out of sight. The information is now a toast floating above the pager's bottom
 * bar (seen from any scroll position), plus a quiet "maximum" beside the sum, and the pager's
 * header (always on screen) shows the factor's score change too.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"
import { allowedScoresFor, scoreTreeDensity } from "@cortege/ibp-domain"
import { useSurveyForm } from "../../hooks/useSurveyForm"
import { formOf } from "../../app/dmh-guide/structure"
import { AccessibilityInfo } from "react-native"
import { fr } from "../../i18n"
import { feedback } from "../../ui/feedback"
import { MAX_SCORE_TOAST_MS } from "../survey-form/MaxScoreToast"
import { FactorPager } from "../survey-form/FactorPager"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({
  feedback: { selection: jest.fn(), notify: { success: jest.fn() } },
}))

// The glass card draws blur and gradients that are not under measure: a plain wrapper.
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

// Factor A's camera flow is not rendered for F, but its module pulls native packages in.
jest.mock("../FactorAGenusRecognitionEntry", () => ({
  FactorAGenusRecognitionEntry: () => null,
}))

// The doubt and note strip is not part of the counting measure: a probe.
jest.mock("./DoubtNoteStrip", () => ({ DoubtNoteStrip: () => null }))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    FlatList: mockComponent("FlatList"),
    Keyboard: { addListener: () => ({ remove: () => undefined }), dismiss: () => undefined },
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({
  useTabBarClearance: () => 68,
  useAppBottomTabBarHeight: () => 68,
}))
jest.mock("../../ui/GlassSurface", () => ({
  GlassSurface: ({ children }: { children?: React.ReactNode }) => children,
}))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: () => null }))
jest.mock("../../ui/feedback", () => ({
  feedback: { selection: jest.fn(), notify: { success: jest.fn() } },
}))

// The glass card draws blur and gradients that are not under measure: a plain wrapper.
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

// Factor A's camera flow is not rendered for F, but its module pulls native packages in.
jest.mock("../FactorAGenusRecognitionEntry", () => ({
  FactorAGenusRecognitionEntry: () => null,
}))

// The doubt and note strip is not part of the counting measure: a probe.
jest.mock("./DoubtNoteStrip", () => ({ DoubtNoteStrip: () => null }))

type Form = ReturnType<typeof useSurveyForm>

function Harness({ formRef, full }: { formRef: { current: Form | null }; full: boolean }) {
  const form = useSurveyForm()
  formRef.current = form
  return (
    <FactorPager
      initialFactor="F"
      factorSections={form.factorSections}
      factorRetainedScores={form.factorRetainedScores}
      methodVersion={form.ibpMethodVersion}
      onOpenHelp={() => undefined}
      onOpenDmhGuide={() => undefined}
      onFinish={() => undefined}
      factorAnnotations={{}}
      onChangeDoubt={() => undefined}
      onChangeNote={() => undefined}
      onCommitNote={() => undefined}
      uncappedFactors={full ? ["F"] : []}
      uncappedEntry={{
        state: form.uncapped,
        setStratumCover: form.setStratumCover,
        setDmhCount: form.setDmhCount,
        bumpDmhGroup: form.bumpDmhGroup,
        markNoDmhGroup: form.markNoDmhGroup,
        setFSurface: form.setFSurface,
        addOpenArea: form.addOpenArea,
        setOpenArea: form.setOpenArea,
        removeOpenArea: form.removeOpenArea,
        markNoOpenArea: form.markNoOpenArea,
      }}
    />
  )
}

function mount(full: boolean) {
  const formRef: { current: Form | null } = { current: null }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<Harness formRef={formRef} full={full} />)
  })
  const root = () => tree!.root
  const byTestID = (testID: string) =>
    root().findAll((n) => n.props.testID === testID && typeof n.props.onPress === "function")[0]
  const all = (testID: string) =>
    root().findAll((n) => n.props.testID === testID && typeof n.type === "string")
  return { formRef, byTestID, all, root }
}

// Two trees per hectare in each group of a capped survey, one group at a time, sections opened.
const GROUPS = ["dmh_01", "dmh_02", "dmh_04", "dmh_05", "dmh_06"] as const

function countGroups(full: boolean, groups: number) {
  const mounted = mount(full)
  const opened = new Set<string>()
  for (const code of GROUPS.slice(0, groups)) {
    const section = formOf(code)
    if (!opened.has(section)) {
      opened.add(section)
      act(() => mounted.byTestID(`dmh-section-${section}`).props.onPress())
    }
    act(() => mounted.byTestID(`dmh-add-${code}`).props.onPress())
    const increase = () =>
      mounted.root().findAll((n) => n.props.testID === `dmh-stepper-${code}-increase`)[0]
    act(() => increase().props.onPressIn())
    act(() => increase().props.onPressOut())
    act(() => increase().props.onPress())
  }
  return mounted
}

const toasts = (all: ReturnType<typeof mount>["all"]) => all("dmh-max-toast")

describe("capped F: the toast when the sum reaches the top score", () => {
  beforeEach(() => {
    jest.mocked(feedback.notify.success).mockClear()
    jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear()
  })

  test("the form retains the top score from a sum of 8, and the header shows it", () => {
    const { formRef, all } = countGroups(false, 4)
    const form = formRef.current as Form
    expect((form.draftInput.factors.F as { trees_per_ha: number }).trees_per_ha).toBe(8)
    expect(form.factorRetainedScores.F?.score).toBe(Math.max(...allowedScoresFor("F")))
    expect(scoreTreeDensity(7.99)).toBeLessThan(scoreTreeDensity(8))
    const factorHalf = all("pager-factor-score")[0]
    expect(factorHalf).toBeDefined()
    expect(all("pager-score-group")[0].props.accessibilityLabel).toBe(
      "Score du facteur 5 sur 5, total du relevé 5 sur 50",
    )
  })

  test("no toast below 8, one as soon as the sum reaches 8, still one at 10 and no second", () => {
    const seen: [number, number, number][] = []
    const mounted = mount(false)
    const opened = new Set<string>()
    for (const [index, code] of GROUPS.entries()) {
      const section = formOf(code)
      if (!opened.has(section)) {
        opened.add(section)
        act(() => mounted.byTestID(`dmh-section-${section}`).props.onPress())
      }
      act(() => mounted.byTestID(`dmh-add-${code}`).props.onPress())
      const increase = () =>
        mounted.root().findAll((n) => n.props.testID === `dmh-stepper-${code}-increase`)[0]
      act(() => increase().props.onPressIn())
      act(() => increase().props.onPressOut())
      act(() => increase().props.onPress())
      const sum = (
        (mounted.formRef.current as Form).draftInput.factors.F as { trees_per_ha: number }
      ).trees_per_ha
      seen.push([index + 1, sum, toasts(mounted.all).length])
    }
    expect(seen).toEqual([
      [1, 2, 0],
      [2, 4, 0],
      [3, 6, 0],
      [4, 8, 1],
      [5, 10, 1],
    ])
    // One haptic and one announcement for the one crossing.
    expect(feedback.notify.success).toHaveBeenCalledTimes(1)
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1)
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      fr.factorPager.maxScoreToast,
    )
  })

  test("the toast is the pager's, over the content: not inside the scrolling page", () => {
    const { root, all } = countGroups(false, 4)
    const toast = all("dmh-max-toast")[0]
    expect(toast.props.accessibilityLabel).toBe(fr.factorPager.maxScoreToast)
    expect(fr.factorPager.maxScoreToast).not.toMatch(/classe/i)
    const insidePage = root()
      .findAll((n) => n.props.testID === "dmh-max-toast")
      .some((n) => {
        for (let up = n.parent; up; up = up.parent) {
          if ((up.type as unknown) === "ScrollView") return true
        }
        return false
      })
    expect(insidePage).toBe(false)
  })

  test("it goes by itself after about 4 seconds, and a tap closes it at once", () => {
    const auto = countGroups(false, 4)
    expect(toasts(auto.all)).toHaveLength(1)
    act(() => {
      jest.advanceTimersByTime(MAX_SCORE_TOAST_MS - 1)
    })
    expect(toasts(auto.all)).toHaveLength(1)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(toasts(auto.all)).toHaveLength(0)

    const tapped = countGroups(false, 4)
    act(() => tapped.all("dmh-max-toast")[0].props.onPress())
    expect(toasts(tapped.all)).toHaveLength(0)
    act(() => {
      jest.advanceTimersByTime(MAX_SCORE_TOAST_MS * 2)
    })
    expect(toasts(tapped.all)).toHaveLength(0)
  })

  test("a drop under the top closes it, and the next crossing shows it again", () => {
    const m = countGroups(false, 4)
    expect(toasts(m.all)).toHaveLength(1)
    act(() => (m.formRef.current as Form).bumpDmhGroup("dmh_05", -1, 2))
    expect(toasts(m.all)).toHaveLength(0)
    act(() => (m.formRef.current as Form).bumpDmhGroup("dmh_05", 1, 2))
    expect(toasts(m.all)).toHaveLength(1)
    expect(feedback.notify.success).toHaveBeenCalledTimes(2)
  })

  test("a quiet 'maximum' stays beside the sum after the toast is gone; the old note block is gone", () => {
    const { root, all } = countGroups(false, 4)
    act(() => {
      jest.advanceTimersByTime(MAX_SCORE_TOAST_MS)
    })
    expect(toasts(all)).toHaveLength(0)
    const line = all("trees-per-ha-value")[0]
    expect(line.findAll((n) => n.props.testID === "trees-top-score-trace").length).toBeGreaterThan(
      0,
    )
    expect(root().findAll((n) => n.props.testID === "trees-top-score-note")).toHaveLength(0)
  })

  test("the page is one list: no input, no field box, sections then the none row last", () => {
    const { root } = countGroups(false, 1)
    expect(root().findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    expect(root().findAll((n) => n.props.testID === "trees-derived-caption")).toHaveLength(0)
    const order = root()
      .findAll(
        (n) =>
          typeof n.type === "string" &&
          typeof n.props.testID === "string" &&
          (n.props.testID.startsWith("dmh-section-") || n.props.testID === "dmh-none-row"),
      )
      .map((n) => n.props.testID as string)
    expect(order.at(-1)).toBe("dmh-none-row")
    expect(order.filter((id) => id === "dmh-none-row")).toHaveLength(1)
    expect(order).toHaveLength(8)
  })

  test("counted in full the same toast rides on the density the surface gives", () => {
    const counted = countGroups(true, 4)
    // Counted but no surface yet: no figure to score, so no toast, and the line says so.
    expect(toasts(counted.all)).toHaveLength(0)
    expect(counted.all("trees-per-ha-value")[0].props.accessibilityLabel).toBe(
      `Arbres par hectare, ${fr.factorDetail.dmhList.treesPerHaPending}`,
    )
    act(() => (counted.formRef.current as Form).setFSurface("1"))
    expect(toasts(counted.all)).toHaveLength(1)
  })
})
