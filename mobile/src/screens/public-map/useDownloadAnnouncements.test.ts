jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
}))

// The real module draws React Native views; only its 25 % rule is read here.
jest.mock("./DownloadStatusView", () => ({
  announceStep: (percent: number) => Math.floor(Math.max(0, Math.min(100, percent)) / 25) * 25,
}))

import { AccessibilityInfo } from "react-native"
import { cleanup, renderHook } from "@testing-library/react-native/pure"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import type { MapLayerKey } from "../../map/layers"
import { useDownloadAnnouncements } from "./useDownloadAnnouncements"

const announce = AccessibilityInfo.announceForAccessibility as jest.Mock

afterEach(async () => {
  await cleanup()
  announce.mockClear()
})

const running = (percentage: number, areaId = "a1"): AreaDownloadStatus => ({
  phase: "running",
  areaId,
  name: "Zone",
  percentage,
  downloadedTiles: 0,
  totalTiles: 10,
})
const done = (failedLayers: MapLayerKey[] = []): AreaDownloadStatus => ({
  phase: "done",
  areaId: "a1",
  name: "Zone",
  percentage: 100,
  downloadedTiles: 10,
  totalTiles: 10,
  failedLayers,
})
const failed: AreaDownloadStatus = { phase: "failed", areaId: "a1", name: "Zone" }

const spoken = () => announce.mock.calls.map(([text]) => text)

async function mount(initial: AreaDownloadStatus | null) {
  return renderHook(
    ({ status }: { status: AreaDownloadStatus | null }) => {
      useDownloadAnnouncements(status)
    },
    { initialProps: { status: initial } },
  )
}

describe("useDownloadAnnouncements", () => {
  test("says nothing without a download", async () => {
    const { rerender } = await mount(null)
    await rerender({ status: null })
    expect(announce).not.toHaveBeenCalled()
  })

  test("announces the start once, then each new 25 % step, then the outcome once", async () => {
    const { rerender } = await mount(running(0))
    expect(spoken()).toEqual(["Téléchargement de la zone démarré."])
    await rerender({ status: running(10) })
    await rerender({ status: running(26) })
    await rerender({ status: running(30) })
    await rerender({ status: running(24) })
    await rerender({ status: running(51) })
    await rerender({ status: running(51.4) })
    await rerender({ status: done() })
    await rerender({ status: done() })
    expect(spoken()).toEqual([
      "Téléchargement de la zone démarré.",
      "Téléchargement : 25 %",
      "Téléchargement : 50 %",
      "Zone disponible hors connexion",
    ])
  })

  test("a partial result and a failure have their own words", async () => {
    const partial = await mount(running(80))
    await partial.rerender({ status: done(["photos-1950"]) })
    expect(spoken().slice(-1)).toEqual(["Zone enregistrée, sauf certaines couches"])
    await cleanup()
    announce.mockClear()
    const failure = await mount(running(10))
    await failure.rerender({ status: failed })
    await failure.rerender({ status: failed })
    expect(spoken()).toEqual(["Téléchargement de la zone démarré.", "Téléchargement échoué"])
  })

  test("a retry is a new run: started and the steps are announced again", async () => {
    const { rerender } = await mount(running(30))
    await rerender({ status: failed })
    await rerender({ status: running(5) })
    await rerender({ status: running(30) })
    await rerender({ status: running(60) })
    expect(spoken()).toEqual([
      "Téléchargement de la zone démarré.",
      "Téléchargement : 25 %",
      "Téléchargement échoué",
      "Téléchargement de la zone démarré.",
      "Téléchargement : 25 %",
      "Téléchargement : 50 %",
    ])
  })

  test("another area starts afresh, and clearing the status says nothing", async () => {
    const { rerender } = await mount(running(60))
    await rerender({ status: running(10, "a2") })
    await rerender({ status: null })
    // A jump over a step announces the step reached, not the ones skipped.
    expect(spoken()).toEqual([
      "Téléchargement de la zone démarré.",
      "Téléchargement : 50 %",
      "Téléchargement de la zone démarré.",
    ])
  })

  test("an outcome with no run seen before is announced once", async () => {
    const { rerender } = await mount(done())
    await rerender({ status: done() })
    expect(spoken()).toEqual(["Zone disponible hors connexion"])
  })
})
