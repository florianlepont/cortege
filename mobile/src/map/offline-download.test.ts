import * as FileSystem from "expo-file-system/legacy"
import { __resetMockFileSystem } from "../../test/expo-file-system-legacy.mock"
import { buildDownloadJobs, downloadAreaTiles } from "./offline-download"

const DOCS = "file:///mock/documents/"
const BOUNDS = { minLat: 46.0, minLng: 1.0, maxLat: 46.01, maxLng: 1.01 }

beforeEach(() => {
  __resetMockFileSystem()
})

describe("buildDownloadJobs", () => {
  test("pairs every tile with every requested basemap", () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map", "satellite"], 15, 15)
    const mapJobs = jobs.filter((job) => job.basemap === "map")
    const satelliteJobs = jobs.filter((job) => job.basemap === "satellite")

    expect(mapJobs.length).toBeGreaterThan(0)
    expect(mapJobs.length).toBe(satelliteJobs.length)
    expect(jobs.length).toBe(mapJobs.length * 2)
  })

  test("a single basemap yields one job per tile", () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map"], 15, 15)
    expect(jobs.every((job) => job.basemap === "map")).toBe(true)
  })
})

describe("downloadAreaTiles", () => {
  test("downloads every job and reports final progress with nothing failed", async () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map"], 16, 16)
    const reports: Array<{ downloadedTiles: number; failedTiles: number; totalTiles: number }> = []

    const result = await downloadAreaTiles(DOCS, "area-1", jobs, (progress) => {
      reports.push(progress)
    })

    expect(result).toEqual({
      downloadedTiles: jobs.length,
      failedTiles: 0,
      totalTiles: jobs.length,
    })
    // At least the final report, always sent regardless of the throttle interval.
    expect(reports[reports.length - 1]).toEqual(result)
  })

  test("a failing tile is counted and skipped, the download still completes", async () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map"], 16, 16)
    expect(jobs.length).toBeGreaterThan(1)

    const downloadAsync = FileSystem.downloadAsync as jest.Mock
    downloadAsync.mockImplementationOnce(() => Promise.reject(new Error("network drop")))

    const result = await downloadAreaTiles(DOCS, "area-1", jobs, () => {})

    expect(result.failedTiles).toBe(1)
    expect(result.downloadedTiles).toBe(jobs.length - 1)
  })

  test("a non-2xx response status counts as a failed tile", async () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map"], 16, 16)
    const downloadAsync = FileSystem.downloadAsync as jest.Mock
    downloadAsync.mockImplementationOnce(() =>
      Promise.resolve({ status: 404, uri: "x", headers: {}, mimeType: null }),
    )

    const result = await downloadAreaTiles(DOCS, "area-1", jobs, () => {})

    expect(result.failedTiles).toBe(1)
  })

  test("awaits an async onProgress before starting the next batch", async () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map", "satellite"], 15, 17)
    expect(jobs.length).toBeGreaterThan(30)

    const order: string[] = []
    const downloadAsync = FileSystem.downloadAsync as jest.Mock
    const originalImpl = downloadAsync.getMockImplementation()
    downloadAsync.mockImplementation(async (...args: unknown[]) => {
      order.push("download")
      return originalImpl!(...(args as Parameters<typeof FileSystem.downloadAsync>))
    })

    await downloadAreaTiles(DOCS, "area-1", jobs, async () => {
      order.push("progress")
      await Promise.resolve()
    })

    // Every "progress" marker is followed by more "download" markers (the next batch), never
    // interleaved mid-batch, which is what "awaited before the next batch" means operationally.
    const progressIndexes = order.reduce<number[]>((acc, entry, index) => {
      if (entry === "progress") acc.push(index)
      return acc
    }, [])
    expect(progressIndexes.length).toBeGreaterThan(0)
  })

  test("creates a real tile file at the expected local path", async () => {
    const jobs = buildDownloadJobs(BOUNDS, ["map"], 16, 16)
    await downloadAreaTiles(DOCS, "area-1", [jobs[0]], () => {})

    const expectedPath = `${DOCS}offline-tiles/area-1/map/${jobs[0].tile.z}/${jobs[0].tile.x}/${jobs[0].tile.y}.png`
    expect(await FileSystem.getInfoAsync(expectedPath)).toMatchObject({ exists: true })
  })

  test("an empty job list resolves to all-zero progress without calling onProgress", async () => {
    const onProgress = jest.fn()
    const result = await downloadAreaTiles(DOCS, "area-1", [], onProgress)

    expect(result).toEqual({ downloadedTiles: 0, failedTiles: 0, totalTiles: 0 })
    expect(onProgress).not.toHaveBeenCalled()
  })
})
