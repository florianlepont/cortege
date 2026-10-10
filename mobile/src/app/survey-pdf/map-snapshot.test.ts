import { PLAN_IGN_STYLE_URL } from "../../map/maplibre/styles"
import { offlineStyleUri } from "../../map/offline-styles"
import {
  withoutSprite,
  SNAPSHOT_JPEG_QUALITY,
  SNAPSHOT_JPEG_WIDTH_PX,
  SNAPSHOT_TIMEOUT_MS,
  SNAPSHOT_TIMEOUT_ONLINE_MS,
  snapshotTimeoutFor,
  decideBasemap,
  defaultBasemapDeps,
  takeBasemapJpeg,
} from "./map-snapshot"
import type { MapFrame } from "./map-projection"

const CENTER = { lat: 48.4, lng: 2.7 }
const DIR = "file:///docs/"

type Deps = Parameters<typeof decideBasemap>[1]

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    isOnline: true,
    documentDirectory: DIR,
    findReadyOfflineAreaForPoint: jest.fn(async () => ({ id: "area-1" })),
    offlineStyleExists: jest.fn(async () => true),
    offlineStyleUri,
    onlineStyle: PLAN_IGN_STYLE_URL,
    ...overrides,
  } as Deps
}

describe("decideBasemap", () => {
  test("a ready area with the light style file gives the offline style, online or not", async () => {
    for (const isOnline of [true, false]) {
      const deps = makeDeps({ isOnline })
      await expect(decideBasemap(CENTER, deps)).resolves.toEqual({
        kind: "offline",
        mapStyle: offlineStyleUri(DIR, "map", false),
      })
      expect(deps.findReadyOfflineAreaForPoint).toHaveBeenCalledWith(48.4, 2.7)
      expect(deps.offlineStyleExists).toHaveBeenCalledWith(DIR, "map", false)
    }
  })

  test("the offline style is the light one, never dark nor satellite", async () => {
    const choice = await decideBasemap(CENTER, makeDeps())
    expect(choice.kind === "none" ? "" : choice.mapStyle).toMatch(/\/map\.json$/)
  })

  test("no area under the centre gives the online style when online", async () => {
    const deps = makeDeps({ findReadyOfflineAreaForPoint: jest.fn(async () => null) })
    await expect(decideBasemap(CENTER, deps)).resolves.toEqual({
      kind: "online",
      mapStyle: PLAN_IGN_STYLE_URL,
    })
  })

  test("a missing style file gives the online style when online", async () => {
    const deps = makeDeps({ offlineStyleExists: jest.fn(async () => false) })
    await expect(decideBasemap(CENTER, deps)).resolves.toEqual({
      kind: "online",
      mapStyle: PLAN_IGN_STYLE_URL,
    })
  })

  test("offline without a usable area gives no basemap", async () => {
    const noArea = makeDeps({
      isOnline: false,
      findReadyOfflineAreaForPoint: jest.fn(async () => null),
    })
    await expect(decideBasemap(CENTER, noArea)).resolves.toEqual({ kind: "none" })
    const noFile = makeDeps({ isOnline: false, offlineStyleExists: jest.fn(async () => false) })
    await expect(decideBasemap(CENTER, noFile)).resolves.toEqual({ kind: "none" })
  })

  test("a null document directory offline gives no basemap, online gives the online style", async () => {
    await expect(
      decideBasemap(CENTER, makeDeps({ documentDirectory: null, isOnline: false })),
    ).resolves.toEqual({ kind: "none" })
    const online = makeDeps({ documentDirectory: null })
    await expect(decideBasemap(CENTER, online)).resolves.toEqual({
      kind: "online",
      mapStyle: PLAN_IGN_STYLE_URL,
    })
    expect(online.findReadyOfflineAreaForPoint).not.toHaveBeenCalled()
  })

  test("a lookup that throws is treated as no area", async () => {
    const failing = jest.fn(async () => {
      throw new Error("db closed")
    })
    await expect(
      decideBasemap(CENTER, makeDeps({ findReadyOfflineAreaForPoint: failing })),
    ).resolves.toEqual({ kind: "online", mapStyle: PLAN_IGN_STYLE_URL })
    await expect(
      decideBasemap(CENTER, makeDeps({ findReadyOfflineAreaForPoint: failing, isOnline: false })),
    ).resolves.toEqual({ kind: "none" })
    const styleThrows = makeDeps({
      isOnline: false,
      offlineStyleExists: jest.fn(async () => {
        throw new Error("fs")
      }),
    })
    await expect(decideBasemap(CENTER, styleThrows)).resolves.toEqual({ kind: "none" })
  })
})

describe("defaultBasemapDeps", () => {
  test("wires the online flag and the Plan IGN style", () => {
    const deps = defaultBasemapDeps(false)
    expect(deps.isOnline).toBe(false)
    expect(deps.onlineStyle).toBe(PLAN_IGN_STYLE_URL)
    expect(typeof deps.findReadyOfflineAreaForPoint).toBe("function")
    expect(typeof deps.offlineStyleExists).toBe("function")
    expect(deps.offlineStyleUri).toBe(offlineStyleUri)
  })
})

describe("takeBasemapJpeg", () => {
  const frame: MapFrame = { centerLng: 2.7, centerLat: 48.4, zoom: 15, width: 520, height: 320 }
  const input = { mapStyle: "file:///docs/offline-styles/map.json", frame }

  type FakeContext = { resize: jest.Mock; renderAsync: jest.Mock }

  function makeManipulator(saved: () => Promise<{ base64?: string }>) {
    const saveAsync = jest.fn(saved)
    const context: FakeContext = {
      resize: jest.fn(),
      renderAsync: jest.fn(async () => ({ saveAsync })),
    }
    context.resize.mockReturnValue(context)
    return { context, saveAsync, manipulator: { manipulate: jest.fn(() => context) } }
  }

  afterEach(() => {
    jest.useRealTimers()
  })

  test("asks the snapshot for the frame, then resizes to a JPEG data URI", async () => {
    const createImage = jest.fn(async () => "file:///cache/snap.png")
    const { context, manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage },
      ImageManipulator: manipulator,
    } as never)
    expect(createImage).toHaveBeenCalledWith({
      mapStyle: input.mapStyle,
      center: [2.7, 48.4],
      zoom: 15,
      width: 520,
      height: 320,
      output: "file",
      logo: false,
    })
    expect(manipulator.manipulate).toHaveBeenCalledWith("file:///cache/snap.png")
    expect(context.resize).toHaveBeenCalledWith({ width: SNAPSHOT_JPEG_WIDTH_PX })
    expect(result).toEqual({ dataUri: "data:image/jpeg;base64,QUJD", frame })
  })

  test("saves a JPEG at the snapshot quality, with base64", async () => {
    const { saveAsync, manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
      ImageManipulator: manipulator,
    } as never)
    expect(saveAsync).toHaveBeenCalledWith({
      format: "jpeg",
      compress: SNAPSHOT_JPEG_QUALITY,
      base64: true,
    })
  })

  test("a rejected snapshot gives no image", async () => {
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: {
        createImage: jest.fn(async () => {
          throw new Error("createImage")
        }),
      },
      ImageManipulator: manipulator,
    } as never)
    expect(result).toBeNull()
    expect(manipulator.manipulate).not.toHaveBeenCalled()
  })

  test("a snapshot that never settles gives no image after the timeout and leaves no timer", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const pending = takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(() => new Promise<string>(() => {})) },
      ImageManipulator: manipulator,
    } as never)
    await jest.advanceTimersByTimeAsync(SNAPSHOT_TIMEOUT_MS)
    await expect(pending).resolves.toBeNull()
    expect(jest.getTimerCount()).toBe(0)
    expect(manipulator.manipulate).not.toHaveBeenCalled()
  })

  test("the timeout is 8 s for the offline style and 12 s for the online style", () => {
    expect(SNAPSHOT_TIMEOUT_MS).toBe(8000)
    expect(SNAPSHOT_TIMEOUT_ONLINE_MS).toBe(12000)
    expect(snapshotTimeoutFor("offline")).toBe(8000)
    expect(snapshotTimeoutFor(undefined)).toBe(8000)
    expect(snapshotTimeoutFor("online")).toBe(12000)
  })

  test("an online snapshot is still waited for after 8 s and given up at 12 s", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    let settled = false
    const pending = takeBasemapJpeg({ ...input, kind: "online" }, {
      StaticMapImageManager: { createImage: jest.fn(() => new Promise<string>(() => {})) },
      ImageManipulator: manipulator,
    } as never).then((result) => {
      settled = true
      return result
    })
    await jest.advanceTimersByTimeAsync(SNAPSHOT_TIMEOUT_MS)
    expect(settled).toBe(false)
    await jest.advanceTimersByTimeAsync(SNAPSHOT_TIMEOUT_ONLINE_MS - SNAPSHOT_TIMEOUT_MS)
    await expect(pending).resolves.toBeNull()
    expect(jest.getTimerCount()).toBe(0)
  })

  test("an offline snapshot is given up at 8 s", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const pending = takeBasemapJpeg({ ...input, kind: "offline" }, {
      StaticMapImageManager: { createImage: jest.fn(() => new Promise<string>(() => {})) },
      ImageManipulator: manipulator,
    } as never)
    await jest.advanceTimersByTimeAsync(SNAPSHOT_TIMEOUT_MS)
    await expect(pending).resolves.toBeNull()
  })

  test("a snapshot that settles in time clears its timer", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
      ImageManipulator: manipulator,
    } as never)
    expect(result).not.toBeNull()
    expect(jest.getTimerCount()).toBe(0)
  })

  test("the timeout can be shortened", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const pending = takeBasemapJpeg({ ...input, timeoutMs: 100 }, {
      StaticMapImageManager: { createImage: jest.fn(() => new Promise<string>(() => {})) },
      ImageManipulator: manipulator,
    } as never)
    await jest.advanceTimersByTimeAsync(100)
    await expect(pending).resolves.toBeNull()
  })

  test("a failing JPEG conversion gives no image", async () => {
    const { manipulator } = makeManipulator(async () => {
      throw new Error("save")
    })
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
      ImageManipulator: manipulator,
    } as never)
    expect(result).toBeNull()
  })

  test("a conversion without base64 gives no image", async () => {
    const { manipulator } = makeManipulator(async () => ({}))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
      ImageManipulator: manipulator,
    } as never)
    expect(result).toBeNull()
  })

  test("an offline file style is read and handed to the snapshot as JSON without its sprite", async () => {
    const createImage = jest.fn(async () => "file:///cache/snap.png")
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const style = { version: 8, sprite: "https://x/PlanIgn-Gris", sources: {}, layers: [] }
    const readStyleFile = jest.fn(async () => JSON.stringify(style))
    await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage },
      ImageManipulator: manipulator,
      readStyleFile,
      deleteFile: jest.fn(async () => undefined),
    } as never)
    expect(readStyleFile).toHaveBeenCalledWith(input.mapStyle)
    const given = (createImage.mock.calls[0] as unknown as [{ mapStyle: string }])[0].mapStyle
    expect(typeof given).toBe("string")
    expect(JSON.parse(given)).toEqual({ version: 8, sources: {}, layers: [] })
  })

  test("an https style URL goes through unchanged and is not read", async () => {
    const createImage = jest.fn(async () => "file:///cache/snap.png")
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const readStyleFile = jest.fn()
    await takeBasemapJpeg({ ...input, mapStyle: PLAN_IGN_STYLE_URL, kind: "online" }, {
      StaticMapImageManager: { createImage },
      ImageManipulator: manipulator,
      readStyleFile,
      deleteFile: jest.fn(async () => undefined),
    } as never)
    expect(readStyleFile).not.toHaveBeenCalled()
    expect(createImage).toHaveBeenCalledWith(
      expect.objectContaining({ mapStyle: PLAN_IGN_STYLE_URL }),
    )
  })

  test("a style file that cannot be read falls back to its URI", async () => {
    const createImage = jest.fn(async () => "file:///cache/snap.png")
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage },
      ImageManipulator: manipulator,
      readStyleFile: jest.fn(async () => "not json"),
      deleteFile: jest.fn(async () => undefined),
    } as never)
    expect(createImage).toHaveBeenCalledWith(expect.objectContaining({ mapStyle: input.mapStyle }))
    expect(result).not.toBeNull()
  })

  test("the snapshot file is deleted after the JPEG is made, and when the conversion fails", async () => {
    for (const fails of [false, true]) {
      const deleteFile = jest.fn(async () => undefined)
      const { manipulator } = makeManipulator(async () => {
        if (fails) throw new Error("save")
        return { base64: "QUJD" }
      })
      await takeBasemapJpeg(input, {
        StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
        ImageManipulator: manipulator,
        readStyleFile: jest.fn(async () => "{}"),
        deleteFile,
      } as never)
      expect(deleteFile).toHaveBeenCalledWith("file:///cache/snap.png")
    }
  })

  test("a failing delete does not turn a good snapshot into no image", async () => {
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const result = await takeBasemapJpeg(input, {
      StaticMapImageManager: { createImage: jest.fn(async () => "file:///cache/snap.png") },
      ImageManipulator: manipulator,
      readStyleFile: jest.fn(async () => "{}"),
      deleteFile: jest.fn(async () => {
        throw new Error("delete")
      }),
    } as never)
    expect(result).not.toBeNull()
  })

  test("a snapshot that settles after the timeout has its file deleted", async () => {
    jest.useFakeTimers()
    const { manipulator } = makeManipulator(async () => ({ base64: "QUJD" }))
    const deleteFile = jest.fn(async () => undefined)
    let finish: (uri: string) => void = () => undefined
    const pending = takeBasemapJpeg(input, {
      StaticMapImageManager: {
        createImage: jest.fn(() => new Promise<string>((resolve) => (finish = resolve))),
      },
      ImageManipulator: manipulator,
      readStyleFile: jest.fn(async () => "{}"),
      deleteFile,
    } as never)
    await jest.advanceTimersByTimeAsync(SNAPSHOT_TIMEOUT_MS)
    await expect(pending).resolves.toBeNull()
    expect(deleteFile).not.toHaveBeenCalled()
    finish("file:///cache/late.png")
    await jest.advanceTimersByTimeAsync(0)
    expect(deleteFile).toHaveBeenCalledWith("file:///cache/late.png")
  })
})

describe("withoutSprite", () => {
  test("drops the sprite key and keeps the rest", () => {
    const text = JSON.stringify({ version: 8, sprite: "s", glyphs: "g", layers: [{ id: "a" }] })
    expect(JSON.parse(withoutSprite(text))).toEqual({
      version: 8,
      glyphs: "g",
      layers: [{ id: "a" }],
    })
  })

  test("a style without a sprite is unchanged", () => {
    expect(JSON.parse(withoutSprite('{"version":8}'))).toEqual({ version: 8 })
  })
})
