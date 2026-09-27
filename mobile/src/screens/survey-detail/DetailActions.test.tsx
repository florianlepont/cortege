import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { Alert } from "react-native"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { SurveyExportData } from "../../app/survey-pdf-export"
import { DetailActions } from "./DetailActions"

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

jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({
      label,
      onPress,
      loading,
    }: {
      label: string
      onPress: () => void
      loading?: boolean
    }) => ReactRef.createElement("AppButton", { label, onPress, loading }),
  }
})
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: () => ReactRef.createElement("AppSectionHeader", null),
  }
})

const mockExportAndShareSurveyPdf = jest.fn()
jest.mock("../../app/survey-pdf-export", () => ({
  exportAndShareSurveyPdf: (...args: unknown[]) => mockExportAndShareSurveyPdf(...args),
}))

const t = fr.surveyDetail.actions

const survey = {
  id: "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d",
  site_name: "Bois",
  status: "draft",
  visibility: "private",
  sync_state: "synced",
  sync_blocked: 0,
  last_sync_error: null,
  last_sync_error_code: null,
  completion_rate: 80,
  updated_at: "2026-09-26T10:00:00.000Z",
} as unknown as LocalSurvey

const exportData: SurveyExportData = {
  siteName: "Bois",
  parcelIds: ["12345000AB0123"],
  observationYear: 2026,
  versionNumber: 1,
  methodVersion: "3.2",
  dateIso: "2026-09-26T10:00:00.000Z",
  scores: { ibp_total: 18, ibp_peuplement_gestion: 6, ibp_contexte: 12 },
  factorEntries: [],
}

const render = (surveyOverrides: Partial<LocalSurvey> = {}): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <DetailActions
        survey={{ ...survey, ...surveyOverrides } as LocalSurvey}
        exportData={exportData}
        onDeleteSurvey={jest.fn()}
        onRetrySurvey={jest.fn()}
        onDiscardSurvey={jest.fn()}
      />,
    )
  })
  return tree as ReactTestRenderer
}

const findButton = (tree: ReactTestRenderer, label: string): ReactTestInstance =>
  tree.root.findAll(
    (node) => (node.type as unknown) === "AppButton" && node.props.label === label,
  )[0]

beforeEach(() => {
  mockExportAndShareSurveyPdf.mockReset()
  ;(Alert.alert as jest.Mock).mockReset()
})

describe("DetailActions", () => {
  test("delete button calls onDeleteSurvey with the survey id", () => {
    const onDeleteSurvey = jest.fn()
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <DetailActions
          survey={survey}
          exportData={exportData}
          onDeleteSurvey={onDeleteSurvey}
          onRetrySurvey={jest.fn()}
          onDiscardSurvey={jest.fn()}
        />,
      )
    })
    findButton(tree as ReactTestRenderer, t.deleteSurvey).props.onPress()
    expect(onDeleteSurvey).toHaveBeenCalledWith(survey.id)
  })

  test("retry and discard only show up when sync_state is failed", () => {
    const idle = render()
    expect(findButton(idle, t.retryNow)).toBeUndefined()

    const failed = render({ sync_state: "failed" })
    expect(findButton(failed, t.retryNow)).toBeDefined()
    expect(findButton(failed, t.discardLocalChange)).toBeDefined()
  })

  test("export button shares the generated PDF and shows the idle label again", async () => {
    mockExportAndShareSurveyPdf.mockResolvedValue({ shared: true })
    const tree = render()

    await act(async () => {
      findButton(tree, t.exportPdf).props.onPress()
    })

    expect(mockExportAndShareSurveyPdf).toHaveBeenCalledWith(exportData)
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(findButton(tree, t.exportPdf)).toBeDefined()
  })

  test("export button warns when no share target is available", async () => {
    mockExportAndShareSurveyPdf.mockResolvedValue({ shared: false })
    const tree = render()

    await act(async () => {
      findButton(tree, t.exportPdf).props.onPress()
    })

    expect(Alert.alert).toHaveBeenCalledWith(t.exportPdf, t.exportShareUnavailable)
  })

  test("export button warns when PDF generation fails", async () => {
    mockExportAndShareSurveyPdf.mockRejectedValue(new Error("print failed"))
    const tree = render()

    await act(async () => {
      findButton(tree, t.exportPdf).props.onPress()
    })

    expect(Alert.alert).toHaveBeenCalledWith(t.exportPdf, t.exportFailed)
  })
})
