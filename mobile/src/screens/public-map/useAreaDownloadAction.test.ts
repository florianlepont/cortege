const mockAlert = jest.fn()
jest.mock("react-native", () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { MapRegion } from "../../app/map-viewport"
import type { StartDownloadResult } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { useAreaDownloadAction } from "./useAreaDownloadAction"

const REGION: MapRegion = {
  latitude: 48,
  longitude: 2,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}

beforeEach(() => {
  mockAlert.mockReset()
})

afterEach(async () => {
  await cleanup()
})

async function start(
  outcome: StartDownloadResult,
  options: { panelOpen: boolean; alertOnClosedFailure?: boolean },
) {
  const startDownload = jest.fn().mockResolvedValue(outcome)
  const onStart = jest.fn()
  const onFailure = jest.fn()
  const { result } = await renderHook(() =>
    useAreaDownloadAction({ startDownload, region: REGION, onStart, onFailure, ...options }),
  )
  await act(async () => result.current("Zone"))
  return { startDownload, onStart, onFailure }
}

describe("useAreaDownloadAction", () => {
  test("starts the download of the shown area and tells the caller", async () => {
    const { startDownload, onStart, onFailure } = await start(
      { ok: true, areaId: "a1" },
      { panelOpen: false },
    )
    expect(startDownload).toHaveBeenCalledWith(REGION, "Zone")
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onFailure).not.toHaveBeenCalled()
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("a failure with the panel closed alerts by default (the parcel picker)", async () => {
    const { onFailure } = await start({ ok: false, reason: "failed" }, { panelOpen: false })
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(mockAlert).toHaveBeenCalledWith(fr.offlineMap.areas.downloadFailed)
  })

  test("a failure with the panel open leaves the telling to the panel", async () => {
    await start({ ok: false, reason: "failed" }, { panelOpen: true })
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("alertOnClosedFailure false: a closed failure shows no alert (the Explorer's chip tells it)", async () => {
    await start({ ok: false, reason: "failed" }, { panelOpen: false, alertOnClosedFailure: false })
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("the too-large alert always shows", async () => {
    await start(
      { ok: false, reason: "too_large" },
      { panelOpen: false, alertOnClosedFailure: false },
    )
    expect(mockAlert).toHaveBeenCalledWith(fr.offlineMap.areas.tooLarge)
  })
})
