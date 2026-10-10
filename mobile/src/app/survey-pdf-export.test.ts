import * as FileSystem from "expo-file-system/legacy"
import { __resetMockFileSystem, __setMockFile } from "../../test/expo-file-system-legacy.mock"
import { exportFixtureV32Submitted } from "../../test/survey-export-fixtures"
import * as facade from "./survey-pdf-export"
import { buildSurveyExportHtml as buildHtml } from "./survey-pdf/build-html"
import { exportAndShareSurveyPdf, shareSurveyExportPdf } from "./survey-pdf/run-export"
import type { RunExportDeps } from "./survey-pdf/run-export"
import type { SurveyExportInput } from "./survey-pdf/types"

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }))
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }))

const PRINTED = "file:///mock/cache/Print/abc.pdf"

const INPUT: SurveyExportInput = {
  surveyId: "survey-v32",
  siteName: exportFixtureV32Submitted.siteName,
  parcelIds: [],
  observationYear: 2026,
  versionNumber: 2,
  dateIso: exportFixtureV32Submitted.dateIso,
  isDraft: false,
  observerName: null,
  displayLocation: null,
  method: exportFixtureV32Submitted.method,
  scores: exportFixtureV32Submitted.scores,
  factorEntries: exportFixtureV32Submitted.factorEntries,
  apiUrl: "https://api.example.test/v1",
  accessToken: "secret-token",
}

beforeEach(() => {
  __resetMockFileSystem()
})

describe("survey-pdf-export facade", () => {
  test("re-exports the functions of the new pipeline, not copies", () => {
    expect(facade.exportAndShareSurveyPdf).toBe(exportAndShareSurveyPdf)
    expect(facade.shareSurveyExportPdf).toBe(shareSurveyExportPdf)
    expect(facade.buildSurveyExportHtml).toBe(buildHtml)
  })

  test("exports nothing else: the old builder and its private escape are gone", () => {
    expect(Object.keys(facade).sort()).toEqual([
      "buildSurveyExportHtml",
      "exportAndShareSurveyPdf",
      "shareSurveyExportPdf",
    ])
  })

  test("generates then shares, with no network call", async () => {
    const fetchSpy = jest.fn()
    const original = global.fetch
    global.fetch = fetchSpy as unknown as typeof fetch
    const print = jest.fn(async () => {
      __setMockFile(PRINTED, 2048)
      return { uri: PRINTED }
    })
    const shareAsync = jest.fn(async () => undefined)
    const deps: RunExportDeps = {
      print,
      sharing: { isAvailableAsync: async () => true, shareAsync },
      fileSystem: FileSystem,
      assemble: async () => exportFixtureV32Submitted,
      platform: "android",
      now: () => new Date("2026-10-10T12:00:00.000Z"),
    }
    try {
      const result = await facade.exportAndShareSurveyPdf(INPUT, deps)

      expect(result).toEqual({ shared: true })
      expect(print).toHaveBeenCalledTimes(1)
      expect(shareAsync).toHaveBeenCalledWith(
        expect.stringContaining("/exports/"),
        expect.objectContaining({ mimeType: "application/pdf" }),
      )
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      global.fetch = original
    }
  })
})
