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
jest.mock("../../screens/survey-form/PagerFinishNotice", () => ({ PagerFinishNotice: () => null }))
jest.mock("../../screens/survey-form/usePagerFinish", () => ({
  usePagerFinish: () => ({ offered: false, busy: false, attempts: 0, finish: jest.fn() }),
}))
jest.mock("../../ui/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children?: React.ReactNode }) => children,
}))
jest.mock("../../state/status-context", () => ({ useStatus: () => ({ status: null }) }))
jest.mock("../../state/surveys-context", () => ({
  useSurveys: () => ({
    state: { surveys: [] },
    actions: { submitSurvey: jest.fn(async () => undefined) },
  }),
}))

const mockForm = {
  state: {
    editingSurveyId: "s-01",
    draftInput: {},
    factorSections: {},
    factorRetainedScores: {},
    ibpMethodVersion: null,
    factorAnnotations: {} as FactorAnnotationDraft,
  },
  actions: {
    flushDraft: jest.fn(async () => true),
    setFactorDoubt: jest.fn(),
    setFactorNote: jest.fn(),
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
