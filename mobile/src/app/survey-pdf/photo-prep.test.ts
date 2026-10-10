import { ImageManipulator } from "expo-image-manipulator"
import { __setMockImageSize } from "../../../test/expo-image-manipulator.mock"
import * as i18n from "../../i18n"
import { preparePhotosForExport, type PhotoExportSettings } from "./photo-prep"

const manipulate = ImageManipulator.manipulate as unknown as jest.Mock

const SETTINGS: PhotoExportSettings = { cap: 10, longEdgePx: 800, jpegQuality: 0.65 }

function source(n: number): { id: string; uri: string } {
  return { id: `p${n}`, uri: `file:///photos/${n}.jpg` }
}

describe("preparePhotosForExport", () => {
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    manipulate.mockClear()
    __setMockImageSize(4032, 3024)
    logSpy = jest.spyOn(i18n, "logStatusDetail").mockImplementation(() => undefined)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test("resizes a large photo to the long edge and saves it as a JPEG data URI", async () => {
    const result = await preparePhotosForExport([source(1)], SETTINGS)
    expect(result.failed).toBe(0)
    expect(result.capped).toBe(0)
    expect(result.photos).toEqual([
      { id: "p1", dataUri: "data:image/jpeg;base64,QUJD", width: 800, height: 600 },
    ])
    const resizeContext = manipulate.mock.results[1].value
    expect(resizeContext.resize).toHaveBeenCalledWith({ width: 800 })
    const ref = await resizeContext.renderAsync.mock.results[0].value
    expect(ref.saveAsync).toHaveBeenCalledWith({ format: "jpeg", compress: 0.65, base64: true })
  })

  test("resizes a portrait photo on its height", async () => {
    __setMockImageSize(3024, 4032)
    const result = await preparePhotosForExport([source(1)], SETTINGS)
    expect(manipulate.mock.results[1].value.resize).toHaveBeenCalledWith({ height: 800 })
    expect(result.photos[0]).toMatchObject({ width: 600, height: 800 })
  })

  test("does not resize a photo already within the long edge", async () => {
    __setMockImageSize(600, 400)
    const result = await preparePhotosForExport([source(1)], SETTINGS)
    expect(manipulate).toHaveBeenCalledTimes(1)
    expect(manipulate.mock.results[0].value.resize).not.toHaveBeenCalled()
    expect(result.photos).toEqual([
      { id: "p1", dataUri: "data:image/jpeg;base64,QUJD", width: 600, height: 400 },
    ])
  })

  test("keeps the input order and reports how many sources the cap left out", async () => {
    const sources = [1, 2, 3, 4, 5].map(source)
    const result = await preparePhotosForExport(sources, { ...SETTINGS, cap: 3 })
    expect(result.photos.map((p) => p.id)).toEqual(["p1", "p2", "p3"])
    expect(result.capped).toBe(2)
    expect(result.failed).toBe(0)
  })

  test("skips a failing photo, counts it and still prepares the next one", async () => {
    manipulate.mockImplementationOnce(() => {
      throw new Error("decode failed")
    })
    const result = await preparePhotosForExport([source(1), source(2)], SETTINGS)
    expect(result.photos.map((p) => p.id)).toEqual(["p2"])
    expect(result.failed).toBe(1)
    expect(logSpy).toHaveBeenCalledWith("surveyExport.photo", expect.any(Error))
  })

  test("counts a save without base64 as failed", async () => {
    manipulate.mockImplementationOnce(() => ({
      renderAsync: jest.fn(() =>
        Promise.resolve({
          width: 100,
          height: 100,
          saveAsync: jest.fn(() =>
            Promise.resolve({ uri: "file:///x.jpg", width: 100, height: 100 }),
          ),
        }),
      ),
    }))
    const result = await preparePhotosForExport([source(1)], SETTINGS)
    expect(result.photos).toEqual([])
    expect(result.failed).toBe(1)
  })

  test("prepares photos one at a time", async () => {
    const events: string[] = []
    let releaseFirstSave: () => void = () => undefined
    const firstSaved = new Promise<void>((resolve) => {
      releaseFirstSave = resolve
    })
    let call = 0
    const nextContext = () => {
      call += 1
      const id = call
      events.push(`manipulate ${id}`)
      return {
        renderAsync: jest.fn(() =>
          Promise.resolve({
            width: 100,
            height: 100,
            saveAsync: jest.fn(async () => {
              if (id === 1) await firstSaved
              events.push(`saved ${id}`)
              return { uri: `file:///${id}.jpg`, width: 100, height: 100, base64: "QUJD" }
            }),
          }),
        ),
      }
    }
    manipulate.mockImplementationOnce(nextContext).mockImplementationOnce(nextContext)
    const done = preparePhotosForExport([source(1), source(2)], SETTINGS)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events).toEqual(["manipulate 1"])
    releaseFirstSave()
    const result = await done
    expect(events).toEqual(["manipulate 1", "saved 1", "manipulate 2", "saved 2"])
    expect(result.photos).toHaveLength(2)
  })
})
