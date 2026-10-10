jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
  Alert: { alert: jest.fn() },
}))
jest.mock("../../app/survey-pdf-export", () => ({ exportAndShareSurveyPdf: jest.fn() }))
jest.mock("../../i18n", () => ({
  ...jest.requireActual("../../i18n"),
  logStatusDetail: jest.fn(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { Alert } from "react-native"
import { exportAndShareSurveyPdf } from "../../app/survey-pdf-export"
import { fr, logStatusDetail } from "../../i18n"
import type { SurveyDetailResponse } from "../../app/types"
import {
  buildSurveyExportInput,
  useSurveyPdfExport,
  type SurveyPdfExportArgs,
} from "./useSurveyPdfExport"

const exportMock = exportAndShareSurveyPdf as jest.Mock
const alertMock = Alert.alert as jest.Mock
const logMock = logStatusDetail as jest.Mock

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

afterEach(async () => {
  await cleanup()
  exportMock.mockReset()
  alertMock.mockClear()
  logMock.mockClear()
})

function makeArgs(overrides: Partial<SurveyPdfExportArgs> = {}): SurveyPdfExportArgs {
  return {
    surveyId: "survey-1",
    detail: undefined,
    canEditSurvey: true,
    activeSiteName: "Bois de la Colline",
    parcelIds: ["12345000AB0123"],
    localDraftMeta: null,
    scoringContext: { ibp_method_version: "3.2", ibp_cas: 2, ibp_cas3_scale: false },
    displayedScores: { ibp_total: 18, ibp_peuplement_gestion: 6, ibp_contexte: 12 },
    displayedFactorEntries: [["A", { selected_class: "S2", warnings: [], score_points: 2 }]],
    createdAt: "2026-09-01T08:00:00.000Z",
    observerName: "Claire Martin",
    apiUrl: "http://api",
    accessToken: "token",
    ...overrides,
  }
}

function makeDetail(overrides: Partial<SurveyDetailResponse> = {}): SurveyDetailResponse {
  return { id: "survey-1", ...overrides } as SurveyDetailResponse
}

const LOCAL_META = {
  site_name: "Local",
  region_version: "M" as const,
  vegetation_stage: "mature" as never,
  ibp_method_version: null,
  ibp_cas: null,
  ibp_cas3_scale: false,
  parcel_ids: [],
  observation_year: 2025,
  version_number: 3,
}

describe("buildSurveyExportInput", () => {
  test("maps the summary's data to the export input", () => {
    const input = buildSurveyExportInput(
      makeArgs({
        detail: makeDetail({
          observation_year: 2026,
          version_number: 2,
          submitted_at: "2026-09-26T10:00:00.000Z",
          display_location: { lat: 48.4, lng: 2.7 },
          region_version: "ACA",
          vegetation_stage: "young",
        }),
        canEditSurvey: false,
      }),
    )

    expect(input).toEqual({
      surveyId: "survey-1",
      siteName: "Bois de la Colline",
      parcelIds: ["12345000AB0123"],
      observationYear: 2026,
      versionNumber: 2,
      dateIso: "2026-09-26T10:00:00.000Z",
      isDraft: false,
      observerName: "Claire Martin",
      displayLocation: { lat: 48.4, lng: 2.7 },
      method: {
        version: "3.2",
        ibpCas: 2,
        ibpCas3Scale: false,
        regionVersion: "ACA",
        vegetationStage: "young",
      },
      scores: { ibp_total: 18, ibp_peuplement_gestion: 6, ibp_contexte: 12 },
      factorEntries: [["A", { selected_class: "S2", warnings: [], score_points: 2 }]],
      apiUrl: "http://api",
      accessToken: "token",
    })
  })

  test("falls back to the local draft and the creation date without a detail", () => {
    const input = buildSurveyExportInput(
      makeArgs({ localDraftMeta: LOCAL_META, observerName: null, accessToken: null }),
    )

    expect(input.observationYear).toBe(2025)
    expect(input.versionNumber).toBe(3)
    expect(input.dateIso).toBe("2026-09-01T08:00:00.000Z")
    expect(input.isDraft).toBe(true)
    expect(input.displayLocation).toBeNull()
    expect(input.observerName).toBeNull()
    expect(input.accessToken).toBeNull()
    expect(input.method.regionVersion).toBe("M")
    expect(input.method.vegetationStage).toBe("mature")
  })

  test("a draft reads its region and stage from the local edits, a submitted survey from the detail", () => {
    const detail = makeDetail({ region_version: "ACA", vegetation_stage: "young" })

    const draft = buildSurveyExportInput(
      makeArgs({ detail, localDraftMeta: LOCAL_META, canEditSurvey: true }),
    )
    const submitted = buildSurveyExportInput(
      makeArgs({ detail, localDraftMeta: LOCAL_META, canEditSurvey: false }),
    )

    expect(draft.method.regionVersion).toBe("M")
    expect(submitted.method.regionVersion).toBe("ACA")
    expect(submitted.method.vegetationStage).toBe("young")
  })

  test("a submitted survey without a detail falls back to the local meta", () => {
    const input = buildSurveyExportInput(
      makeArgs({ localDraftMeta: LOCAL_META, canEditSurvey: false }),
    )

    expect(input.method.regionVersion).toBe("M")
  })

  test("has no region and stage when nothing knows them", () => {
    const input = buildSurveyExportInput(makeArgs())

    expect(input.method.regionVersion).toBeNull()
    expect(input.method.vegetationStage).toBeNull()
    expect(input.observationYear).toBeNull()
    expect(input.versionNumber).toBeNull()
  })

  test("keeps a display location only when latitude and longitude are finite", () => {
    const location = (value: unknown) =>
      buildSurveyExportInput(makeArgs({ detail: makeDetail({ display_location: value as never }) }))
        .displayLocation

    expect(location({ lat: 48.4, lng: 2.7 })).toEqual({ lat: 48.4, lng: 2.7 })
    expect(location({ lat: Number.NaN, lng: 2.7 })).toBeNull()
    expect(location({ lat: 48.4, lng: Number.POSITIVE_INFINITY })).toBeNull()
    expect(location({ lat: "48.4", lng: 2.7 })).toBeNull()
    expect(location({ lat: 48.4, lng: "2.7" })).toBeNull()
    expect(location(null)).toBeNull()
  })
})

describe("useSurveyPdfExport", () => {
  test("shares once with the input built from the arguments", async () => {
    exportMock.mockResolvedValue({ shared: true })
    const { result } = await renderHook(() => useSurveyPdfExport(makeArgs()))
    expect(result.current.exporting).toBe(false)

    await act(async () => {
      await result.current.share()
    })

    expect(exportMock).toHaveBeenCalledTimes(1)
    expect(exportMock).toHaveBeenCalledWith(buildSurveyExportInput(makeArgs()))
    expect(alertMock).not.toHaveBeenCalled()
    expect(result.current.exporting).toBe(false)
  })

  test("ignores a second tap while an export runs and reports exporting meanwhile", async () => {
    let finish: (value: { shared: boolean }) => void = () => undefined
    exportMock.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { result } = await renderHook(() => useSurveyPdfExport(makeArgs()))

    let first: Promise<void> = Promise.resolve()
    await act(async () => {
      first = result.current.share()
    })
    expect(result.current.exporting).toBe(true)

    await act(async () => {
      await result.current.share()
    })
    expect(exportMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      finish({ shared: true })
      await first
    })
    expect(result.current.exporting).toBe(false)

    exportMock.mockResolvedValue({ shared: true })
    await act(async () => {
      await result.current.share()
    })
    expect(exportMock).toHaveBeenCalledTimes(2)
  })

  test("tells the member when no share target exists", async () => {
    exportMock.mockResolvedValue({ shared: false })
    const { result } = await renderHook(() => useSurveyPdfExport(makeArgs()))

    await act(async () => {
      await result.current.share()
    })

    expect(alertMock).toHaveBeenCalledWith(
      fr.surveyDetail.menu.share,
      fr.surveyDetail.actions.exportShareUnavailable,
    )
    expect(result.current.exporting).toBe(false)
  })

  test("logs and alerts when the export fails, then allows a new try", async () => {
    const error = new Error("print failed")
    exportMock.mockRejectedValueOnce(error).mockResolvedValue({ shared: true })
    const { result } = await renderHook(() => useSurveyPdfExport(makeArgs()))

    await act(async () => {
      await result.current.share()
    })

    expect(logMock).toHaveBeenCalledWith("surveyDetail.exportPdf", error)
    expect(alertMock).toHaveBeenCalledWith(
      fr.surveyDetail.menu.share,
      fr.surveyDetail.actions.exportFailed,
    )
    expect(result.current.exporting).toBe(false)

    await act(async () => {
      await result.current.share()
    })
    expect(exportMock).toHaveBeenCalledTimes(2)
  })

  test("exports the latest arguments", async () => {
    exportMock.mockResolvedValue({ shared: true })
    const { result, rerender } = await renderHook(
      (props: SurveyPdfExportArgs) => useSurveyPdfExport(props),
      { initialProps: makeArgs() },
    )
    const share = result.current.share

    await rerender(makeArgs({ activeSiteName: "Renommé" }))
    await act(async () => {
      await share()
    })

    expect(exportMock).toHaveBeenCalledWith(expect.objectContaining({ siteName: "Renommé" }))
  })
})
