/**
 * SurveyHistoryRoute routing (phase 29, D-10): a survey the phone holds opens the owner's own
 * summary (the community page answers 404 for a private survey), another member's survey opens the
 * community page. The screen is replaced by a probe that records its props.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"
import { SurveyHistoryRoute } from "./SurveyHistoryRoute"

const mockScreenProps: { value: Record<string, unknown> } = { value: {} }
jest.mock("../../screens/SurveyHistoryScreen", () => ({
  SurveyHistoryScreen: (props: Record<string, unknown>) => {
    mockScreenProps.value = props
    return null
  },
}))
jest.mock("../../ui/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children?: React.ReactNode }) => children,
}))
jest.mock("../large-title", () => ({ usesNativeLargeTitle: () => false }))
jest.mock("./SelectedSurveyGate", () => ({
  SelectedSurveyGate: ({
    children,
  }: {
    children: (survey: Record<string, unknown>) => React.ReactNode
  }) => children({ id: "own-1" }),
}))
jest.mock("../../state/session-context", () => ({
  useSession: () => ({ state: { apiUrl: "http://localhost:3000" } }),
  useAccessToken: () => "token",
}))

const mockActions = { openSurvey: jest.fn() }
jest.mock("../../state/surveys-context", () => ({
  useSurveys: () => ({
    state: {
      surveys: [{ id: "own-1" }, { id: "own-2" }],
      surveyDetails: {},
      detailsLoadingSurveyId: null,
    },
    actions: mockActions,
  }),
}))

const navigation = { push: jest.fn(), popTo: jest.fn(), navigate: jest.fn() }

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
  mockActions.openSurvey.mockClear()
  navigation.push.mockClear()
  navigation.popTo.mockClear()
  act(() => {
    renderer.create(
      <SurveyHistoryRoute
        navigation={navigation as never}
        route={{ params: undefined } as never}
      />,
    )
  })
})

const openSurvey = (surveyId: string) =>
  (mockScreenProps.value as { onOpenSurvey: (id: string) => void }).onOpenSurvey(surveyId)

describe("SurveyHistoryRoute onOpenSurvey (D-10)", () => {
  test("a survey the phone holds opens the owner's summary, never the community page", () => {
    openSurvey("own-1")
    expect(mockActions.openSurvey).toHaveBeenCalledWith("own-1")
    expect(navigation.popTo).toHaveBeenCalledWith("surveyDetail")
    expect(navigation.push).not.toHaveBeenCalled()
  })

  test("the selection is made before the summary is shown", () => {
    openSurvey("own-2")
    expect(mockActions.openSurvey.mock.invocationCallOrder[0]).toBeLessThan(
      navigation.popTo.mock.invocationCallOrder[0],
    )
  })

  test("another member's survey opens the community page", () => {
    openSurvey("other-1")
    expect(navigation.push).toHaveBeenCalledWith("communitySurvey", { surveyId: "other-1" })
    expect(mockActions.openSurvey).not.toHaveBeenCalled()
    expect(navigation.popTo).not.toHaveBeenCalled()
  })
})
