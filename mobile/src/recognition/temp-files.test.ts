import * as FileSystem from "expo-file-system/legacy"
import {
  __listMockFiles,
  __resetMockFileSystem,
  __setMockFile,
} from "../../test/expo-file-system-legacy.mock"
import { deleteTempPhoto, isDeletableTempPhoto } from "./temp-files"

describe("isDeletableTempPhoto", () => {
  it("accepts a file under the cache directory", () => {
    expect(isDeletableTempPhoto("file:///mock/cache/Camera/a.jpg")).toBe(true)
    expect(isDeletableTempPhoto("file:///mock/cache/ImageManipulator/b.jpg")).toBe(true)
  })

  it("refuses an empty, null or undefined uri", () => {
    expect(isDeletableTempPhoto("")).toBe(false)
    expect(isDeletableTempPhoto(null)).toBe(false)
    expect(isDeletableTempPhoto(undefined)).toBe(false)
  })

  it("refuses a uri outside the cache directory", () => {
    expect(isDeletableTempPhoto("file:///mock/documents/attachments/a.jpg")).toBe(false)
    expect(isDeletableTempPhoto("file:///other/a.jpg")).toBe(false)
  })

  it("refuses a path traversal out of the cache directory", () => {
    expect(isDeletableTempPhoto("file:///mock/cache/../documents/a.jpg")).toBe(false)
  })

  it("refuses everything when the platform has no cache directory", () => {
    const mutable = FileSystem as unknown as { cacheDirectory: string | null }
    const original = mutable.cacheDirectory
    mutable.cacheDirectory = null
    try {
      expect(isDeletableTempPhoto("file:///mock/cache/Camera/a.jpg")).toBe(false)
    } finally {
      mutable.cacheDirectory = original
    }
  })
})

describe("deleteTempPhoto", () => {
  beforeEach(() => {
    __resetMockFileSystem()
  })

  it("removes a cache file from the file system", async () => {
    __setMockFile("file:///mock/cache/Camera/a.jpg", 100)
    __setMockFile("file:///mock/cache/Camera/keep.jpg", 100)

    await deleteTempPhoto("file:///mock/cache/Camera/a.jpg")

    expect(__listMockFiles()).toEqual(["file:///mock/cache/Camera/keep.jpg"])
  })

  it("never calls deleteAsync for a refused uri", async () => {
    __setMockFile("file:///mock/documents/attachments/a.jpg", 100)

    await deleteTempPhoto("file:///mock/documents/attachments/a.jpg")
    await deleteTempPhoto("file:///mock/cache/../documents/a.jpg")
    await deleteTempPhoto(null)
    await deleteTempPhoto(undefined)
    await deleteTempPhoto("")

    expect(FileSystem.deleteAsync).not.toHaveBeenCalled()
    expect(__listMockFiles()).toEqual(["file:///mock/documents/attachments/a.jpg"])
  })

  it("resolves without throwing when the deletion rejects", async () => {
    ;(FileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(new Error("disk error"))

    await expect(deleteTempPhoto("file:///mock/cache/Camera/a.jpg")).resolves.toBeUndefined()
  })

  it("is idempotent on a file that is already gone", async () => {
    await expect(deleteTempPhoto("file:///mock/cache/Camera/gone.jpg")).resolves.toBeUndefined()
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("file:///mock/cache/Camera/gone.jpg", {
      idempotent: true,
    })
  })
})
