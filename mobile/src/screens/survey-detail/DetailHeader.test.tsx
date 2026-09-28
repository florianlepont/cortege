import React, { createRef } from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { ibpScoreTokens } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { DetailHeader, DetailHeaderHandle } from "./DetailHeader"
import { HeroMetric, resolveHeroMetric } from "./hero-state"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Alert: { alert: jest.fn() },
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})

jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))
jest.mock("../../ui/AppStatusChip", () => ({ AppStatusChip: "AppStatusChip" }))

type FlatStyle = { backgroundColor?: string; color?: string }

const flattenStyle = (style: unknown): FlatStyle =>
  Array.isArray(style)
    ? (Object.assign({}, ...style.map(flattenStyle)) as FlatStyle)
    : ((style ?? {}) as FlatStyle)

const textOf = (node: ReactTestInstance): string => [node.props.children].flat().join("")

const survey = {
  id: "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d",
  site_name: "Bois",
  status: "draft",
  visibility: "private",
  sync_state: "synced",
  sync_blocked: 0,
  completion_rate: 80,
  updated_at: "2026-09-26T10:00:00.000Z",
} as unknown as LocalSurvey

const render = (
  metric: HeroMetric,
  overrides: Partial<React.ComponentProps<typeof DetailHeader>> = {},
  ref?: React.Ref<DetailHeaderHandle>,
): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <DetailHeader
        ref={ref}
        survey={survey}
        activeSiteName="Bois"
        canEditSurvey
        isHeroCompressed={false}
        metric={metric}
        submitState="progress"
        remainingTime="2 j"
        attachmentCount={0}
        onRenameSurvey={jest.fn()}
        onSubmitSurvey={jest.fn()}
        onOpenMenu={jest.fn()}
        {...overrides}
      />,
    )
  })
  return tree as ReactTestRenderer
}

const findPill = (tree: ReactTestRenderer, testID: string): ReactTestInstance[] =>
  tree.root.findAll((node) => (node.type as unknown) === "View" && node.props.testID === testID)

describe("DetailHeader hero metric (D-03 amended)", () => {
  test("shows the /50 total and the band-coloured sub-scores", () => {
    const scores = { ibp_peuplement_gestion: 6, ibp_contexte: 12, ibp_total: 18 }
    const tree = render(resolveHeroMetric(scores, false, null))
    const texts = tree.root.findAll((node) => (node.type as unknown) === "Text").map(textOf)
    expect(texts).toContain("18 / 50")

    const [stand] = findPill(tree, "hero-subscore-stand")
    const [context] = findPill(tree, "hero-subscore-context")
    expect(flattenStyle(stand.props.style).backgroundColor).toBe(
      ibpScoreTokens.colors.low.background,
    )
    expect(textOf(stand.findByType("Text" as never))).toBe("P/G 6 / 35 · faible")
    expect(flattenStyle(context.props.style).backgroundColor).toBe(
      ibpScoreTokens.colors.high.background,
    )
    expect(textOf(context.findByType("Text" as never))).toBe("C 12 / 15 · forte")
  })

  test("without scores it shows the plain meta line and no sub-score pills", () => {
    const metric = resolveHeroMetric(null, false, 4)
    const tree = render(metric)
    expect(findPill(tree, "hero-subscore-stand")).toHaveLength(0)
    const texts = tree.root.findAll((node) => (node.type as unknown) === "Text").map(textOf)
    expect(texts).toContain(metric.meta)
  })
})

describe("DetailHeader menu (DET-03/04)", () => {
  test("the '…' button calls onOpenMenu with the accessible name of the survey", () => {
    const onOpenMenu = jest.fn()
    const metric = resolveHeroMetric(null, false, 4)
    const tree = render(metric, { onOpenMenu })

    const menuButton = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityLabel === fr.surveyDetail.a11y.openMenu("Bois"),
    )[0]
    menuButton.props.onPress()
    expect(onOpenMenu).toHaveBeenCalledTimes(1)
  })

  test("the ref's startRename() switches into the rename form when the survey is editable", () => {
    const ref = createRef<DetailHeaderHandle>()
    const metric = resolveHeroMetric(null, false, 4)
    const tree = render(metric, { canEditSurvey: true }, ref)

    expect(tree.root.findAllByType("AppField" as never)).toHaveLength(0)
    act(() => {
      ref.current?.startRename()
    })
    expect(tree.root.findAllByType("AppField" as never)).toHaveLength(1)
  })

  test("the ref's startRename() is a no-op when the survey isn't editable", () => {
    const ref = createRef<DetailHeaderHandle>()
    const metric = resolveHeroMetric(null, false, 4)
    const tree = render(metric, { canEditSurvey: false }, ref)

    act(() => {
      ref.current?.startRename()
    })
    expect(tree.root.findAllByType("AppField" as never)).toHaveLength(0)
  })
})
