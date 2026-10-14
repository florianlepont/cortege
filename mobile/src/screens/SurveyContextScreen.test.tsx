import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import type { LocalSurvey } from "../storage/types"
import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import { FrameLargeTitleContext } from "../ui/frame-large-title"
import { SurveyContextScreen } from "./SurveyContextScreen"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"
import type { SurveyContextScreenProps } from "./survey-detail/screen-props"
import type { SurveyConditions } from "./survey-detail/conditions/useSurveyConditions"

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

const mockScrollTo = jest.fn()

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  // The page scrolls through the ref of its scroll view.
  const ScrollView = ReactRef.forwardRef(function ScrollView(
    { children, ...props }: { children?: React.ReactNode },
    ref: React.Ref<unknown>,
  ) {
    ReactRef.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }))
    return ReactRef.createElement("ScrollView", props, children)
  })
  return {
    View: mockComponent("View"),
    ScrollView,
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("./survey-detail/ScoringContextEditor", () => ({
  ScoringContextEditor: "ScoringContextEditor",
}))
jest.mock("./survey-detail/conditions/ConditionsSection", () => ({
  ConditionsSection: "ConditionsSection",
}))
const EMPTY_CONDITIONS: SurveyConditions = {
  note: null,
  weather: null,
  parcelIds: [],
  loaded: true,
}
let mockConditions: SurveyConditions = EMPTY_CONDITIONS
jest.mock("./survey-detail/conditions/useSurveyConditions", () => ({
  useSurveyConditions: () => mockConditions,
}))

let mockCanEdit = true
let mockParcelIds: string[] = ["75056000AB0001"]
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    detail: undefined,
    canEditSurvey: mockCanEdit,
    activeSiteName: "Parcelle A",
    parcelIds: mockParcelIds,
    scoringContext: { ibp_method_version: null, ibp_cas: null, ibp_cas3_scale: false },
    activeRegion: "ACA",
    activeVegetationStage: "collineen",
  }),
}))

type Over = Partial<SurveyContextScreenProps>

function makeProps(over: Over = {}): SurveyContextScreenProps {
  return {
    weatherRequest: { online: true, inFlight: false, unavailable: false },
    selectedSurvey: { id: "survey-1" } as unknown as LocalSurvey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    onUpdateRegionVersion: jest.fn(),
    onUpdateVegetationStage: jest.fn(),
    onUpdateIbpCas: jest.fn(),
    onUpdateCas3Scale: jest.fn(),
    onSwitchToV32: jest.fn(),
    onEditWeather: jest.fn(),
    onRetryWeather: jest.fn(),
    onRefillWeather: jest.fn(),
    ...over,
  } as SurveyContextScreenProps
}

function render(largeTitle = false, over: Over = {}): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FrameLargeTitleContext.Provider value={largeTitle}>
        <SurveyContextScreen {...makeProps(over)} />
      </FrameLargeTitleContext.Provider>,
    )
  })
  return tree as ReactTestRenderer
}

beforeEach(() => {
  mockScrollTo.mockClear()
})

afterEach(() => {
  mockCanEdit = true
  mockParcelIds = ["75056000AB0001"]
  mockConditions = EMPTY_CONDITIONS
  setReducedMotion(false)
})

describe("SurveyContextScreen (variant I)", () => {
  test("shows the weather first, then the method editor: no map, no parcel list, no route card (D-32, D-41, 2026-10-14)", () => {
    const tree = render()
    const scroll = tree.root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    // The weather opens the page, inside the view that measures it, above the method and cas.
    expect(order).toHaveLength(3)
    expect([order[0], order[2]]).toEqual(["PageTitle", "ScoringContextEditor"])
    const first = scroll.children[1] as ReactTestInstance
    expect(first.findAllByType("ConditionsSection" as never)).toHaveLength(1)
    expect(tree.root.findAllByType("ParcelMapCard" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("RouteSection" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("AppGroupedList" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("GlassIconButton" as never)).toHaveLength(0)
  })

  test("the page is named Contexte", () => {
    const tree = render()
    expect(tree.root.findByType("PageTitle" as never).props.children).toBe("Contexte")
  })
})

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("bottom clearance above the tab bar", () => {
  test("the scroll content ends above the floating tab bar, with a margin", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })
})

describe("under the native large title (12.2-17)", () => {
  test("iOS insets the page: automatic insets, only the margin under the last item", () => {
    const scroll = render(true).root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic")
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(PAGE_END_MARGIN)
  })

  test("elsewhere the page keeps its own insets", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("never")
  })
})

describe("Conditions section (phase 27, D-15)", () => {
  const section = (tree: ReactTestRenderer) =>
    tree.root.findByType("ConditionsSection" as never).props

  test("is editable while the survey can be edited, plain text otherwise", () => {
    expect(section(render()).editable).toBe(true)
    mockCanEdit = false
    expect(section(render()).editable).toBe(false)
  })

  test("is given what the local draft holds", () => {
    mockConditions = { note: "Sol frais", weather: { sky: "cloudy" }, parcelIds: [], loaded: true }
    const props = section(render())
    expect(props.conditions).toBe(mockConditions)
  })

  test("says the visit is too old, with no retry state, for a draft past the 24 h window (D-42)", () => {
    const old = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()
    const survey = (createdAt: string) => ({ id: "survey-1", created_at: createdAt }) as LocalSurvey

    mockConditions = { ...EMPTY_CONDITIONS, weather: { requested_at: old(30) } }
    expect(section(render(false, { selectedSurvey: survey(old(31)) })).viewState).toBe("tooOld")
    expect(
      section(
        render(false, {
          selectedSurvey: survey(old(31)),
          weatherRequest: { online: false, inFlight: false, unavailable: true },
        }),
      ).viewState,
    ).toBe("tooOld")

    // An unstamped draft is judged on its creation time.
    mockConditions = EMPTY_CONDITIONS
    expect(section(render(false, { selectedSurvey: survey(old(30)) })).viewState).toBe("tooOld")

    // Inside the window the retry stays offered.
    mockConditions = { ...EMPTY_CONDITIONS, weather: { requested_at: old(23) } }
    expect(section(render(false, { selectedSurvey: survey(old(24)) })).viewState).toBe(
      "unavailable",
    )

    // The provider's values win, however old the visit.
    mockConditions = {
      ...EMPTY_CONDITIONS,
      weather: { temperature_c: 14, source: "meteo_france", requested_at: old(30) },
    }
    expect(section(render(false, { selectedSurvey: survey(old(31)) })).viewState).toBe("prefilled")

    // No parcel yet: the first line stays.
    mockParcelIds = []
    mockConditions = { ...EMPTY_CONDITIONS, weather: { requested_at: old(30) } }
    expect(section(render(false, { selectedSurvey: survey(old(31)) })).viewState).toBe("noParcel")
  })

  test("picks the one status line from the parcels, the network and the lookup", () => {
    expect(section(render()).viewState).toBe("unavailable")
    expect(
      section(
        render(false, { weatherRequest: { online: true, inFlight: true, unavailable: false } }),
      ).viewState,
    ).toBe("loading")
    expect(
      section(
        render(false, { weatherRequest: { online: false, inFlight: false, unavailable: false } }),
      ).viewState,
    ).toBe("offline")
    mockParcelIds = []
    expect(section(render()).viewState).toBe("noParcel")
    mockParcelIds = ["75056000AB0001"]
    mockConditions = {
      ...EMPTY_CONDITIONS,
      weather: { temperature_c: 14, source: "meteo_france" },
    }
    expect(section(render()).viewState).toBe("prefilled")
  })

  test("sends the weather edits and the retry link to the survey's actions", () => {
    const onEditWeather = jest.fn()
    const onRetryWeather = jest.fn()
    const props = section(render(false, { onEditWeather, onRetryWeather }))
    const update = (current: unknown) => current

    props.onEditWeather(update)
    props.onRetry()

    expect(onEditWeather).toHaveBeenCalledWith("survey-1", update)
    expect(onRetryWeather).toHaveBeenCalledWith("survey-1")
  })
})

describe("section param (opens at the Conditions)", () => {
  const measure = (tree: ReactTestRenderer, y: number) => {
    const wrapper = tree.root
      .findAllByType("View" as never)
      .find((node) => typeof node.props.onLayout === "function")
    act(() => {
      wrapper?.props.onLayout({ nativeEvent: { layout: { y } } })
    })
  }
  const resize = (tree: ReactTestRenderer) => {
    act(() => {
      tree.root.findByType("ScrollView" as never).props.onContentSizeChange(390, 1800)
    })
  }

  test("scrolls once to the section after its layout and the page's size", () => {
    const tree = render(false, { section: "conditions" })

    measure(tree, 900)
    expect(mockScrollTo).not.toHaveBeenCalled()
    resize(tree)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 900, animated: true })

    measure(tree, 920)
    resize(tree)
    expect(mockScrollTo).toHaveBeenCalledTimes(1)
  })

  test("works whichever of the layout and the size comes last", () => {
    const tree = render(false, { section: "conditions" })

    resize(tree)
    expect(mockScrollTo).not.toHaveBeenCalled()
    measure(tree, 640)

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 640, animated: true })
  })

  test("does not animate under Reduce Motion", () => {
    setReducedMotion(true)
    const tree = render(false, { section: "conditions" })
    measure(tree, 500)
    resize(tree)

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 500, animated: false })
  })

  test("waits for the draft: a size seen before it was read does not count", () => {
    mockConditions = { ...EMPTY_CONDITIONS, loaded: false }
    const tree = render(false, { section: "conditions" })
    measure(tree, 400)
    resize(tree)
    expect(mockScrollTo).not.toHaveBeenCalled()

    mockConditions = EMPTY_CONDITIONS
    act(() => {
      tree.update(
        <FrameLargeTitleContext.Provider value={false}>
          <SurveyContextScreen {...makeProps({ section: "conditions" })} />
        </FrameLargeTitleContext.Provider>,
      )
    })
    resize(tree)

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 400, animated: true })
  })

  test("does not scroll when the weather already sits at the top of the page (D-41)", () => {
    const tree = render(false, { section: "conditions" })
    measure(tree, 60)
    resize(tree)

    expect(mockScrollTo).not.toHaveBeenCalled()
    // Done for good: a later, taller layout does not scroll either.
    measure(tree, 900)
    resize(tree)
    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  test("without the param the page never scrolls by itself", () => {
    const tree = render()
    measure(tree, 900)
    resize(tree)

    expect(mockScrollTo).not.toHaveBeenCalled()
  })
})
