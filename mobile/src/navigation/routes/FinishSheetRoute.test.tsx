/**
 * FinishSheetRoute wiring (phase 29, D-04, D-05): the survey comes from the surveys context, the
 * confirm runs the real useFinishSheet over hand-built actions, the sheet is protected while
 * submitting without blocking programmatic navigation. The sheet is replaced by a probe that
 * records its props; the stack options are tested here too.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"
import type { LocalSurvey } from "../../storage"

const mockPlatform = { OS: "ios" as "ios" | "android" }
const mockBackHandlers: ((() => boolean) | null)[] = []
const mockRemove = jest.fn()

jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  BackHandler: {
    addEventListener: (_event: string, handler: () => boolean) => {
      mockBackHandlers.push(handler)
      return { remove: mockRemove }
    },
  },
  Platform: {
    get OS() {
      return mockPlatform.OS
    },
  },
  StyleSheet: { create: <T,>(styles: T) => styles },
}))
jest.mock("../../ui/feedback", () => ({
  feedback: { notify: { error: jest.fn() }, selection: jest.fn() },
}))

const mockSheetProps: { value: Record<string, unknown> } = { value: {} }
jest.mock("../../screens/FinishSheet", () => ({
  FinishSheet: (props: Record<string, unknown>) => {
    mockSheetProps.value = props
    return null
  },
}))

jest.mock("../native-tabs-availability", () => ({
  getNativeTabsAvailability: () => ({ native: true }),
}))

let mockOffline = false
jest.mock("../../hooks/useIsOffline", () => ({ useIsOffline: () => mockOffline }))

const mockSurveys: { value: LocalSurvey[] } = { value: [] }
const mockActions = {
  submitSurvey: jest.fn(),
  setDraftVisibility: jest.fn(),
}
jest.mock("../../state/surveys-context", () => ({
  useSurveys: () => ({ state: { surveys: mockSurveys.value }, actions: mockActions }),
}))
const mockFlush = jest.fn()
jest.mock("../../state/survey-form-context", () => ({
  useSurveyFormState: () => ({ actions: { flushDraft: mockFlush } }),
}))

import { FinishSheetRoute } from "./FinishSheetRoute"
import { finishSheetScreenOptions } from "../stacks/stack-options"
import { defaultTheme } from "../../app/theme"

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
  ({
    id: "s-01",
    site_name: "Lisière",
    status: "draft",
    visibility: "public",
    ...overrides,
  }) as LocalSurvey

const navigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(() => true),
}

beforeEach(() => {
  mockOffline = false
  mockSurveys.value = [survey()]
  mockBackHandlers.length = 0
  mockRemove.mockClear()
  navigation.setOptions.mockClear()
  navigation.goBack.mockClear()
  navigation.isFocused.mockReset()
  navigation.isFocused.mockReturnValue(true)
  mockFlush.mockReset()
  mockFlush.mockResolvedValue(true)
  mockActions.setDraftVisibility.mockReset()
  mockActions.setDraftVisibility.mockResolvedValue("stored")
  mockActions.submitSurvey.mockReset()
  mockActions.submitSurvey.mockResolvedValue("submitted")
})

function mount() {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FinishSheetRoute
        navigation={navigation as never}
        route={{ key: "k", name: "surveyFinish", params: { surveyId: "s-01" } } as never}
      />,
    )
  })
  return tree
}

const sheet = () =>
  mockSheetProps.value as {
    siteName: string
    choice: string
    phase: string
    offline: boolean
    onSelect: (v: string) => void
    onConfirm: () => void
    onCancel: () => void
  }

describe("FinishSheetRoute", () => {
  test("shows the survey's name and stored choice, and the offline state", () => {
    mockOffline = true
    mockSurveys.value = [survey({ visibility: "private" })]
    mount()
    expect(sheet().siteName).toBe("Lisière")
    expect(sheet().choice).toBe("private")
    expect(sheet().phase).toBe("idle")
    expect(sheet().offline).toBe(true)
  })

  test("cancel goes back only when the sheet is focused", () => {
    mount()
    act(() => sheet().onCancel())
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    navigation.isFocused.mockReturnValue(false)
    act(() => sheet().onCancel())
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("confirm flushes, stores the changed choice, submits this survey, then goes back", async () => {
    mount()
    act(() => sheet().onSelect("private"))
    await act(async () => {
      sheet().onConfirm()
    })
    expect(mockFlush).toHaveBeenCalledTimes(1)
    expect(mockActions.setDraftVisibility).toHaveBeenCalledWith("s-01", "private")
    expect(mockActions.submitSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("while submitting: swipe down is off and the back press is swallowed; then restored", async () => {
    let release!: (value: string) => void
    mockActions.submitSurvey.mockReturnValue(
      new Promise<string>((resolve) => {
        release = resolve
      }),
    )
    mount()
    expect(navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
    expect(mockBackHandlers).toHaveLength(0)
    await act(async () => {
      sheet().onConfirm()
    })
    expect(sheet().phase).toBe("submitting")
    expect(navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false })
    expect(mockBackHandlers).toHaveLength(1)
    expect(mockBackHandlers[0]?.()).toBe(true)
    // A programmatic return is not blocked by the route.
    expect(navigation.goBack).not.toHaveBeenCalled()
    await act(async () => {
      release("not_submitted")
    })
    expect(sheet().phase).toBe("notFinished")
    expect(navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: true })
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  test("a survey already submitted opens frozen and a confirm is not possible", async () => {
    mockSurveys.value = [survey({ status: "submitted" })]
    mount()
    expect(sheet().phase).toBe("frozen")
    await act(async () => {
      sheet().onConfirm()
    })
    expect(mockActions.submitSurvey).not.toHaveBeenCalled()
  })

  test("a survey that is not in the list closes the sheet", () => {
    mockSurveys.value = []
    mount()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })
})

describe("finishSheetScreenOptions", () => {
  test("a form sheet with two detents on iOS", () => {
    mockPlatform.OS = "ios"
    expect(finishSheetScreenOptions(defaultTheme)).toEqual({
      headerShown: false,
      presentation: "formSheet",
      sheetAllowedDetents: [0.65, 1],
      sheetGrabberVisible: true,
      contentStyle: { backgroundColor: defaultTheme.semanticColors.backgroundCanvas },
    })
  })

  test("a modal elsewhere", () => {
    mockPlatform.OS = "android"
    expect(finishSheetScreenOptions(defaultTheme).presentation).toBe("modal")
    mockPlatform.OS = "ios"
  })
})
