/**
 * Tests for useOwnSurveyNotes: the notes are read only while a search is active, once, again when
 * the surveys change, dropped when stale, and an empty map on failure.
 */

jest.mock("react-native", () => ({}))

const mockListNotes = jest.fn()
jest.mock("../storage/surveys", () => ({
  listLocalSurveyNotes: () => mockListNotes(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { LocalSurvey } from "../storage/types"
import { useOwnSurveyNotes } from "./useOwnSurveyNotes"

const survey = (id: string, updatedAt = "2026-10-01T10:00:00.000Z"): LocalSurvey => ({
  id,
  site_name: `Site ${id}`,
  status: "draft",
  visibility: "private",
  sync_version: 1,
  sync_state: "synced",
  last_sync_error: null,
  last_sync_error_code: null,
  last_sync_error_at: null,
  sync_blocked: 0,
  created_at: "2026-10-01T10:00:00.000Z",
  updated_at: updatedAt,
  completion_rate: 0,
  factors_filled: 0,
})

type Props = { active: boolean; surveys: readonly LocalSurvey[] }

const run = (initialProps: Props) =>
  renderHook(({ active, surveys }: Props) => useOwnSurveyNotes(active, surveys), { initialProps })

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const surveys = [survey("s1"), survey("s2")]

beforeEach(() => {
  mockListNotes.mockReset().mockResolvedValue([{ id: "s2", note: "Sol détrempé" }])
  jest.spyOn(console, "debug").mockImplementation(() => undefined)
})

afterEach(async () => {
  await cleanup()
  jest.restoreAllMocks()
})

describe("useOwnSurveyNotes", () => {
  it("never reads while the search is not active and gives an empty map", async () => {
    const { result } = await run({ active: false, surveys })
    await settle()
    expect(mockListNotes).not.toHaveBeenCalled()
    expect(result.current.size).toBe(0)
  })

  it("loads once when the search becomes active", async () => {
    const { result, rerender } = await run({ active: false, surveys })
    await rerender({ active: true, surveys })
    await settle()
    expect(mockListNotes).toHaveBeenCalledTimes(1)
    expect(result.current.get("s2")).toBe("Sol détrempé")
    expect(result.current.size).toBe(1)
    // The same surveys, rendered again: no new read.
    await rerender({ active: true, surveys: [...surveys] })
    await settle()
    expect(mockListNotes).toHaveBeenCalledTimes(1)
  })

  it("reads again when a survey is updated", async () => {
    const { result, rerender } = await run({ active: true, surveys })
    await settle()
    mockListNotes.mockResolvedValue([{ id: "s1", note: "Coupe récente" }])
    await rerender({
      active: true,
      surveys: [survey("s1", "2026-10-02T09:00:00.000Z"), surveys[1]],
    })
    await settle()
    expect(mockListNotes).toHaveBeenCalledTimes(2)
    expect(result.current.get("s1")).toBe("Coupe récente")
    expect(result.current.has("s2")).toBe(false)
  })

  it("forgets the notes when the search closes", async () => {
    const { result, rerender } = await run({ active: true, surveys })
    await settle()
    expect(result.current.size).toBe(1)
    await rerender({ active: false, surveys })
    await settle()
    expect(result.current.size).toBe(0)
  })

  it("drops an answer that arrives after the search closed", async () => {
    let resolve: (rows: Array<{ id: string; note: string }>) => void = () => undefined
    mockListNotes.mockReturnValue(new Promise((done) => (resolve = done)))
    const { result, rerender } = await run({ active: true, surveys })
    await rerender({ active: false, surveys })
    await act(async () => {
      resolve([{ id: "s2", note: "tard" }])
      await Promise.resolve()
    })
    await rerender({ active: false, surveys })
    expect(result.current.size).toBe(0)
  })

  it("a failed read leaves an empty map", async () => {
    mockListNotes.mockRejectedValue(new Error("db closed"))
    const { result } = await run({ active: true, surveys })
    await settle()
    expect(result.current.size).toBe(0)
  })
})
