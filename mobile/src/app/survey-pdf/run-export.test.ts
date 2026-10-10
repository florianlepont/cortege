import * as FileSystem from "expo-file-system/legacy"
import {
  __getMockFile,
  __listMockFiles,
  __resetMockFileSystem,
  __setMockFile,
} from "../../../test/expo-file-system-legacy.mock"
import { exportFixtureV32Submitted } from "../../../test/survey-export-fixtures"
import { fr } from "../../i18n"
import { initLocalDb } from "../../storage/db"
import type { SurveyExportInput } from "./types"
import { assembleSurveyExportData, type AssembleDeps } from "./assemble-export-data"
import { buildSurveyExportHtml } from "./build-html"
import { buildExportFileName } from "./file-name"
import {
  cleanStaleExports,
  defaultRunExportDeps,
  EXPORTS_DIR_NAME,
  exportAndShareSurveyPdf,
  moveToExportName,
  printSurveyPdf,
  shareSurveyExportPdf,
  STALE_EXPORT_MS,
  type RunExportDeps,
} from "./run-export"

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

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

const mockLogStatusDetail = jest.fn()
jest.mock("../../i18n", () => ({
  ...jest.requireActual("../../i18n"),
  logStatusDetail: (...args: unknown[]) => mockLogStatusDetail(...args),
}))

const CACHE = "file:///mock/cache/"
const EXPORTS = `${CACHE}${EXPORTS_DIR_NAME}`
const PRINTED = "file:///mock/cache/Print/abc.pdf"
const NOW = new Date("2026-10-10T12:00:00.000Z")
const NAME = buildExportFileName({
  siteName: exportFixtureV32Submitted.siteName,
  observationYear: exportFixtureV32Submitted.observationYear,
  dateIso: exportFixtureV32Submitted.dateIso,
  isDraft: exportFixtureV32Submitted.isDraft,
})

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

const expectedPages = buildSurveyExportHtml(exportFixtureV32Submitted).pageCount

function runDeps(overrides: Partial<RunExportDeps> = {}): RunExportDeps {
  return {
    print: (options) => mockPrintToFileAsync(options),
    sharing: {
      isAvailableAsync: () => mockIsAvailableAsync(),
      shareAsync: (uri, options) => mockShareAsync(uri, options),
    },
    fileSystem: FileSystem,
    assemble: jest.fn(async () => exportFixtureV32Submitted),
    platform: "ios",
    now: () => NOW,
    ...overrides,
  }
}

const modifiedAt = new Map<string, number>()

/** Seeds a file of the exports folder last modified `ageMs` before NOW. */
function seedExport(name: string, ageMs: number): string {
  const uri = `${EXPORTS}${name}`
  __setMockFile(uri, 100)
  modifiedAt.set(uri, NOW.getTime() - ageMs)
  return uri
}

beforeEach(() => {
  __resetMockFileSystem()
  mockPrintToFileAsync.mockReset().mockImplementation(async () => {
    __setMockFile(PRINTED, 2048)
    return { uri: PRINTED, numberOfPages: expectedPages }
  })
  mockIsAvailableAsync.mockReset().mockResolvedValue(true)
  mockShareAsync.mockReset().mockResolvedValue(undefined)
  mockLogStatusDetail.mockReset()
  modifiedAt.clear()
  const defaultInfo = (FileSystem.getInfoAsync as jest.Mock).getMockImplementation()
  ;(FileSystem.getInfoAsync as jest.Mock).mockImplementation(async (uri: string) => {
    const info = await defaultInfo?.(uri)
    const at = modifiedAt.get(uri)
    return at === undefined ? info : { ...info, modificationTime: at / 1000 }
  })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("constants", () => {
  test("the folder is exports/ and an export is stale after one hour", () => {
    expect(EXPORTS_DIR_NAME).toBe("exports/")
    expect(STALE_EXPORT_MS).toBe(3600000)
  })
})

describe("printSurveyPdf", () => {
  test("prints A4 with zero margins and returns the file and the page count", async () => {
    mockPrintToFileAsync.mockResolvedValue({ uri: PRINTED, numberOfPages: 3 })

    const result = await printSurveyPdf("<html></html>", runDeps())

    expect(mockPrintToFileAsync).toHaveBeenCalledWith({
      html: "<html></html>",
      width: 595,
      height: 842,
      margins: { left: 0, top: 0, right: 0, bottom: 0 },
    })
    expect(result).toEqual({ uri: PRINTED, numberOfPages: 3 })
  })

  test("rejects when the print fails", async () => {
    mockPrintToFileAsync.mockRejectedValue(new Error("print failed"))

    await expect(printSurveyPdf("<html></html>", runDeps())).rejects.toThrow("print failed")
  })
})

describe("moveToExportName", () => {
  test("makes the folder, deletes the target idempotently, then moves the file", async () => {
    __setMockFile(PRINTED, 2048)
    const order: string[] = []
    ;(FileSystem.makeDirectoryAsync as jest.Mock).mockImplementation(async () => {
      order.push("mkdir")
    })
    ;(FileSystem.deleteAsync as jest.Mock).mockImplementation(async () => {
      order.push("delete")
    })
    ;(FileSystem.moveAsync as jest.Mock).mockImplementation(async () => {
      order.push("move")
    })

    const uri = await moveToExportName(PRINTED, "Cortege-IBP-Bois.pdf", runDeps())

    expect(uri).toBe(`${EXPORTS}Cortege-IBP-Bois.pdf`)
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(EXPORTS, { intermediates: true })
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(`${EXPORTS}Cortege-IBP-Bois.pdf`, {
      idempotent: true,
    })
    expect(FileSystem.moveAsync).toHaveBeenCalledWith({
      from: PRINTED,
      to: `${EXPORTS}Cortege-IBP-Bois.pdf`,
    })
    expect(order).toEqual(["mkdir", "delete", "move"])
  })

  test("replaces a file of the same name", async () => {
    __setMockFile(PRINTED, 2048)
    __setMockFile(`${EXPORTS}same.pdf`, 1)

    await moveToExportName(PRINTED, "same.pdf", runDeps())

    expect(__getMockFile(`${EXPORTS}same.pdf`)?.size).toBe(2048)
    expect(__getMockFile(PRINTED)).toBeUndefined()
  })

  test("fails without a cache directory", async () => {
    const deps = runDeps({ fileSystem: { ...FileSystem, cacheDirectory: null } })

    await expect(moveToExportName(PRINTED, "x.pdf", deps)).rejects.toThrow("no cache directory")
  })
})

describe("cleanStaleExports", () => {
  test("deletes only the files modified more than an hour before now", async () => {
    const old = seedExport("old.pdf", STALE_EXPORT_MS + 1000)
    const fresh = seedExport("fresh.pdf", 5 * 60 * 1000)
    const edge = seedExport("edge.pdf", STALE_EXPORT_MS)

    await cleanStaleExports(NOW, runDeps())

    expect(__listMockFiles()).toEqual(expect.arrayContaining([fresh, edge]))
    expect(__listMockFiles()).not.toContain(old)
  })

  test("skips a file that is already gone", async () => {
    ;(FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(["ghost.pdf"])
    ;(FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false })

    await cleanStaleExports(NOW, runDeps())

    expect(FileSystem.deleteAsync).not.toHaveBeenCalled()
  })

  test("swallows a listing error", async () => {
    ;(FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValue(new Error("no folder"))

    await expect(cleanStaleExports(NOW, runDeps())).resolves.toBeUndefined()
  })

  test("swallows the error of one file and goes on with the next", async () => {
    ;(FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(["bad.pdf", "old.pdf"])
    ;(FileSystem.getInfoAsync as jest.Mock)
      .mockRejectedValueOnce(new Error("stat"))
      .mockResolvedValueOnce({ exists: true, modificationTime: 0 })

    await cleanStaleExports(NOW, runDeps())

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1)
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(`${EXPORTS}old.pdf`, { idempotent: true })
  })

  test("swallows the absence of a cache directory", async () => {
    const deps = runDeps({ fileSystem: { ...FileSystem, cacheDirectory: null } })

    await expect(cleanStaleExports(NOW, deps)).resolves.toBeUndefined()
  })
})

describe("shareSurveyExportPdf", () => {
  test("opens the share sheet for a PDF and returns true", async () => {
    const shared = await shareSurveyExportPdf("file:///x.pdf", "Bois", runDeps())

    expect(shared).toBe(true)
    expect(mockShareAsync).toHaveBeenCalledWith("file:///x.pdf", {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: t.shareDialogTitle("Bois"),
    })
  })

  test("returns false when nothing can receive the file", async () => {
    mockIsAvailableAsync.mockResolvedValue(false)

    expect(await shareSurveyExportPdf("file:///x.pdf", "Bois", runDeps())).toBe(false)
    expect(mockShareAsync).not.toHaveBeenCalled()
  })
})

describe("exportAndShareSurveyPdf", () => {
  test("cleans, assembles, prints, renames and shares the named file", async () => {
    const stale = seedExport("stale.pdf", STALE_EXPORT_MS + 1)
    const deps = runDeps()

    const result = await exportAndShareSurveyPdf(INPUT, deps)

    expect(result).toEqual({ shared: true })
    expect(deps.assemble).toHaveBeenCalledWith(INPUT)
    expect(mockPrintToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ width: 595, height: 842 }),
    )
    expect(NAME).toBe("Cortege-IBP-Bois-de-la-Colline-2026.pdf")
    expect(__listMockFiles()).not.toContain(stale)
    expect(__getMockFile(`${EXPORTS}${NAME}`)?.size).toBe(2048)
    expect(mockShareAsync).toHaveBeenCalledWith(`${EXPORTS}${NAME}`, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: t.shareDialogTitle(exportFixtureV32Submitted.siteName),
    })
  })

  test("removes stale exports before the new one is made and keeps the shared file", async () => {
    const order: string[] = []
    const stale = seedExport("stale.pdf", STALE_EXPORT_MS + 1)
    const base = (FileSystem.deleteAsync as jest.Mock).getMockImplementation()
    ;(FileSystem.deleteAsync as jest.Mock).mockImplementation(async (uri: string, options) => {
      order.push(`delete:${uri === stale ? "stale" : "target"}`)
      return base?.(uri, options)
    })
    mockPrintToFileAsync.mockImplementation(async () => {
      order.push("print")
      __setMockFile(PRINTED, 2048)
      return { uri: PRINTED, numberOfPages: expectedPages }
    })
    mockShareAsync.mockImplementation(async () => {
      order.push("share")
    })

    await exportAndShareSurveyPdf(INPUT, runDeps())

    expect(order).toEqual(["delete:stale", "print", "delete:target", "share"])
    expect(__listMockFiles()).toContain(`${EXPORTS}${NAME}`)
  })

  test("returns shared false, with the file generated, when there is no share target", async () => {
    mockIsAvailableAsync.mockResolvedValue(false)

    const result = await exportAndShareSurveyPdf(INPUT, runDeps())

    expect(result).toEqual({ shared: false })
    expect(__listMockFiles()).toContain(`${EXPORTS}${NAME}`)
  })

  test("names a draft with its suffix", async () => {
    const draft = { ...exportFixtureV32Submitted, isDraft: true }

    await exportAndShareSurveyPdf(INPUT, runDeps({ assemble: async () => draft }))

    expect(__listMockFiles()).toContain(
      `${EXPORTS}Cortege-IBP-Bois-de-la-Colline-2026-brouillon.pdf`,
    )
  })

  test("logs once, on iOS, when the page count differs", async () => {
    mockPrintToFileAsync.mockImplementation(async () => {
      __setMockFile(PRINTED, 2048)
      return { uri: PRINTED, numberOfPages: expectedPages + 5 }
    })

    await exportAndShareSurveyPdf(INPUT, runDeps({ platform: "ios" }))

    const pageLogs = mockLogStatusDetail.mock.calls.filter(
      ([context]) => context === "surveyExport.pageCount",
    )
    expect(pageLogs).toHaveLength(1)
    expect(pageLogs[0][1]).toEqual({ built: expectedPages, printed: expectedPages + 5 })
  })

  test("does not compare the page count on Android and not when it matches on iOS", async () => {
    mockPrintToFileAsync.mockImplementation(async () => {
      __setMockFile(PRINTED, 2048)
      return { uri: PRINTED, numberOfPages: 99 }
    })

    await exportAndShareSurveyPdf(INPUT, runDeps({ platform: "android" }))
    mockPrintToFileAsync.mockImplementation(async () => {
      __setMockFile(PRINTED, 2048)
      return { uri: PRINTED, numberOfPages: expectedPages }
    })
    await exportAndShareSurveyPdf(INPUT, runDeps({ platform: "ios" }))

    expect(
      mockLogStatusDetail.mock.calls.filter(([context]) => context === "surveyExport.pageCount"),
    ).toEqual([])
  })

  test("rejects when the print fails, and shares nothing", async () => {
    mockPrintToFileAsync.mockRejectedValue(new Error("print failed"))

    await expect(exportAndShareSurveyPdf(INPUT, runDeps())).rejects.toThrow("print failed")
    expect(mockShareAsync).not.toHaveBeenCalled()
  })

  test("rejects when the share fails, and keeps the file", async () => {
    mockShareAsync.mockRejectedValue(new Error("share failed"))

    await expect(exportAndShareSurveyPdf(INPUT, runDeps())).rejects.toThrow("share failed")
    // Only the delete before the move: nothing removes the file once it is shared.
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1)
    expect(__listMockFiles()).toContain(`${EXPORTS}${NAME}`)
  })

  test("makes no network call offline, with fake loaders, during the whole flow", async () => {
    const fetchSpy = jest.fn()
    const original = global.fetch
    global.fetch = fetchSpy as unknown as typeof fetch
    const loaders: AssembleDeps = {
      platform: "ios",
      now: () => NOW,
      isOnline: async () => false,
      loadDraft: async () => ({ factors: { A: { native_genus_count: 3 } } }),
      listPhotos: async () => [],
      preparePhotos: async () => ({ photos: [], failed: 0, capped: 0 }),
      loadAssets: async () => ({ fonts: [], logoDataUri: null }),
      getCachedParcel: async () => null,
      fetchParcelStatuses: fetchSpy as unknown as AssembleDeps["fetchParcelStatuses"],
      decideBasemap: async () => ({ kind: "none" }),
      takeBasemap: async () => null,
      loadHistory: async () => null,
    }
    try {
      const result = await exportAndShareSurveyPdf(
        { ...INPUT, parcelIds: ["77186000AB0123"], displayLocation: { lat: 48.4, lng: 2.7 } },
        runDeps({ assemble: (input) => assembleSurveyExportData(input, loaders) }),
      )

      expect(result).toEqual({ shared: true })
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      global.fetch = original
    }
  })
})

describe("defaultRunExportDeps", () => {
  test("wires the native modules and maps the platform", async () => {
    const deps = defaultRunExportDeps()

    expect(deps.platform).toBe("ios")
    expect(deps.now()).toBeInstanceOf(Date)
    expect(deps.fileSystem).toBe(FileSystem)
    mockPrintToFileAsync.mockResolvedValue({ uri: PRINTED, numberOfPages: 1 })
    await deps.print({
      html: "<p></p>",
      width: 595,
      height: 842,
      margins: { left: 0, top: 0, right: 0, bottom: 0 },
    })
    expect(mockPrintToFileAsync).toHaveBeenCalledTimes(1)
    await deps.sharing.isAvailableAsync()
    expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1)
  })

  test("assembles with the real loader, whatever the storage holds", async () => {
    await initLocalDb()

    const data = await defaultRunExportDeps().assemble(INPUT)

    expect(data.surveyId).toBe("survey-v32")
    expect(data.photos.total).toBe(0)
  })
})
