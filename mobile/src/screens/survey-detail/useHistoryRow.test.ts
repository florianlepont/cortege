jest.mock("react-native", () => ({}))

const mockUseIsOffline = jest.fn()
const mockUseParcelSurveyHistory = jest.fn()

jest.mock("../../hooks/useIsOffline", () => ({
  useIsOffline: () => mockUseIsOffline(),
}))
jest.mock("../../hooks/useParcelSurveyHistory", () => ({
  useParcelSurveyHistory: (...args: unknown[]) => mockUseParcelSurveyHistory(...args),
}))

import { cleanup, renderHook } from "@testing-library/react-native/pure"
import type { ParcelSurveyHistoryItem } from "../../app/types"
import { ownItem } from "../../../test/parcel-history-fixtures"
import { useHistoryRow } from "./useHistoryRow"

type HistoryResult = {
  items: ParcelSurveyHistoryItem[]
  loading: boolean
  error: boolean
  offline: boolean
  reload: () => void
}

const settled = (overrides: Partial<HistoryResult> = {}): HistoryResult => ({
  items: [],
  loading: false,
  error: false,
  offline: false,
  reload: jest.fn(),
  ...overrides,
})

const BASE = {
  apiUrl: "http://api",
  accessToken: "token" as string | null,
  parcelId: "P1" as string | null,
  currentSurveyId: "s2",
  refreshKey: "draft",
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseIsOffline.mockReturnValue(false)
  mockUseParcelSurveyHistory.mockReturnValue(settled())
})

afterEach(async () => {
  await cleanup()
})

describe("useHistoryRow", () => {
  test("passes its inputs, the offline flag and the refresh key to the history hook", async () => {
    mockUseIsOffline.mockReturnValue(true)
    await renderHook(() => useHistoryRow(BASE))
    expect(mockUseParcelSurveyHistory).toHaveBeenCalledWith(
      "http://api",
      "token",
      "P1",
      true,
      "draft",
    )
  })

  test("two finished surveys of one method give the range", async () => {
    mockUseParcelSurveyHistory.mockReturnValue(
      settled({
        items: [
          ownItem("s1", { scores: { ibp_peuplement_gestion: 15, ibp_contexte: 6, ibp_total: 21 } }),
          ownItem("s2", {
            scores: { ibp_peuplement_gestion: 24, ibp_contexte: 10, ibp_total: 34 },
          }),
        ],
      }),
    )
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current).toEqual({
      value: "21 → 34",
      accessibilityLabel: "Historique de la parcelle. de 21 à 34 sur 50",
      pressable: true,
    })
  })

  test("no earlier survey: first survey", async () => {
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current.value).toBe("Premier relevé")
  })

  test("only the current survey on the parcel: first survey", async () => {
    mockUseParcelSurveyHistory.mockReturnValue(settled({ items: [ownItem("s2")] }))
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current.value).toBe("Premier relevé")
  })

  test("offline: unavailable, whichever side reports it", async () => {
    mockUseIsOffline.mockReturnValue(true)
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current.value).toBe("Indisponible")
    expect(result.current.pressable).toBe(true)
  })

  test("the history hook reporting offline is unavailable too", async () => {
    mockUseParcelSurveyHistory.mockReturnValue(settled({ offline: true }))
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current.value).toBe("Indisponible")
  })

  test("a fetch error is unavailable", async () => {
    mockUseParcelSurveyHistory.mockReturnValue(settled({ error: true }))
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current.value).toBe("Indisponible")
  })

  test("a null parcel: no parcel, not pressable", async () => {
    const { result } = await renderHook(() => useHistoryRow({ ...BASE, parcelId: null }))
    expect(result.current).toEqual({
      value: "Aucune parcelle",
      accessibilityLabel: "Historique de la parcelle. Aucune parcelle",
      pressable: false,
    })
  })

  test("loading shows no value", async () => {
    mockUseParcelSurveyHistory.mockReturnValue(settled({ loading: true }))
    const { result } = await renderHook(() => useHistoryRow(BASE))
    expect(result.current).toEqual({
      value: undefined,
      accessibilityLabel: "Historique de la parcelle",
      pressable: true,
    })
  })

  test("a null access token while online is the loading display", async () => {
    const { result } = await renderHook(() => useHistoryRow({ ...BASE, accessToken: null }))
    expect(result.current.value).toBeUndefined()
    expect(result.current.pressable).toBe(true)
  })
})
