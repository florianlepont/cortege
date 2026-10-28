/**
 * FactorDetailRoute wiring for the doubt flag and the note of each factor (phase 27, D-16). The
 * pager is replaced by a probe that records its props; the contexts are hand-built values, as in
 * routes.test.tsx. The pager's own behaviour is tested in screens/survey-form/FactorPager.test.tsx.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorAnnotationDraft } from "../../hooks/useFactorAnnotations"
import { FactorDetailRoute } from "./FactorDetailRoute"

const mockPagerProps: { value: Record<string, unknown> } = { value: {} }
jest.mock("../../screens/survey-form/FactorPager", () => ({
  FactorPager: (props: Record<string, unknown>) => {
    mockPagerProps.value = props
    return null
  },
}))
const mockFinish = jest.fn()
const mockPagerFinish: { offered: boolean; openFinish: ((surveyId: string) => void) | null } = {
  offered: false,
  openFinish: null,
}
jest.mock("../../screens/survey-form/usePagerFinish", () => ({
  usePagerFinish: (params: { openFinish: (surveyId: string) => void }) => {
    mockPagerFinish.openFinish = params.openFinish
    return { offered: mockPagerFinish.offered, finish: mockFinish }
  },
}))
jest.mock("../../ui/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children?: React.ReactNode }) => children,
}))
jest.mock("../../state/surveys-context", () => ({
  useSurveys: () => ({ state: { surveys: [] }, actions: {} }),
}))
// Phase 30 (plan 30-15): the recorded route is read through useSurveyRoute; here a settable value.
const mockRoute: { value: Record<string, unknown> | null } = { value: null }
jest.mock("../../hooks/useSurveyRoute", () => ({
  useSurveyRoute: () => ({ route: mockRoute.value, loaded: true }),
}))

const mockForm = {
  state: {
    editingSurveyId: "s-01",
    draftInput: {},
    factorSections: {},
    factorRetainedScores: {},
    ibpMethodVersion: null,
    ibpCas: 2,
    factorAnnotations: {} as FactorAnnotationDraft,
    uncapped: {
      strataCoverText: { very_low: "25" },
      dmhCounts: { dmh_01: 2 },
      fSurfaceText: "1,2",
    },
  },
  actions: {
    flushDraft: jest.fn(async () => true),
    setFactorDoubt: jest.fn(),
    setFactorNote: jest.fn(),
    setStratumCover: jest.fn(),
    setDmhCount: jest.fn(),
    bumpDmhGroup: jest.fn(),
    markNoDmhGroup: jest.fn(),
    setFSurface: jest.fn(),
  },
}
jest.mock("../../state/survey-form-context", () => ({ useSurveyFormState: () => mockForm }))

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
  mockRoute.value = null
  mockForm.state.factorAnnotations = {}
  mockForm.actions.flushDraft.mockClear()
  mockForm.actions.setFactorDoubt.mockClear()
  mockForm.actions.setFactorNote.mockClear()
})

const navigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  popTo: jest.fn(),
}

function mount() {
  const element = (
    <FactorDetailRoute
      navigation={navigation as never}
      route={{ params: { factor: "C" } } as never}
    />
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return {
    // The context changed in place: render again so the route reads the new value.
    update: () =>
      act(() => {
        tree.update(
          <FactorDetailRoute
            navigation={navigation as never}
            route={{ params: { factor: "C" } } as never}
          />,
        )
      }),
  }
}

const pager = () =>
  mockPagerProps.value as {
    factorAnnotations: FactorAnnotationDraft
    onChangeDoubt: (factor: string, next: boolean) => void
    onChangeNote: (factor: string, text: string) => void
    onCommitNote: () => void
  }

describe("FactorDetailRoute survey context (follow-up 32-29)", () => {
  test("hands the survey's cas to the pager, for A's genus count", () => {
    mount()
    expect((mockPagerProps.value as { ibpCas: unknown }).ibpCas).toBe(2)
  })
})

describe("FactorDetailRoute doubt and note (D-16)", () => {
  test("hands the form's annotations and the note setter to the pager", () => {
    mockForm.state.factorAnnotations = { C: { doubt: true, note: "Vu en mai" } }
    mount()
    expect(pager().factorAnnotations).toBe(mockForm.state.factorAnnotations)
    expect(pager().onChangeNote).toBe(mockForm.actions.setFactorNote)
  })

  test("nothing is written when the page opens", () => {
    mount()
    expect(mockForm.actions.flushDraft).not.toHaveBeenCalled()
  })

  test("a doubt toggle sets the form value, then writes once the context carries it", () => {
    const { update } = mount()
    act(() => {
      pager().onChangeDoubt("C", true)
    })
    expect(mockForm.actions.setFactorDoubt).toHaveBeenCalledTimes(1)
    expect(mockForm.actions.setFactorDoubt).toHaveBeenCalledWith("C", true)
    // The value is not in the context yet: no write that would store the old one.
    expect(mockForm.actions.flushDraft).not.toHaveBeenCalled()

    mockForm.state.factorAnnotations = { C: { doubt: true, note: "" } }
    update()
    expect(mockForm.actions.flushDraft).toHaveBeenCalledTimes(1)

    // A later change of the annotations (a keystroke in a note) does not write by itself.
    mockForm.state.factorAnnotations = { C: { doubt: true, note: "a" } }
    update()
    expect(mockForm.actions.flushDraft).toHaveBeenCalledTimes(1)
  })

  test("two toggles write twice, one write each", () => {
    const { update } = mount()
    act(() => {
      pager().onChangeDoubt("C", true)
    })
    mockForm.state.factorAnnotations = { C: { doubt: true, note: "" } }
    update()
    act(() => {
      pager().onChangeDoubt("C", false)
    })
    mockForm.state.factorAnnotations = {}
    update()
    expect(mockForm.actions.setFactorDoubt).toHaveBeenLastCalledWith("C", false)
    expect(mockForm.actions.flushDraft).toHaveBeenCalledTimes(2)
  })

  test("a note commit (typing pause, blur, page change) writes the draft", () => {
    mount()
    act(() => {
      pager().onCommitNote()
    })
    expect(mockForm.actions.flushDraft).toHaveBeenCalledTimes(1)
  })
})

describe("FactorDetailRoute finish pill (Phase 29, D-04)", () => {
  beforeEach(() => {
    navigation.navigate.mockClear()
    mockFinish.mockClear()
    mockPagerFinish.offered = true
  })
  afterAll(() => {
    mockPagerFinish.offered = false
  })

  test("the pill is idle, has no notice and opens the pager's finish", () => {
    mount()
    const action = mockPagerProps.value.finishAction as {
      loading: boolean
      notice: unknown
      onPress: () => void
    }
    expect(action.loading).toBe(false)
    expect(action.notice).toBeNull()
    action.onPress()
    expect(mockFinish).toHaveBeenCalledTimes(1)
  })

  test("the finish opens the surveyFinish sheet with the survey id", () => {
    mount()
    mockPagerFinish.openFinish?.("s-01")
    expect(navigation.navigate).toHaveBeenCalledWith("surveyFinish", { surveyId: "s-01" })
  })

  test("no pill when the finish is not offered", () => {
    mockPagerFinish.offered = false
    mount()
    expect(mockPagerProps.value.finishAction).toBeNull()
  })
})

describe("FactorDetailRoute counting mode (Phase 30, D-07)", () => {
  const props = () =>
    mockPagerProps.value as { uncappedFactors: string[]; zoneSurfaceHa: number | null }

  test("a survey without a route hands the pager nothing new", () => {
    mount()
    expect(props().uncappedFactors).toEqual([])
    expect(props().zoneSurfaceHa).toBeNull()
  })

  test("a route counting B and F in full gives their letters and the zone", () => {
    mockRoute.value = {
      version: 1,
      method: "full",
      counting: "uncapped",
      uncapped_factors: ["B", "F"],
      zone_surface_ha: 1.2,
    }
    mount()
    expect(props().uncappedFactors).toEqual(["B", "F"])
    expect(props().zoneSurfaceHa).toBe(1.2)
  })

  test("a capped route gives no factor but still the zone", () => {
    mockRoute.value = {
      version: 1,
      method: "partial_strip",
      counting: "capped",
      zone_surface_ha: 0.8,
    }
    mount()
    expect(props().uncappedFactors).toEqual([])
    expect(props().zoneSurfaceHa).toBe(0.8)
  })
})

describe("FactorDetailRoute detail inputs of the relevé déplafonné (plan 30-19)", () => {
  test("hands the pager the form's typed details and the three setters as one object", () => {
    mount()
    const entry = mockPagerProps.value.uncappedEntry as {
      state: unknown
      setStratumCover: unknown
      setDmhCount: unknown
      bumpDmhGroup: unknown
      markNoDmhGroup: unknown
      setFSurface: unknown
    }
    expect(entry.state).toBe(mockForm.state.uncapped)
    expect(entry.setStratumCover).toBe(mockForm.actions.setStratumCover)
    expect(entry.setDmhCount).toBe(mockForm.actions.setDmhCount)
    expect(entry.bumpDmhGroup).toBe(mockForm.actions.bumpDmhGroup)
    expect(entry.markNoDmhGroup).toBe(mockForm.actions.markNoDmhGroup)
    expect(entry.setFSurface).toBe(mockForm.actions.setFSurface)
  })

  test("the object is stable while the form's details do not change", () => {
    const { update } = mount()
    const first = mockPagerProps.value.uncappedEntry
    update()
    expect(mockPagerProps.value.uncappedEntry).toBe(first)
  })
})

describe("FactorDetailRoute dendromicrohabitat guide (Phase 32, D-04)", () => {
  const open = () => mockPagerProps.value.onOpenDmhGuide as (group: string) => void

  beforeEach(() => navigation.navigate.mockClear())

  test("a group opens the guide on its page", () => {
    mount()
    open()("dmh_05")
    expect(navigation.navigate).toHaveBeenCalledWith("surveyDmhGuide", { group: "dmh_05" })
  })
})
