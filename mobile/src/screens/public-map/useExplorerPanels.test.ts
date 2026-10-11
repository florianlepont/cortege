jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { PublicMapItem } from "../../app/types"
import { useExplorerPanels } from "./useExplorerPanels"

const clearDownloadStatus = jest.fn()
const onPanelOpen = jest.fn()

const ITEMS: PublicMapItem[] = [
  {
    survey_id: "s-1",
    display_location: { lat: 45, lng: 4 },
    survey_date: "2026-05-01",
    region_code: "ACA",
    ibp_total: 30,
  },
]

beforeEach(() => {
  clearDownloadStatus.mockReset()
  onPanelOpen.mockReset()
})

afterEach(async () => {
  await cleanup()
})

const setup = () => renderHook(() => useExplorerPanels({ clearDownloadStatus, onPanelOpen }))

describe("useExplorerPanels", () => {
  test("starts with nothing open", async () => {
    const { result } = await setup()
    expect(result.current.panel).toBeNull()
    expect(result.current.cardView).toBe("form")
    expect(result.current.clusterItems).toBeNull()
    expect(result.current.areaChosen).toBe(false)
  })

  test("openCard opens the card on its form, drops the outcome and tells the swipe", async () => {
    const { result } = await setup()
    await act(async () => result.current.openCardOn("failed"))
    onPanelOpen.mockClear()
    await act(async () => result.current.chooseArea())
    await act(async () => result.current.openClusterList(ITEMS))
    await act(async () => result.current.openCard())
    expect(result.current.panel).toBe("card")
    expect(result.current.cardView).toBe("form")
    expect(result.current.clusterItems).toBeNull()
    expect(result.current.areaChosen).toBe(false)
    expect(clearDownloadStatus).toHaveBeenCalledTimes(1)
    expect(onPanelOpen).toHaveBeenCalledTimes(1)
  })

  test("openCardOn reopens the card on a result without clearing the status", async () => {
    const { result } = await setup()
    await act(async () => result.current.openCardOn("partial"))
    expect(result.current.panel).toBe("card")
    expect(result.current.cardView).toBe("partial")
    expect(clearDownloadStatus).not.toHaveBeenCalled()
    expect(onPanelOpen).toHaveBeenCalledTimes(1)
    await act(async () => result.current.openCardOn("failed"))
    expect(result.current.cardView).toBe("failed")
  })

  test("the bubble opens (closing the card and the list) and toggles shut", async () => {
    const { result } = await setup()
    await act(async () => result.current.openCard())
    onPanelOpen.mockClear()
    await act(async () => result.current.toggleBubble())
    expect(result.current.panel).toBe("bubble")
    expect(onPanelOpen).toHaveBeenCalledTimes(1)
    await act(async () => result.current.toggleBubble())
    expect(result.current.panel).toBeNull()
    expect(onPanelOpen).toHaveBeenCalledTimes(1)

    await act(async () => result.current.openClusterList(ITEMS))
    await act(async () => result.current.toggleBubble())
    expect(result.current.panel).toBe("bubble")
    expect(result.current.clusterItems).toBeNull()
  })

  test("closeBubble closes the bubble only", async () => {
    const { result } = await setup()
    await act(async () => result.current.toggleBubble())
    await act(async () => result.current.closeBubble())
    expect(result.current.panel).toBeNull()
    await act(async () => result.current.openCard())
    await act(async () => result.current.closeBubble())
    expect(result.current.panel).toBe("card")
  })

  test("the cluster list opens without telling the swipe, and a marker closes it alone", async () => {
    const { result } = await setup()
    await act(async () => result.current.openClusterList(ITEMS))
    expect(result.current.panel).toBe("cluster")
    expect(result.current.clusterItems).toEqual(ITEMS)
    expect(onPanelOpen).not.toHaveBeenCalled()
    await act(async () => result.current.closeCluster())
    expect(result.current.panel).toBeNull()
    expect(result.current.clusterItems).toBeNull()

    await act(async () => result.current.openCard())
    await act(async () => result.current.closeCluster())
    expect(result.current.panel).toBe("card")
  })

  test("closeAll closes the panel and drops the outcome", async () => {
    const { result } = await setup()
    await act(async () => result.current.openClusterList(ITEMS))
    clearDownloadStatus.mockClear()
    await act(async () => result.current.closeAll())
    expect(result.current.panel).toBeNull()
    expect(result.current.clusterItems).toBeNull()
    expect(clearDownloadStatus).toHaveBeenCalledTimes(1)
  })

  test("closePanel closes the card and keeps the download's status for the chip", async () => {
    const { result } = await setup()
    await act(async () => result.current.openCardOn("failed"))
    await act(async () => result.current.closePanel())
    expect(result.current.panel).toBeNull()
    expect(clearDownloadStatus).not.toHaveBeenCalled()
    await act(async () => result.current.openClusterList(ITEMS))
    await act(async () => result.current.closePanel())
    expect(result.current.clusterItems).toBeNull()
  })

  test("the area is chosen once a download starts and free again after a refusal", async () => {
    const { result } = await setup()
    await act(async () => result.current.chooseArea())
    expect(result.current.areaChosen).toBe(true)
    await act(async () => result.current.unchooseArea())
    expect(result.current.areaChosen).toBe(false)
  })

  test("every function keeps its identity across renders and state changes", async () => {
    const { result } = await setup()
    const first = { ...result.current }
    await act(async () => result.current.toggleBubble())
    await act(async () => result.current.openCard())
    for (const key of [
      "openCard",
      "openCardOn",
      "toggleBubble",
      "closeBubble",
      "openClusterList",
      "closeCluster",
      "closePanel",
      "closeAll",
      "chooseArea",
      "unchooseArea",
    ] as const) {
      expect(result.current[key]).toBe(first[key])
    }
  })

  test("the swipe callback in use is always the latest one", async () => {
    const first = jest.fn()
    const second = jest.fn()
    let current = first
    const { result, rerender } = await renderHook(() =>
      useExplorerPanels({ clearDownloadStatus, onPanelOpen: current }),
    )
    current = second
    await rerender({})
    await act(async () => result.current.toggleBubble())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
