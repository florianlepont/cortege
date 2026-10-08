import { readFileSync } from "node:fs"
import { join } from "node:path"
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { notificationAsync } from "../../test/expo-haptics.mock"
import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import type { LocalSurvey } from "../storage/types"
import { Alert } from "react-native"
import { fr } from "../i18n"
import { FrameLargeTitleContext } from "../ui/frame-large-title"
import { SurveyDetailScreen } from "./SurveyDetailScreen"
import { useSurveyDetailHeader } from "./survey-detail/useSurveyDetailHeader"
import type { SurveyDetailScreenProps } from "./survey-detail/screen-props"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"

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
  notificationAsync.mockClear()
  mockCtaKind = "hidden"
  mockScrollTo.mockClear()
  setReducedMotion(false)
})

const mockScrollTo = jest.fn()

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    Alert: { alert: jest.fn(), prompt: jest.fn() },
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/dev-tools", () => ({ shouldShowDevTools: () => false }))
jest.mock("../app/survey-pdf-export", () => ({ exportAndShareSurveyPdf: jest.fn() }))
jest.mock("./survey-screen-helpers", () => ({ selectPreviewCandidates: () => [] }))
jest.mock("../ui/AppActionSheet", () => ({ AppActionSheet: "AppActionSheet" }))
jest.mock("../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("./survey-detail/DebugTab", () => ({ DebugTab: "DebugTab" }))
jest.mock("./survey-detail/DetailActions", () => ({ DetailActions: "DetailActions" }))
jest.mock("./survey-detail/FinishBar", () => ({ FinishBar: "FinishBar" }))
jest.mock("./survey-detail/ParcelMapCard", () => ({ ParcelMapCard: "ParcelMapCard" }))
jest.mock("./survey-detail/SurveyOfflineMapRow", () => ({
  SurveyOfflineMapRow: "SurveyOfflineMapRow",
}))
jest.mock("./survey-detail/PhotosStrip", () => ({ PhotosStrip: "PhotosStrip" }))
jest.mock("./survey-detail/ScoreCard", () => ({ ScoreCard: "ScoreCard" }))
jest.mock("./survey-detail/SummaryHeader", () => ({ SummaryHeader: "SummaryHeader" }))
jest.mock("./survey-detail/useSurveyDetailHeader", () => ({ useSurveyDetailHeader: jest.fn() }))
let mockCtaKind: "hidden" | "next" = "hidden"
jest.mock("./survey-detail/summary-state", () => ({
  resolveStatusLine: () => ({ status: "Brouillon", sync: "x", syncTone: "ok" }),
  resolveFinishCta: () =>
    mockCtaKind === "hidden"
      ? { kind: "hidden" }
      : { kind: "next", label: "Continuer", factor: "A" },
}))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    detail: undefined,
    displayedScores: { ibp_total: 30, ibp_peuplement_gestion: 20, ibp_contexte: 10 },
    displayedFactorEntries: [
      ["A", { score_points: 3 }],
      ["B", { score_points: null }],
      ["not-a-factor", { score_points: 1 }],
    ],
    useLocalDraftView: true,
    canEditSurvey: true,
    canFinishNow: false,
    isComplete: false,
    filledFactorCount: 2,
    nextFactor: "A",
    localDraftMeta: null,
    scoringContext: { ibp_method_version: null, ibp_cas: null },
    activeSiteName: "Parcelle A",
    parcelIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
}))

function makeSurvey(status: string): LocalSurvey {
  return { id: "survey-1", status } as LocalSurvey
}

function makeProps(status: string): SurveyDetailScreenProps {
  return {
    apiUrl: "http://api",
    accessToken: null,
    navigation: {} as never,
    selectedSurvey: makeSurvey(status),
    selectedSurveyAttachments: [],
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    surveyEvents: {},
    onTakePhoto: jest.fn(),
    onPickPhoto: jest.fn(),
    onDeleteAttachment: jest.fn(),
    onDeleteSurvey: jest.fn(),
    onSubmitSurvey: jest.fn(),
    onRetrySurvey: jest.fn(),
    onDiscardSurvey: jest.fn(),
    onRenameSurvey: jest.fn(),
    onOpenContext: jest.fn(),
    onOpenParcels: jest.fn(),
    onOpenScore: jest.fn(),
    onOpenFactor: jest.fn(),
    onOpenHistory: jest.fn(),
  }
}

function mount(status: string): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<SurveyDetailScreen {...makeProps(status)} />, {
      createNodeMock: (element) =>
        (element.type as unknown) === "ScrollView" ? { scrollTo: mockScrollTo } : null,
    })
  })
  return tree!
}

function update(tree: ReactTestRenderer, status: string): void {
  act(() => {
    tree.update(<SurveyDetailScreen {...makeProps(status)} />)
  })
}

const byType = (tree: ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((n) => (n.type as unknown) === type)

describe("SurveyDetailScreen summary", () => {
  test("has no factor bar chart and no glass card: the chart lives on the score page only (D-24)", () => {
    const tree = mount("draft")
    expect(byType(tree, "FactorBarsChart")).toHaveLength(0)
    expect(byType(tree, "AppCard")).toHaveLength(0)
    const scroll = byType(tree, "ScrollView")[0]
    const order = scroll.children.map((child) => String((child as ReactTestInstance).type))
    // The score card is followed straight by the photos.
    expect(order.indexOf("PhotosStrip")).toBe(order.indexOf("ScoreCard") + 1)
  })

  test("the source of the summary no longer imports the chart", () => {
    const source = readFileSync(join(__dirname, "SurveyDetailScreen.tsx"), "utf8")
    expect(source).not.toContain("FactorBarsChart")
    expect(source).not.toContain("factorPointsFromEntries")
  })

  test("keeps the one bottom button and the three rows", () => {
    const tree = mount("draft")
    expect(byType(tree, "FinishBar")).toHaveLength(1)
    expect(byType(tree, "AppGroupedList")[0].props.sections[0].rows).toHaveLength(3)
  })

  test("D-25: the finish scrolls to the top, pulses the score card and fires the haptic once", () => {
    const tree = mount("draft")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()
    expect(mockScrollTo).not.toHaveBeenCalled()

    // An ordinary draft sync is not a finish.
    update(tree, "synced")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()
    expect(mockScrollTo).not.toHaveBeenCalled()

    update(tree, "submitted")
    expect(byType(tree, "ScoreCard")[0].props.pulseTrigger).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: true })

    update(tree, "submitted")
    expect(notificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
  })

  test("D-26: finished from the factor pager, the haptic plays at once and the halo when the summary is back", () => {
    type Listener = (event: { data?: { closing?: boolean } }) => void
    const listeners: Record<string, Listener[]> = {}
    let focused = false
    const navigation = {
      setOptions: jest.fn(),
      isFocused: () => focused,
      addListener: (type: string, callback: Listener) => {
        ;(listeners[type] ??= []).push(callback)
        return () => {
          listeners[type] = listeners[type].filter((item) => item !== callback)
        }
      },
    }
    const render = (status: string) => (
      <SurveyDetailScreen {...makeProps(status)} navigation={navigation as never} />
    )
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(render("synced"), {
        createNodeMock: (element) =>
          (element.type as unknown) === "ScrollView" ? { scrollTo: mockScrollTo } : null,
      })
    })
    // The summary is covered by the pager when the finish lands.
    act(() => {
      tree!.update(render("submitted"))
    })
    expect(notificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
    expect(byType(tree!, "ScoreCard")[0].props.pulseTrigger).toBe(0)
    // The pager pops: the summary appears, the halo and pop play, the haptic does not repeat.
    focused = true
    act(() => {
      listeners.transitionEnd.forEach((listener) => listener({ data: { closing: false } }))
    })
    expect(byType(tree!, "ScoreCard")[0].props.pulseTrigger).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
  })

  test("D-25: under Reduce Motion the finish jumps to the top without animation", () => {
    setReducedMotion(true)
    const tree = mount("synced")
    update(tree, "submitted")
    expect(notificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: false })
  })

  test("a survey opened already finished neither scrolls nor celebrates", () => {
    mount("submitted")
    expect(notificationAsync).not.toHaveBeenCalled()
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("the bottom button finishes the survey through onSubmitSurvey", () => {
    const props = makeProps("draft")
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<SurveyDetailScreen {...props} />)
    })
    act(() => {
      byType(tree!, "FinishBar")[0].props.onFinish()
    })
    expect(props.onSubmitSurvey).toHaveBeenCalledWith("survey-1")
  })
})

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("SurveyDetailScreen bottom clearance", () => {
  const BAR = 10 + 50 + (90 + 8)

  test("without the bottom button the last row scrolls above the floating tab bar", () => {
    const tree = mount("submitted")
    const scroll = byType(tree, "ScrollView")[0]
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })

  test("the floating bar does not hide content: at maximum scroll the last row ends above it", () => {
    mockCtaKind = "next"
    const tree = mount("draft")
    const scroll = byType(tree, "ScrollView")[0]
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    // The bar (tab bar clearance, gap, 50 pt button, air above) plus the usual margin.
    expect(padding).toBe(BAR + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThan(90 + PAGE_END_MARGIN)
    // The bar is a sibling drawn after the scroll view, over it, not inside the scroll area.
    const bar = byType(tree, "FinishBar")[0]
    expect(bar.props.onLayout).toEqual(expect.any(Function))
  })

  test("a taller measured bar (a wrapped label at a large text size) grows the padding", () => {
    mockCtaKind = "next"
    const tree = mount("draft")
    const bar = byType(tree, "FinishBar")[0]
    act(() => bar.props.onLayout({ nativeEvent: { layout: { height: BAR + 22 } } }))
    const scroll = byType(tree, "ScrollView")[0]
    expect(flattenStyle(scroll.props.contentContainerStyle).paddingBottom).toBe(
      BAR + 22 + PAGE_END_MARGIN,
    )
  })

  test("when the survey is finished the bar goes away and the padding returns to the tab bar's", () => {
    mockCtaKind = "next"
    const tree = mount("draft")
    mockCtaKind = "hidden"
    update(tree, "submitted")
    const scroll = byType(tree, "ScrollView")[0]
    expect(flattenStyle(scroll.props.contentContainerStyle).paddingBottom).toBe(
      90 + PAGE_END_MARGIN,
    )
  })
})

describe("SurveyDetailScreen under the native large title (12.2-17)", () => {
  const headerMock = useSurveyDetailHeader as jest.Mock
  type HeaderParams = Parameters<typeof useSurveyDetailHeader>[0]
  const lastHeader = (): HeaderParams => headerMock.mock.calls.at(-1)![0] as HeaderParams

  function mountLarge(status: string, props: Partial<SurveyDetailScreenProps> = {}) {
    const element = (next: string) => (
      <FrameLargeTitleContext.Provider value>
        <SurveyDetailScreen {...makeProps(next)} {...props} />
      </FrameLargeTitleContext.Provider>
    )
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(element(status), {
        createNodeMock: (node) =>
          (node.type as unknown) === "ScrollView" ? { scrollTo: mockScrollTo } : null,
      })
    })
    return { tree: tree!, update: (next: string) => act(() => tree!.update(element(next))) }
  }

  beforeEach(() => {
    headerMock.mockClear()
    ;(Alert.prompt as jest.Mock).mockClear()
    ;(Alert.alert as jest.Mock).mockClear()
  })

  test("the header carries the name: large title on, rename offered for an editable survey", () => {
    mountLarge("draft")
    expect(lastHeader().largeTitle).toBe(true)
    expect(lastHeader().siteName).toBe("Parcelle A")
    expect(typeof lastHeader().onRename).toBe("function")
  })

  test("the scroll view leaves the insets to iOS", () => {
    const { tree } = mountLarge("draft")
    expect(byType(tree, "ScrollView")[0].props.contentInsetAdjustmentBehavior).toBe("automatic")
  })

  test("Renommer opens the system prompt on the current name and saves the trimmed name", () => {
    const onRenameSurvey = jest.fn()
    mountLarge("draft", { onRenameSurvey })
    act(() => lastHeader().onRename!())
    const [title, message, buttons, type, defaultValue] = (Alert.prompt as jest.Mock).mock
      .calls[0] as [
      string,
      undefined,
      { text: string; onPress?: (v?: string) => void }[],
      string,
      string,
    ]
    expect(title).toBe(fr.surveyDetail.header.renameLabel)
    expect(message).toBeUndefined()
    expect(type).toBe("plain-text")
    expect(defaultValue).toBe("Parcelle A")
    expect(buttons.map((b) => b.text)).toEqual([fr.common.actions.cancel, fr.common.actions.save])
    buttons[1].onPress!("  Lisière nord  ")
    expect(onRenameSurvey).toHaveBeenCalledWith("survey-1", "Lisière nord")
  })

  test("an empty name is refused with the usual alert, nothing is renamed", () => {
    const onRenameSurvey = jest.fn()
    mountLarge("draft", { onRenameSurvey })
    act(() => lastHeader().onRename!())
    const buttons = (Alert.prompt as jest.Mock).mock.calls[0][2] as {
      onPress?: (v?: string) => void
    }[]
    buttons[1].onPress!("   ")
    buttons[1].onPress!(undefined)
    expect(onRenameSurvey).not.toHaveBeenCalled()
    expect(Alert.alert).toHaveBeenCalledWith(
      fr.surveyDetail.alerts.invalidNameTitle,
      fr.surveyDetail.alerts.invalidNameMessage,
    )
  })

  test("D-25: the finish goes back to the resting top under the large title, not to 0", () => {
    const { tree, update } = mountLarge("synced")
    const scroll = byType(tree, "ScrollView")[0]
    act(() => scroll.props.onScrollBeginDrag({ nativeEvent: { contentOffset: { x: 0, y: -140 } } }))
    update("submitted")
    expect(mockScrollTo).toHaveBeenCalledWith({ y: -140, animated: true })
  })
})

describe("SurveyDetailScreen without the large title", () => {
  test("the page names the survey itself: no large title, no rename in the menu", () => {
    const headerMock = useSurveyDetailHeader as jest.Mock
    headerMock.mockClear()
    const tree = mount("draft")
    const params = headerMock.mock.calls.at(-1)![0] as Parameters<typeof useSurveyDetailHeader>[0]
    expect(params.largeTitle).toBe(false)
    expect(params.onRename).toBeUndefined()
    expect(byType(tree, "ScrollView")[0].props.contentInsetAdjustmentBehavior).toBe("never")
  })
})
