import { fr } from "../i18n"
import {
  buildSurveyExportHtml,
  exportAndShareSurveyPdf,
  generateSurveyExportPdf,
  shareSurveyExportPdf,
  SurveyExportData,
} from "./survey-pdf-export"

// Mirrors useLocalDraftSummary's NOT_FILLED_CLASS sentinel, without importing that hook's
// storage/react-native dependency chain into this otherwise dependency-free unit test.
const NOT_FILLED_CLASS = "Not filled"

const t = fr.surveyExport

const mockPrintToFileAsync = jest.fn()
jest.mock("expo-print", () => ({
  printToFileAsync: (...args: unknown[]) => mockPrintToFileAsync(...args),
}))

const mockIsAvailableAsync = jest.fn()
const mockShareAsync = jest.fn()
jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}))

const fullData: SurveyExportData = {
  siteName: "Bois de la Colline",
  parcelIds: ["12345000AB0123", "12345000AB0124"],
  observationYear: 2026,
  versionNumber: 2,
  methodVersion: "3.2",
  dateIso: "2026-09-26T10:00:00.000Z",
  scores: { ibp_total: 18, ibp_peuplement_gestion: 6, ibp_contexte: 12 },
  factorEntries: [
    ["A", { selected_class: "S2", warnings: [] }],
    ["B", { selected_class: NOT_FILLED_CLASS, warnings: [] }],
  ],
}

const emptyData: SurveyExportData = {
  siteName: "Parcelle sans nom",
  parcelIds: [],
  observationYear: null,
  versionNumber: null,
  methodVersion: null,
  dateIso: "not-a-date",
  scores: null,
  factorEntries: [],
}

beforeEach(() => {
  mockPrintToFileAsync.mockReset()
  mockIsAvailableAsync.mockReset()
  mockShareAsync.mockReset()
})

describe("buildSurveyExportHtml", () => {
  test("includes the survey's identifying data, factor scores and IBP total", () => {
    const html = buildSurveyExportHtml(fullData)

    expect(html).toContain(t.documentTitle(fullData.siteName))
    expect(html).toContain("12345000AB0123, 12345000AB0124")
    expect(html).toContain("2026")
    expect(html).toContain(">2</td>")
    expect(html).toContain("3.2")
    expect(html).toContain(t.scores.total(18))
    expect(html).toContain("S2")
    expect(html).toContain(t.scores.notFilled)
  })

  test("falls back to placeholders when nothing is available locally", () => {
    const html = buildSurveyExportHtml(emptyData)

    expect(html).toContain(t.identity.noParcel)
    expect(html.match(new RegExp(t.identity.unknown, "g"))?.length).toBeGreaterThanOrEqual(3)
    expect(html).toContain(t.scores.notFilled)
  })

  test("escapes site names containing HTML-sensitive characters", () => {
    const html = buildSurveyExportHtml({ ...emptyData, siteName: `<b>"Bois" & Cie</b>` })
    expect(html).not.toContain(`<b>"Bois"`)
    expect(html).toContain("&lt;b&gt;&quot;Bois&quot; &amp; Cie&lt;/b&gt;")
  })
})

describe("generateSurveyExportPdf", () => {
  test("renders the HTML through expo-print and returns the file uri", async () => {
    mockPrintToFileAsync.mockResolvedValue({ uri: "file://survey.pdf" })

    const uri = await generateSurveyExportPdf(fullData)

    expect(uri).toBe("file://survey.pdf")
    expect(mockPrintToFileAsync).toHaveBeenCalledWith({
      html: expect.stringContaining(fullData.siteName),
      base64: false,
    })
  })
})

describe("shareSurveyExportPdf", () => {
  test("shares the file when a share target is available", async () => {
    mockIsAvailableAsync.mockResolvedValue(true)
    mockShareAsync.mockResolvedValue(undefined)

    const shared = await shareSurveyExportPdf("file://survey.pdf", "Bois")

    expect(shared).toBe(true)
    expect(mockShareAsync).toHaveBeenCalledWith("file://survey.pdf", {
      mimeType: "application/pdf",
      dialogTitle: t.shareDialogTitle("Bois"),
      UTI: "com.adobe.pdf",
    })
  })

  test("skips sharing and returns false when no share target exists", async () => {
    mockIsAvailableAsync.mockResolvedValue(false)

    const shared = await shareSurveyExportPdf("file://survey.pdf", "Bois")

    expect(shared).toBe(false)
    expect(mockShareAsync).not.toHaveBeenCalled()
  })
})

describe("exportAndShareSurveyPdf", () => {
  test("generates the PDF then hands it to the share sheet, with no network call", async () => {
    mockPrintToFileAsync.mockResolvedValue({ uri: "file://survey.pdf" })
    mockIsAvailableAsync.mockResolvedValue(true)
    mockShareAsync.mockResolvedValue(undefined)

    const result = await exportAndShareSurveyPdf(fullData)

    expect(result).toEqual({ shared: true })
    expect(mockShareAsync).toHaveBeenCalledWith("file://survey.pdf", expect.any(Object))
  })
})
