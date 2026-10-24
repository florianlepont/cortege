/**
 * ExportChoiceRoute wiring (phase 33, D-05, D-09, D-14): the survey comes from the surveys context,
 * the page estimate counts the selected survey's photos, the confirm hands the chosen mode back to
 * the summary through popTo with a fresh nonce. The sheet is replaced by a probe that records its
 * props; the real useExportChoice runs.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"
import type { LocalAttachment, LocalSurvey } from "../../storage"

jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Platform: { OS: "ios" },
  StyleSheet: { create: <T,>(styles: T) => styles },
}))
jest.mock("../../ui/feedback", () => ({
  feedback: { notify: { error: jest.fn() }, selection: jest.fn() },
}))

const mockSheetProps: { value: Record<string, unknown> } = { value: {} }
jest.mock("../../screens/export-choice/ExportChoiceSheet", () => ({
  ExportChoiceSheet: (props: Record<string, unknown>) => {
    mockSheetProps.value = props
    return null
  },
}))

const mockSurveys: {
  surveys: LocalSurvey[]
  selectedSurveyId: string | null
  selectedSurveyAttachments: LocalAttachment[]
} = { surveys: [], selectedSurveyId: null, selectedSurveyAttachments: [] }
jest.mock("../../state/surveys-context", () => ({
  useSurveys: () => ({ state: mockSurveys }),
}))

import { COMPLETE_BASE_PAGES } from "../../app/survey-pdf/page-estimate"
import { ExportChoiceRoute } from "./ExportChoiceRoute"

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

const survey = (overrides: Partial<LocalSurvey> = {}): LocalSurvey =>
  ({ id: "s-01", site_name: "Lisière", status: "submitted", ...overrides }) as LocalSurvey

const attachment = (mime_type: string): LocalAttachment => ({ mime_type }) as LocalAttachment

const navigation = {
  goBack: jest.fn(),
  isFocused: jest.fn(() => true),
  popTo: jest.fn(),
}

beforeEach(() => {
  mockSurveys.surveys = [survey()]
  mockSurveys.selectedSurveyId = "s-01"
  mockSurveys.selectedSurveyAttachments = []
  mockSheetProps.value = {}
  navigation.goBack.mockClear()
  navigation.popTo.mockClear()
  navigation.isFocused.mockReset()
  navigation.isFocused.mockReturnValue(true)
})

function mount() {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ExportChoiceRoute
        navigation={navigation as never}
        route={{ key: "k", name: "surveyExportChoice", params: { surveyId: "s-01" } } as never}
      />,
    )
  })
  return tree
}

const sheet = () =>
  mockSheetProps.value as {
    siteName: string
    mode: string
    isDraft: boolean
    completePages: number
    onSelect: (mode: string) => void
    onConfirm: () => void
    onCancel: () => void
  }

describe("ExportChoiceRoute", () => {
  test("a submitted survey: its name, not a draft, complete by default", () => {
    mount()
    expect(sheet().siteName).toBe("Lisière")
    expect(sheet().isDraft).toBe(false)
    expect(sheet().mode).toBe("complete")
  })

  test("a survey submitted but not yet synced may still produce the summary", () => {
    mockSurveys.surveys = [survey({ status: "submitted", sync_state: "pending" } as never)]
    mount()
    expect(sheet().isDraft).toBe(false)
    act(() => sheet().onSelect("summary"))
    expect(sheet().mode).toBe("summary")
  })

  test("a draft stays on the complete PDF", () => {
    mockSurveys.surveys = [survey({ status: "draft" })]
    mount()
    expect(sheet().isDraft).toBe(true)
    act(() => sheet().onSelect("summary"))
    expect(sheet().mode).toBe("complete")
  })

  test("the page estimate counts the photos of the selected survey only", () => {
    mockSurveys.selectedSurveyAttachments = [
      attachment("image/jpeg"),
      attachment("image/png"),
      attachment("application/pdf"),
    ]
    mount()
    expect(sheet().completePages).toBe(COMPLETE_BASE_PAGES + 1)
  })

  test("another survey's attachments are not counted", () => {
    mockSurveys.selectedSurveyId = "other"
    mockSurveys.selectedSurveyAttachments = [attachment("image/jpeg")]
    mount()
    expect(sheet().completePages).toBe(COMPLETE_BASE_PAGES)
  })

  test("confirm pops back to the summary with the mode and a numeric nonce", () => {
    mount()
    act(() => sheet().onSelect("summary"))
    act(() => sheet().onConfirm())
    expect(navigation.popTo).toHaveBeenCalledTimes(1)
    expect(navigation.popTo).toHaveBeenCalledWith(
      "surveyDetail",
      { exportRequest: { mode: "summary", nonce: expect.any(Number) } },
      { merge: true },
    )
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  test("cancel goes back only when the sheet is focused", () => {
    mount()
    act(() => sheet().onCancel())
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    navigation.isFocused.mockReturnValue(false)
    act(() => sheet().onCancel())
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(navigation.popTo).not.toHaveBeenCalled()
  })

  test("a survey that is not in the list closes the sheet and draws nothing", () => {
    mockSurveys.surveys = []
    const tree = mount()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(tree.toJSON()).toBeNull()
    expect(mockSheetProps.value).toEqual({})
  })
})
