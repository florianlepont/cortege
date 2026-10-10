import { Asset } from "expo-asset"
import { ImageManipulator } from "expo-image-manipulator"
import {
  __resetMockFileSystem,
  readAsStringAsync,
} from "../../../test/expo-file-system-legacy.mock"
import * as i18n from "../../i18n"
import {
  EXPORT_FONT_FILES,
  LOGO_EXPORT_WIDTH_PX,
  loadExportAssets,
  resetExportAssetsCache,
} from "./assets"

const fromModule = Asset.fromModule as unknown as jest.Mock
const manipulate = ImageManipulator.manipulate as unknown as jest.Mock

const FONT_NAMES = [
  "Sora-ExtraBold",
  "Sora-SemiBold",
  "Sora-Medium",
  "Sora-Light",
  "Jost-Regular",
  "Jost-SemiBold",
]

describe("survey-pdf assets", () => {
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    __resetMockFileSystem()
    readAsStringAsync.mockImplementation(() => Promise.resolve("Zm9udA=="))
    fromModule.mockClear()
    manipulate.mockClear()
    resetExportAssetsCache()
    logSpy = jest.spyOn(i18n, "logStatusDetail").mockImplementation(() => undefined)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test("lists the six charter cuts and a 240 px logo", () => {
    expect(EXPORT_FONT_FILES.map((f) => f.family)).toEqual(FONT_NAMES)
    expect(LOGO_EXPORT_WIDTH_PX).toBe(240)
  })

  test("loads the six fonts and the logo as base64", async () => {
    const assets = await loadExportAssets()
    expect(assets.fonts.map((f) => f.family)).toEqual(FONT_NAMES)
    expect(assets.fonts.every((f) => f.base64 === "Zm9udA==")).toBe(true)
    expect(assets.logoDataUri).toBe("data:image/png;base64,QUJD")
    const logoContext = manipulate.mock.results[0].value
    expect(logoContext.resize).toHaveBeenCalledWith({ width: LOGO_EXPORT_WIDTH_PX })
    const ref = await logoContext.renderAsync.mock.results[0].value
    expect(ref.saveAsync).toHaveBeenCalledWith({ format: "png", base64: true })
    expect(readAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining("file:///mock/assets/"),
      {
        encoding: "base64",
      },
    )
  })

  test("leaves a font out when its download fails, keeping the others and the logo", async () => {
    fromModule.mockImplementationOnce(() => ({
      uri: "file:///mock/assets/1",
      localUri: null,
      downloadAsync: jest.fn(() => Promise.reject(new Error("download failed"))),
    }))
    const assets = await loadExportAssets()
    expect(assets.fonts.map((f) => f.family)).toEqual(FONT_NAMES.slice(1))
    expect(assets.logoDataUri).toBe("data:image/png;base64,QUJD")
    expect(logSpy).toHaveBeenCalledWith("surveyExport.assets", expect.any(Error))
  })

  test("falls back to the asset uri when there is no local uri", async () => {
    fromModule.mockImplementationOnce(() => ({
      uri: "file:///mock/assets/remote",
      localUri: null,
      downloadAsync: jest.fn(() => Promise.resolve()),
    }))
    await loadExportAssets()
    expect(readAsStringAsync).toHaveBeenCalledWith("file:///mock/assets/remote", {
      encoding: "base64",
    })
  })

  test("leaves the logo out when its resize fails, keeping the fonts", async () => {
    manipulate.mockImplementationOnce(() => {
      throw new Error("manipulator failed")
    })
    const assets = await loadExportAssets()
    expect(assets.logoDataUri).toBeNull()
    expect(assets.fonts).toHaveLength(6)
    expect(logSpy).toHaveBeenCalledWith("surveyExport.assets", expect.any(Error))
  })

  test("leaves the logo out when the manipulator returns no base64", async () => {
    manipulate.mockImplementationOnce(() => ({
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn(() =>
        Promise.resolve({ saveAsync: jest.fn(() => Promise.resolve({ uri: "file:///x.png" })) }),
      ),
    }))
    const assets = await loadExportAssets()
    expect(assets.logoDataUri).toBeNull()
    expect(assets.fonts).toHaveLength(6)
  })

  test("reuses the first result and re-reads after a reset", async () => {
    const first = await loadExportAssets()
    const second = await loadExportAssets()
    expect(second).toBe(first)
    expect(fromModule).toHaveBeenCalledTimes(7)

    resetExportAssetsCache()
    await loadExportAssets()
    expect(fromModule).toHaveBeenCalledTimes(14)
  })
})
